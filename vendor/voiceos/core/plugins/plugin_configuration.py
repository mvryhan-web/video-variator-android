"""
VoiceOS Plugin Configuration Management

This module provides secure configuration management for plugins while
maintaining VoiceOS security boundaries and architectural purity.
"""

import asyncio
import logging
import json
import yaml
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import os
from datetime import datetime

from core.config import config
from permissions.permission_engine import PermissionLevel
from core.plugins.secure_plugin_integration import SecurityLevel, SecurityPolicy


class ConfigScope(Enum):
    """Configuration scopes"""
    GLOBAL = "global"           # System-wide configuration
    PLUGIN = "plugin"           # Plugin-specific configuration
    USER = "user"               # User-specific configuration
    WORKSPACE = "workspace"     # Workspace-specific configuration
    SESSION = "session"         # Session-specific configuration


class ConfigFormat(Enum):
    """Configuration file formats"""
    JSON = "json"
    YAML = "yaml"
    ENV = "env"


class ConfigValidationLevel(Enum):
    """Configuration validation levels"""
    NONE = "none"               # No validation
    BASIC = "basic"             # Basic type validation
    STRICT = "strict"           # Strict validation with schema
    SECURITY = "security"       # Security-focused validation


@dataclass
class ConfigSchema:
    """Configuration schema definition"""
    field_name: str
    field_type: type
    required: bool = True
    default: Any = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    allowed_values: Optional[List[Any]] = None
    pattern: Optional[str] = None
    description: str = ""
    security_sensitive: bool = False


@dataclass
class ConfigSection:
    """Configuration section definition"""
    section_name: str
    schema: List[ConfigSchema]
    description: str = ""
    security_level: SecurityLevel = SecurityLevel.SAFE
    editable_by_user: bool = True
    requires_restart: bool = False


@dataclass
class ConfigChange:
    """Configuration change record"""
    timestamp: datetime
    scope: ConfigScope
    plugin_name: Optional[str]
    key: str
    old_value: Any
    new_value: Any
    changed_by: str
    reason: str = ""


class PluginConfigurationManager:
    """
    Manages plugin configuration with security and validation.
    
    This class provides secure configuration management for plugins while
    maintaining VoiceOS security boundaries and architectural purity.
    """
    
    def __init__(self, workspace_root: Path):
        self.workspace_root = workspace_root
        self.logger = logging.getLogger(__name__)
        
        # Configuration storage paths
        self.config_root = workspace_root / "config" / "plugins"
        self.config_root.mkdir(parents=True, exist_ok=True)
        
        # Configuration cache
        self.config_cache: Dict[str, Dict[str, Any]] = {}
        self.schema_cache: Dict[str, List[ConfigSection]] = {}
        
        # Change tracking
        self.change_history: List[ConfigChange] = []
        self.max_history_size = 1000
        
        # Configuration locks
        self._config_locks: Dict[str, asyncio.Lock] = {}
        
        # Default configuration schemas
        self._register_default_schemas()
    
    async def load_plugin_config(self, plugin_name: str, scope: ConfigScope = ConfigScope.PLUGIN,
                              format: ConfigFormat = ConfigFormat.YAML) -> Dict[str, Any]:
        """
        Load plugin configuration.
        
        Args:
            plugin_name: Name of plugin
            scope: Configuration scope
            format: Configuration file format
            
        Returns:
            Plugin configuration
        """
        cache_key = f"{plugin_name}:{scope.value}"
        
        # Check cache first
        if cache_key in self.config_cache:
            return self.config_cache[cache_key].copy()
        
        # Get configuration file path
        config_path = self._get_config_path(plugin_name, scope, format)
        
        # Load configuration
        if config_path.exists():
            try:
                config_data = await self._load_config_file(config_path, format)
                
                # Validate configuration
                validated_config = await self._validate_config(
                    plugin_name, config_data, ConfigValidationLevel.BASIC
                )
                
                # Cache configuration
                self.config_cache[cache_key] = validated_config
                
                return validated_config
                
            except Exception as e:
                self.logger.error(f"Error loading config for {plugin_name}: {e}")
                return await self._get_default_config(plugin_name)
        else:
            # Return default configuration
            default_config = await self._get_default_config(plugin_name)
            
            # Save default configuration
            await self.save_plugin_config(plugin_name, default_config, scope, format)
            
            return default_config
    
    async def save_plugin_config(self, plugin_name: str, config_data: Dict[str, Any],
                              scope: ConfigScope = ConfigScope.PLUGIN,
                              format: ConfigFormat = ConfigFormat.YAML,
                              changed_by: str = "system",
                              reason: str = "") -> Dict[str, Any]:
        """
        Save plugin configuration.
        
        Args:
            plugin_name: Name of plugin
            config_data: Configuration data
            scope: Configuration scope
            format: Configuration file format
            changed_by: Who made the change
            reason: Reason for change
            
        Returns:
            Save result
        """
        # Get lock for this plugin configuration
        lock_key = f"{plugin_name}:{scope.value}"
        if lock_key not in self._config_locks:
            self._config_locks[lock_key] = asyncio.Lock()
        
        async with self._config_locks[lock_key]:
            try:
                # Validate configuration
                validated_config = await self._validate_config(
                    plugin_name, config_data, ConfigValidationLevel.STRICT
                )
                
                # Get old configuration for change tracking
                old_config = await self.load_plugin_config(plugin_name, scope, format)
                
                # Get configuration file path
                config_path = self._get_config_path(plugin_name, scope, format)
                config_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Save configuration
                await self._save_config_file(config_path, validated_config, format)
                
                # Track changes
                await self._track_config_changes(
                    plugin_name, scope, old_config, validated_config, changed_by, reason
                )
                
                # Update cache
                cache_key = f"{plugin_name}:{scope.value}"
                self.config_cache[cache_key] = validated_config
                
                return {
                    "success": True,
                    "plugin_name": plugin_name,
                    "scope": scope.value,
                    "changes_count": len(self._get_config_changes(old_config, validated_config))
                }
                
            except Exception as e:
                self.logger.error(f"Error saving config for {plugin_name}: {e}")
                return {
                    "success": False,
                    "error": f"Save failed: {e}"
                }
    
    async def get_config_value(self, plugin_name: str, key: str, default: Any = None,
                             scope: ConfigScope = ConfigScope.PLUGIN) -> Any:
        """
        Get specific configuration value.
        
        Args:
            plugin_name: Name of plugin
            key: Configuration key
            default: Default value if key not found
            scope: Configuration scope
            
        Returns:
            Configuration value
        """
        config_data = await self.load_plugin_config(plugin_name, scope)
        
        # Navigate nested keys
        keys = key.split('.')
        value = config_data
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    async def set_config_value(self, plugin_name: str, key: str, value: Any,
                             scope: ConfigScope = ConfigScope.PLUGIN,
                             changed_by: str = "user") -> Dict[str, Any]:
        """
        Set specific configuration value.
        
        Args:
            plugin_name: Name of plugin
            key: Configuration key
            value: New value
            scope: Configuration scope
            changed_by: Who made the change
            
        Returns:
            Set result
        """
        # Load current configuration
        config_data = await self.load_plugin_config(plugin_name, scope)
        
        # Get old value for change tracking
        old_value = await self.get_config_value(plugin_name, key, None, scope)
        
        # Navigate to key location
        keys = key.split('.')
        current = config_data
        
        try:
            # Navigate to parent of target key
            for k in keys[:-1]:
                if k not in current:
                    current[k] = {}
                current = current[k]
            
            # Set the value
            current[keys[-1]] = value
            
            # Save updated configuration
            result = await self.save_plugin_config(
                plugin_name, config_data, scope, changed_by=changed_by,
                reason=f"Update {key}"
            )
            
            if result["success"]:
                result["key"] = key
                result["old_value"] = old_value
                result["new_value"] = value
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to set config value: {e}"
            }
    
    async def reset_plugin_config(self, plugin_name: str, scope: ConfigScope = ConfigScope.PLUGIN,
                                changed_by: str = "system") -> Dict[str, Any]:
        """
        Reset plugin configuration to defaults.
        
        Args:
            plugin_name: Name of plugin
            scope: Configuration scope
            changed_by: Who made the change
            
        Returns:
            Reset result
        """
        try:
            # Get default configuration
            default_config = await self._get_default_config(plugin_name)
            
            # Save default configuration
            result = await self.save_plugin_config(
                plugin_name, default_config, scope, changed_by=changed_by,
                reason="Reset to defaults"
            )
            
            if result["success"]:
                result["action"] = "reset_to_defaults"
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Reset failed: {e}"
            }
    
    async def register_plugin_schema(self, plugin_name: str, schema: List[ConfigSection]) -> Dict[str, Any]:
        """
        Register configuration schema for a plugin.
        
        Args:
            plugin_name: Name of plugin
            schema: Configuration schema
            
        Returns:
            Registration result
        """
        try:
            # Validate schema
            validation_result = await self._validate_schema(schema)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": "Schema validation failed",
                    "issues": validation_result["issues"]
                }
            
            # Register schema
            self.schema_cache[plugin_name] = schema
            
            # Save schema to file
            schema_path = self.config_root / f"{plugin_name}_schema.yaml"
            schema_data = {
                "plugin_name": plugin_name,
                "sections": [
                    {
                        "section_name": section.section_name,
                        "description": section.description,
                        "security_level": section.security_level.value,
                        "editable_by_user": section.editable_by_user,
                        "requires_restart": section.requires_restart,
                        "schema": [
                            {
                                "field_name": field.field_name,
                                "field_type": field.field_type.__name__,
                                "required": field.required,
                                "default": field.default,
                                "min_value": field.min_value,
                                "max_value": field.max_value,
                                "allowed_values": field.allowed_values,
                                "pattern": field.pattern,
                                "description": field.description,
                                "security_sensitive": field.security_sensitive
                            }
                            for field in section.schema
                        ]
                    }
                    for section in schema
                ]
            }
            
            with open(schema_path, 'w') as f:
                yaml.dump(schema_data, f, default_flow_style=False)
            
            return {
                "success": True,
                "plugin_name": plugin_name,
                "sections_count": len(schema)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Schema registration failed: {e}"
            }
    
    async def validate_plugin_config(self, plugin_name: str, config_data: Dict[str, Any],
                                   validation_level: ConfigValidationLevel = ConfigValidationLevel.STRICT) -> Dict[str, Any]:
        """
        Validate plugin configuration against schema.
        
        Args:
            plugin_name: Name of plugin
            config_data: Configuration data
            validation_level: Validation level
            
        Returns:
            Validation result
        """
        if plugin_name not in self.schema_cache:
            return {
                "valid": True,
                "message": "No schema registered, skipping validation"
            }
        
        schema = self.schema_cache[plugin_name]
        errors = []
        warnings = []
        
        for section in schema:
            section_errors = await self._validate_section(
                section, config_data.get(section.section_name, {}), validation_level
            )
            errors.extend(section_errors)
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    async def get_config_history(self, plugin_name: Optional[str] = None,
                               scope: Optional[ConfigScope] = None,
                               limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get configuration change history.
        
        Args:
            plugin_name: Filter by plugin name
            scope: Filter by scope
            limit: Maximum number of changes to return
            
        Returns:
            List of configuration changes
        """
        changes = self.change_history
        
        # Apply filters
        if plugin_name:
            changes = [c for c in changes if c.plugin_name == plugin_name]
        
        if scope:
            changes = [c for c in changes if c.scope == scope]
        
        # Sort by timestamp (newest first) and limit
        changes.sort(key=lambda c: c.timestamp, reverse=True)
        
        return [
            {
                "timestamp": c.timestamp.isoformat(),
                "scope": c.scope.value,
                "plugin_name": c.plugin_name,
                "key": c.key,
                "old_value": c.old_value,
                "new_value": c.new_value,
                "changed_by": c.changed_by,
                "reason": c.reason
            }
            for c in changes[:limit]
        ]
    
    async def export_config(self, plugin_name: str, scope: ConfigScope = ConfigScope.PLUGIN,
                          format: ConfigFormat = ConfigFormat.YAML) -> Dict[str, Any]:
        """
        Export plugin configuration.
        
        Args:
            plugin_name: Name of plugin
            scope: Configuration scope
            format: Export format
            
        Returns:
            Exported configuration
        """
        try:
            config_data = await self.load_plugin_config(plugin_name, scope)
            
            if format == ConfigFormat.JSON:
                return {
                    "success": True,
                    "format": "json",
                    "data": json.dumps(config_data, indent=2)
                }
            elif format == ConfigFormat.YAML:
                return {
                    "success": True,
                    "format": "yaml",
                    "data": yaml.dump(config_data, default_flow_style=False)
                }
            else:
                return {
                    "success": False,
                    "error": f"Unsupported export format: {format}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Export failed: {e}"
            }
    
    async def import_config(self, plugin_name: str, config_data: str, scope: ConfigScope = ConfigScope.PLUGIN,
                          format: ConfigFormat = ConfigFormat.YAML, changed_by: str = "user") -> Dict[str, Any]:
        """
        Import plugin configuration.
        
        Args:
            plugin_name: Name of plugin
            config_data: Configuration data string
            scope: Configuration scope
            format: Import format
            changed_by: Who made the import
            
        Returns:
            Import result
        """
        try:
            # Parse configuration data
            if format == ConfigFormat.JSON:
                parsed_config = json.loads(config_data)
            elif format == ConfigFormat.YAML:
                parsed_config = yaml.safe_load(config_data)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported import format: {format}"
                }
            
            # Validate imported configuration
            validation_result = await self.validate_plugin_config(
                plugin_name, parsed_config, ConfigValidationLevel.STRICT
            )
            
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": "Imported configuration validation failed",
                    "validation_errors": validation_result["errors"]
                }
            
            # Save imported configuration
            result = await self.save_plugin_config(
                plugin_name, parsed_config, scope, changed_by=changed_by,
                reason="Configuration import"
            )
            
            if result["success"]:
                result["action"] = "imported"
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Import failed: {e}"
            }
    
    def _get_config_path(self, plugin_name: str, scope: ConfigScope, format: ConfigFormat) -> Path:
        """Get configuration file path"""
        if format == ConfigFormat.JSON:
            ext = ".json"
        elif format == ConfigFormat.YAML:
            ext = ".yaml"
        else:
            ext = ".env"
        
        if scope == ConfigScope.GLOBAL:
            return self.config_root / f"global{ext}"
        elif scope == ConfigScope.USER:
            return self.config_root / f"user_{plugin_name}{ext}"
        elif scope == ConfigScope.WORKSPACE:
            return self.config_root / f"workspace_{plugin_name}{ext}"
        elif scope == ConfigScope.SESSION:
            return self.config_root / f"session_{plugin_name}{ext}"
        else:  # PLUGIN
            return self.config_root / f"{plugin_name}{ext}"
    
    async def _load_config_file(self, config_path: Path, format: ConfigFormat) -> Dict[str, Any]:
        """Load configuration file"""
        with open(config_path, 'r', encoding='utf-8') as f:
            if format == ConfigFormat.JSON:
                return json.load(f)
            elif format == ConfigFormat.YAML:
                return yaml.safe_load(f) or {}
            elif format == ConfigFormat.ENV:
                # Parse .env file
                config_data = {}
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config_data[key.strip()] = value.strip()
                return config_data
            else:
                raise ValueError(f"Unsupported format: {format}")
    
    async def _save_config_file(self, config_path: Path, config_data: Dict[str, Any], format: ConfigFormat):
        """Save configuration file"""
        with open(config_path, 'w', encoding='utf-8') as f:
            if format == ConfigFormat.JSON:
                json.dump(config_data, f, indent=2)
            elif format == ConfigFormat.YAML:
                yaml.dump(config_data, f, default_flow_style=False)
            elif format == ConfigFormat.ENV:
                for key, value in config_data.items():
                    f.write(f"{key}={value}\n")
            else:
                raise ValueError(f"Unsupported format: {format}")
    
    async def _get_default_config(self, plugin_name: str) -> Dict[str, Any]:
        """Get default configuration for plugin"""
        if plugin_name in self.schema_cache:
            # Build default configuration from schema
            default_config = {}
            for section in self.schema_cache[plugin_name]:
                section_config = {}
                for field in section.schema:
                    if field.default is not None:
                        section_config[field.field_name] = field.default
                    elif not field.required:
                        section_config[field.field_name] = None
                default_config[section.section_name] = section_config
            return default_config
        else:
            # Return empty configuration
            return {}
    
    async def _validate_config(self, plugin_name: str, config_data: Dict[str, Any],
                            validation_level: ConfigValidationLevel) -> Dict[str, Any]:
        """Validate configuration data"""
        if validation_level == ConfigValidationLevel.NONE:
            return config_data
        
        validation_result = await self.validate_plugin_config(plugin_name, config_data, validation_level)
        
        if not validation_result["valid"]:
            self.logger.warning(f"Configuration validation failed for {plugin_name}: {validation_result['errors']}")
        
        return config_data
    
    async def _validate_section(self, section: ConfigSection, section_data: Dict[str, Any],
                             validation_level: ConfigValidationLevel) -> List[str]:
        """Validate configuration section"""
        errors = []
        
        for field in section.schema:
            field_value = section_data.get(field.field_name)
            
            # Check required fields
            if field.required and field_value is None:
                errors.append(f"Required field '{field.field_name}' is missing")
                continue
            
            if field_value is None:
                continue
            
            # Type validation
            if not isinstance(field_value, field.field_type):
                errors.append(f"Field '{field.field_name}' must be of type {field.field_type.__name__}")
                continue
            
            # Range validation
            if field.min_value is not None and field_value < field.min_value:
                errors.append(f"Field '{field.field_name}' must be >= {field.min_value}")
            
            if field.max_value is not None and field_value > field.max_value:
                errors.append(f"Field '{field.field_name}' must be <= {field.max_value}")
            
            # Allowed values validation
            if field.allowed_values and field_value not in field.allowed_values:
                errors.append(f"Field '{field.field_name}' must be one of {field.allowed_values}")
            
            # Pattern validation
            if field.pattern and isinstance(field_value, str):
                import re
                if not re.match(field.pattern, field_value):
                    errors.append(f"Field '{field.field_name}' does not match required pattern")
        
        return errors
    
    async def _validate_schema(self, schema: List[ConfigSection]) -> Dict[str, Any]:
        """Validate configuration schema"""
        issues = []
        
        for section in schema:
            # Check section name
            if not section.section_name:
                issues.append("Section name is required")
            
            # Check schema fields
            for field in section.schema:
                if not field.field_name:
                    issues.append("Field name is required")
                
                if not field.field_type:
                    issues.append("Field type is required")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
    
    async def _track_config_changes(self, plugin_name: str, scope: ConfigScope,
                                  old_config: Dict[str, Any], new_config: Dict[str, Any],
                                  changed_by: str, reason: str):
        """Track configuration changes"""
        changes = self._get_config_changes(old_config, new_config)
        
        for key_path, (old_val, new_val) in changes.items():
            change = ConfigChange(
                timestamp=datetime.now(),
                scope=scope,
                plugin_name=plugin_name,
                key=key_path,
                old_value=old_val,
                new_value=new_val,
                changed_by=changed_by,
                reason=reason
            )
            
            self.change_history.append(change)
        
        # Limit history size
        if len(self.change_history) > self.max_history_size:
            self.change_history = self.change_history[-self.max_history_size:]
    
    def _get_config_changes(self, old_config: Dict[str, Any], new_config: Dict[str, Any]) -> Dict[str, tuple]:
        """Get differences between configurations"""
        changes = {}
        
        def _compare_recursive(old, new, prefix=""):
            if isinstance(old, dict) and isinstance(new, dict):
                for key in set(old.keys()) | set(new.keys()):
                    new_prefix = f"{prefix}.{key}" if prefix else key
                    
                    if key not in old:
                        changes[new_prefix] = (None, new[key])
                    elif key not in new:
                        changes[new_prefix] = (old[key], None)
                    elif old[key] != new[key]:
                        _compare_recursive(old[key], new[key], new_prefix)
            else:
                if old != new:
                    changes[prefix] = (old, new)
        
        _compare_recursive(old_config, new_config)
        return changes
    
    def _register_default_schemas(self):
        """Register default configuration schemas"""
        # Browser plugin schema
        browser_schema = [
            ConfigSection(
                section_name="browser",
                schema=[
                    ConfigSchema(
                        field_name="timeout",
                        field_type=int,
                        default=30,
                        min_value=5,
                        max_value=300,
                        description="Request timeout in seconds"
                    ),
                    ConfigSchema(
                        field_name="max_results",
                        field_type=int,
                        default=10,
                        min_value=1,
                        max_value=100,
                        description="Maximum search results"
                    ),
                    ConfigSchema(
                        field_name="user_agent",
                        field_type=str,
                        default="VoiceOS-Bot/1.0",
                        description="User agent string"
                    )
                ],
                security_level=SecurityLevel.RESTRICTED
            )
        ]
        
        # Code execution plugin schema
        code_schema = [
            ConfigSection(
                section_name="execution",
                schema=[
                    ConfigSchema(
                        field_name="timeout",
                        field_type=int,
                        default=60,
                        min_value=10,
                        max_value=300,
                        description="Execution timeout in seconds"
                    ),
                    ConfigSchema(
                        field_name="memory_limit",
                        field_type=int,
                        default=100,
                        min_value=10,
                        max_value=1000,
                        description="Memory limit in MB"
                    ),
                    ConfigSchema(
                        field_name="allowed_languages",
                        field_type=list,
                        default=["python", "javascript"],
                        allowed_values=[["python"], ["javascript"], ["bash"], ["python", "javascript", "bash"]],
                        description="Allowed programming languages"
                    )
                ],
                security_level=SecurityLevel.SANDBOXED
            )
        ]
        
        # Register schemas
        self.schema_cache["browser"] = browser_schema
        self.schema_cache["code_execution"] = code_schema


# Global configuration manager instance
plugin_config_manager = None

def get_plugin_config_manager() -> PluginConfigurationManager:
    """Get or create plugin configuration manager instance"""
    global plugin_config_manager
    if plugin_config_manager is None:
        plugin_config_manager = PluginConfigurationManager(config.project_root / "workspace")
    return plugin_config_manager
