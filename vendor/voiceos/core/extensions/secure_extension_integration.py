"""
VoiceOS Secure Extension Integration System

This module provides secure integration for extensions while maintaining
VoiceOS security boundaries, architectural purity, and permission-first principles.
"""

import asyncio
import logging
import importlib
import inspect
from typing import Dict, List, Any, Optional, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import hashlib
import time
from functools import wraps

from core.config import config
from permissions.permission_engine import PermissionLevel
from core.plugins.secure_plugin_integration import SecurityLevel, SecurityPolicy


class ExtensionType(Enum):
    """Extension types"""
    HOOK = "hook"                    # Function hook extensions
    FILTER = "filter"                # Data filter extensions
    TRANSFORMER = "transformer"      # Data transformer extensions
    VALIDATOR = "validator"          # Data validator extensions
    PROVIDER = "provider"            # Service provider extensions
    MIDDLEWARE = "middleware"        # Middleware extensions
    UI_COMPONENT = "ui_component"    # UI component extensions
    EVENT_HANDLER = "event_handler" # Event handler extensions


class ExtensionPoint(Enum):
    """VoiceOS extension points"""
    BEFORE_TOOL_EXECUTION = "before_tool_execution"
    AFTER_TOOL_EXECUTION = "after_tool_execution"
    BEFORE_LLM_REQUEST = "before_llm_request"
    AFTER_LLM_RESPONSE = "after_llm_response"
    DATA_PROCESSING = "data_processing"
    USER_INPUT_VALIDATION = "user_input_validation"
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    ERROR_HANDLING = "error_handling"
    LOGGING_EXTENSION = "logging"


class ExtensionSecurityLevel(Enum):
    """Security levels for extensions"""
    SAFE = "safe"                    # Read-only, no system access
    RESTRICTED = "restricted"        # Limited system access
    SANDBOXED = "sandboxed"          # Full execution in sandbox
    BLOCKED = "blocked"              # Extension not allowed


@dataclass
class ExtensionMetadata:
    """Extension metadata"""
    name: str
    version: str
    description: str
    author: str
    extension_type: ExtensionType
    extension_points: List[ExtensionPoint]
    security_level: ExtensionSecurityLevel
    required_permissions: List[PermissionLevel]
    dependencies: List[str] = field(default_factory=list)
    entry_point: str = ""
    configuration_schema: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtensionInstance:
    """Extension instance"""
    metadata: ExtensionMetadata
    module_path: Path
    instance: Any = None
    enabled: bool = True
    loaded_time: float = field(default_factory=time.time)
    execution_count: int = 0
    error_count: int = 0
    last_execution: Optional[float] = None


class ExtensionValidator:
    """Validates extensions for security compliance"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.blocked_patterns = [
            "os.system", "subprocess.call", "eval", "exec",
            "__import__", "open", "file", "input", "raw_input"
        ]
        self.blocked_modules = [
            "os", "sys", "subprocess", "shutil", "tempfile",
            "socket", "urllib", "http", "ftplib", "smtplib"
        ]
    
    def validate_extension(self, extension_path: Path) -> Dict[str, Any]:
        """
        Validate extension for security compliance.
        
        Args:
            extension_path: Path to extension directory
            
        Returns:
            Validation results
        """
        issues = []
        security_score = 100
        
        try:
            # Check for extension manifest
            manifest_path = extension_path / "extension.yaml"
            if not manifest_path.exists():
                return {
                    "valid": False,
                    "security_score": 0,
                    "issues": [{"type": "missing_manifest", "severity": "critical"}],
                    "recommendations": ["Create extension.yaml manifest"]
                }
            
            # Load and validate manifest
            manifest = self._load_extension_manifest(manifest_path)
            if not manifest:
                return {
                    "valid": False,
                    "security_score": 0,
                    "issues": [{"type": "invalid_manifest", "severity": "critical"}],
                    "recommendations": ["Fix extension.yaml manifest"]
                }
            
            # Validate extension code
            py_files = list(extension_path.rglob("*.py"))
            for py_file in py_files:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for blocked patterns
                for pattern in self.blocked_patterns:
                    if pattern in content:
                        issues.append({
                            "type": "blocked_pattern",
                            "file": str(py_file),
                            "pattern": pattern,
                            "severity": "high"
                        })
                        security_score -= 20
                
                # Check imports
                lines = content.split('\n')
                for line_num, line in enumerate(lines, 1):
                    line = line.strip()
                    if line.startswith('import ') or line.startswith('from '):
                        if self._is_dangerous_import(line):
                            issues.append({
                                "type": "dangerous_import",
                                "file": str(py_file),
                                "line": line_num,
                                "content": line,
                                "severity": "medium"
                            })
                            security_score -= 10
            
            return {
                "valid": security_score >= 70,
                "security_score": max(0, security_score),
                "issues": issues,
                "manifest": manifest,
                "recommendations": self._generate_extension_recommendations(issues, manifest)
            }
            
        except Exception as e:
            return {
                "valid": False,
                "security_score": 0,
                "issues": [{"type": "validation_error", "error": str(e), "severity": "critical"}],
                "recommendations": ["Fix extension validation error"]
            }
    
    def _load_extension_manifest(self, manifest_path: Path) -> Optional[ExtensionMetadata]:
        """Load extension manifest"""
        try:
            import yaml
            with open(manifest_path, 'r') as f:
                manifest_data = yaml.safe_load(f)
            
            return ExtensionMetadata(
                name=manifest_data["name"],
                version=manifest_data["version"],
                description=manifest_data["description"],
                author=manifest_data.get("author", "Unknown"),
                extension_type=ExtensionType(manifest_data["extension_type"]),
                extension_points=[ExtensionPoint(ep) for ep in manifest_data["extension_points"]],
                security_level=ExtensionSecurityLevel(manifest_data.get("security_level", "restricted")),
                required_permissions=[PermissionLevel(p) for p in manifest_data.get("required_permissions", ["medium"])],
                dependencies=manifest_data.get("dependencies", []),
                entry_point=manifest_data.get("entry_point", "main.py"),
                configuration_schema=manifest_data.get("configuration_schema", {})
            )
        except Exception as e:
            self.logger.error(f"Error loading extension manifest: {e}")
            return None
    
    def _is_dangerous_import(self, import_line: str) -> bool:
        """Check if import line contains dangerous modules"""
        for module in self.blocked_modules:
            if module in import_line:
                return True
        return False
    
    def _generate_extension_recommendations(self, issues: List[Dict[str, Any]], 
                                         manifest: Optional[ExtensionMetadata]) -> List[str]:
        """Generate security recommendations"""
        recommendations = []
        
        high_issues = [i for i in issues if i.get("severity") == "high"]
        medium_issues = [i for i in issues if i.get("severity") == "medium"]
        
        if high_issues:
            recommendations.append("Remove or replace high-risk code with VoiceOS-safe alternatives")
        
        if medium_issues:
            recommendations.append("Use VoiceOS extension points instead of direct system access")
        
        if manifest and manifest.security_level == ExtensionSecurityLevel.SAFE:
            if len(issues) > 0:
                recommendations.append("Consider lowering security requirements or fixing issues")
        
        return recommendations


class SecureExtensionManager:
    """Manages secure extension loading and execution"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.validator = ExtensionValidator()
        self.registered_extensions: Dict[str, ExtensionInstance] = {}
        self.extension_points: Dict[ExtensionPoint, List[str]] = {
            point: [] for point in ExtensionPoint
        }
        self.execution_history: List[Dict[str, Any]] = []
        self._setup_extension_points()
    
    async def load_extension(self, extension_path: Path) -> Dict[str, Any]:
        """
        Load and register an extension.
        
        Args:
            extension_path: Path to extension directory
            
        Returns:
            Loading result
        """
        try:
            # Validate extension
            validation_result = self.validator.validate_extension(extension_path)
            
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": "Extension validation failed",
                    "issues": validation_result["issues"],
                    "recommendations": validation_result["recommendations"]
                }
            
            manifest = validation_result["manifest"]
            
            # Check if extension already loaded
            if manifest.name in self.registered_extensions:
                return {
                    "success": False,
                    "error": f"Extension {manifest.name} already loaded"
                }
            
            # Load extension module
            module_path = extension_path / manifest.entry_point
            if not module_path.exists():
                return {
                    "success": False,
                    "error": f"Entry point not found: {manifest.entry_point}"
                }
            
            # Import extension module
            spec = importlib.util.spec_from_file_location(manifest.name, module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Create extension instance
            extension_instance = ExtensionInstance(
                metadata=manifest,
                module_path=extension_path,
                instance=module
            )
            
            # Register extension
            self.registered_extensions[manifest.name] = extension_instance
            
            # Register extension points
            for point in manifest.extension_points:
                self.extension_points[point].append(manifest.name)
            
            self.logger.info(f"Loaded extension: {manifest.name}")
            
            return {
                "success": True,
                "extension_name": manifest.name,
                "extension_type": manifest.extension_type.value,
                "extension_points": [ep.value for ep in manifest.extension_points],
                "security_score": validation_result["security_score"]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to load extension: {e}")
            return {
                "success": False,
                "error": f"Loading failed: {e}"
            }
    
    async def execute_extension_point(self, point: ExtensionPoint, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute all extensions registered for a specific point.
        
        Args:
            point: Extension point to execute
            context: Execution context
            
        Returns:
            Execution results
        """
        if point not in self.extension_points:
            return {
                "success": False,
                "error": f"Unknown extension point: {point.value}"
            }
        
        extension_names = self.extension_points[point]
        if not extension_names:
            return {
                "success": True,
                "message": "No extensions registered for this point",
                "results": []
            }
        
        results = []
        errors = []
        
        for extension_name in extension_names:
            if extension_name not in self.registered_extensions:
                continue
            
            extension = self.registered_extensions[extension_name]
            
            if not extension.enabled:
                continue
            
            try:
                # Execute extension based on type
                result = await self._execute_extension(extension, point, context)
                
                extension.execution_count += 1
                extension.last_execution = time.time()
                
                results.append({
                    "extension": extension_name,
                    "success": True,
                    "result": result
                })
                
            except Exception as e:
                extension.error_count += 1
                self.logger.error(f"Extension execution error: {e}")
                
                errors.append({
                    "extension": extension_name,
                    "error": str(e)
                })
        
        # Record execution
        self.execution_history.append({
            "point": point.value,
            "timestamp": time.time(),
            "extensions_executed": len(results),
            "errors": len(errors),
            "context": context
        })
        
        return {
            "success": len(errors) == 0,
            "results": results,
            "errors": errors,
            "total_extensions": len(extension_names)
        }
    
    async def _execute_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                              context: Dict[str, Any]) -> Any:
        """Execute individual extension"""
        manifest = extension.metadata
        
        # Check security level
        if manifest.security_level == ExtensionSecurityLevel.BLOCKED:
            raise SecurityError(f"Extension {manifest.name} is blocked")
        
        # Check permissions
        for permission in manifest.required_permissions:
            # This would check against actual permission engine
            pass
        
        # Execute based on extension type
        if manifest.extension_type == ExtensionType.HOOK:
            return await self._execute_hook_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.FILTER:
            return await self._execute_filter_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.TRANSFORMER:
            return await self._execute_transformer_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.VALIDATOR:
            return await self._execute_validator_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.PROVIDER:
            return await self._execute_provider_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.MIDDLEWARE:
            return await self._execute_middleware_extension(extension, point, context)
        elif manifest.extension_type == ExtensionType.EVENT_HANDLER:
            return await self._execute_event_handler_extension(extension, point, context)
        else:
            raise ValueError(f"Unsupported extension type: {manifest.extension_type}")
    
    async def _execute_hook_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                   context: Dict[str, Any]) -> Any:
        """Execute hook extension"""
        module = extension.instance
        
        # Look for hook function
        hook_function_name = f"hook_{point.value}"
        if hasattr(module, hook_function_name):
            hook_function = getattr(module, hook_function_name)
            
            if asyncio.iscoroutinefunction(hook_function):
                return await hook_function(context)
            else:
                return hook_function(context)
        
        return None
    
    async def _execute_filter_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                      context: Dict[str, Any]) -> Any:
        """Execute filter extension"""
        module = extension.instance
        
        # Look for filter function
        filter_function_name = f"filter_{point.value}"
        if hasattr(module, filter_function_name):
            filter_function = getattr(module, filter_function_name)
            
            if asyncio.iscoroutinefunction(filter_function):
                return await filter_function(context)
            else:
                return filter_function(context)
        
        return context.get("data", None)
    
    async def _execute_transformer_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                          context: Dict[str, Any]) -> Any:
        """Execute transformer extension"""
        module = extension.instance
        
        # Look for transformer function
        transformer_function_name = f"transform_{point.value}"
        if hasattr(module, transformer_function_name):
            transformer_function = getattr(module, transformer_function_name)
            
            if asyncio.iscoroutinefunction(transformer_function):
                return await transformer_function(context)
            else:
                return transformer_function(context)
        
        return context.get("data", None)
    
    async def _execute_validator_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                        context: Dict[str, Any]) -> Any:
        """Execute validator extension"""
        module = extension.instance
        
        # Look for validator function
        validator_function_name = f"validate_{point.value}"
        if hasattr(module, validator_function_name):
            validator_function = getattr(module, validator_function_name)
            
            if asyncio.iscoroutinefunction(validator_function):
                return await validator_function(context)
            else:
                return validator_function(context)
        
        return {"valid": True, "errors": []}
    
    async def _execute_provider_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                        context: Dict[str, Any]) -> Any:
        """Execute provider extension"""
        module = extension.instance
        
        # Look for provider function
        provider_function_name = f"provide_{point.value}"
        if hasattr(module, provider_function_name):
            provider_function = getattr(module, provider_function_name)
            
            if asyncio.iscoroutinefunction(provider_function):
                return await provider_function(context)
            else:
                return provider_function(context)
        
        return None
    
    async def _execute_middleware_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                         context: Dict[str, Any]) -> Any:
        """Execute middleware extension"""
        module = extension.instance
        
        # Look for middleware function
        middleware_function_name = f"middleware_{point.value}"
        if hasattr(module, middleware_function_name):
            middleware_function = getattr(module, middleware_function_name)
            
            if asyncio.iscoroutinefunction(middleware_function):
                return await middleware_function(context)
            else:
                return middleware_function(context)
        
        return context
    
    async def _execute_event_handler_extension(self, extension: ExtensionInstance, point: ExtensionPoint,
                                            context: Dict[str, Any]) -> Any:
        """Execute event handler extension"""
        module = extension.instance
        
        # Look for event handler function
        handler_function_name = f"handle_{point.value}"
        if hasattr(module, handler_function_name):
            handler_function = getattr(module, handler_function_name)
            
            if asyncio.iscoroutinefunction(handler_function):
                return await handler_function(context)
            else:
                return handler_function(context)
        
        return None
    
    def enable_extension(self, extension_name: str) -> Dict[str, Any]:
        """Enable an extension"""
        if extension_name not in self.registered_extensions:
            return {
                "success": False,
                "error": f"Extension not found: {extension_name}"
            }
        
        self.registered_extensions[extension_name].enabled = True
        return {
            "success": True,
            "extension_name": extension_name,
            "enabled": True
        }
    
    def disable_extension(self, extension_name: str) -> Dict[str, Any]:
        """Disable an extension"""
        if extension_name not in self.registered_extensions:
            return {
                "success": False,
                "error": f"Extension not found: {extension_name}"
            }
        
        self.registered_extensions[extension_name].enabled = False
        return {
            "success": True,
            "extension_name": extension_name,
            "enabled": False
        }
    
    def unload_extension(self, extension_name: str) -> Dict[str, Any]:
        """Unload an extension"""
        if extension_name not in self.registered_extensions:
            return {
                "success": False,
                "error": f"Extension not found: {extension_name}"
            }
        
        extension = self.registered_extensions[extension_name]
        
        # Unregister from extension points
        for point in extension.metadata.extension_points:
            if extension_name in self.extension_points[point]:
                self.extension_points[point].remove(extension_name)
        
        # Remove from registry
        del self.registered_extensions[extension_name]
        
        return {
            "success": True,
            "extension_name": extension_name,
            "unloaded": True
        }
    
    def get_registered_extensions(self) -> List[Dict[str, Any]]:
        """Get list of registered extensions"""
        return [
            {
                "name": ext.metadata.name,
                "version": ext.metadata.version,
                "description": ext.metadata.description,
                "type": ext.metadata.extension_type.value,
                "extension_points": [ep.value for ep in ext.metadata.extension_points],
                "security_level": ext.metadata.security_level.value,
                "enabled": ext.enabled,
                "execution_count": ext.execution_count,
                "error_count": ext.error_count,
                "loaded_time": ext.loaded_time
            }
            for ext in self.registered_extensions.values()
        ]
    
    def get_extension_point_info(self, point: ExtensionPoint) -> Dict[str, Any]:
        """Get information about an extension point"""
        extensions = self.extension_points.get(point, [])
        
        return {
            "point": point.value,
            "registered_extensions": extensions,
            "extension_count": len(extensions),
            "enabled_extensions": [
                name for name in extensions
                if name in self.registered_extensions and self.registered_extensions[name].enabled
            ]
        }
    
    def _setup_extension_points(self):
        """Setup extension points with default behaviors"""
        # This would integrate with actual VoiceOS extension points
        pass


class SecurityError(Exception):
    """Security-related error"""
    pass


# Global extension manager instance
secure_extension_manager = None

def get_secure_extension_manager() -> SecureExtensionManager:
    """Get or create secure extension manager instance"""
    global secure_extension_manager
    if secure_extension_manager is None:
        secure_extension_manager = SecureExtensionManager()
    return secure_extension_manager
