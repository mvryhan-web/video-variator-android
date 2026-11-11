"""
VoiceOS Plugin Registry and Discovery System

This module provides a comprehensive plugin registry and discovery system
that maintains security boundaries while enabling plugin management.
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import hashlib
import yaml

from core.config import config
from permissions.permission_engine import PermissionLevel
from core.plugins.secure_plugin_integration import PluginManifest, SecurityLevel, IntegrationType
from core.plugins.plugin_lifecycle import PluginState, PluginInstance


class RegistryState(Enum):
    """Registry states"""
    INITIALIZING = "initializing"
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class DiscoverySource(Enum):
    """Plugin discovery sources"""
    LOCAL_DIRECTORY = "local_directory"
    REMOTE_REPOSITORY = "remote_repository"
    CONFIGURATION_FILE = "configuration_file"
    DYNAMIC_REGISTRATION = "dynamic_registration"


@dataclass
class PluginRegistryEntry:
    """Plugin registry entry"""
    manifest: PluginManifest
    source: DiscoverySource
    registration_time: float
    last_updated: float
    checksum: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    dependents: List[str] = field(default_factory=list)
    enabled: bool = True
    verified: bool = False


@dataclass
class DiscoveryConfig:
    """Plugin discovery configuration"""
    scan_directories: List[Path] = field(default_factory=list)
    remote_repositories: List[str] = field(default_factory=list)
    auto_discovery: bool = True
    discovery_interval: int = 300  # seconds
    verify_signatures: bool = True
    allow_unsigned: bool = False
    blacklist: List[str] = field(default_factory=list)
    whitelist: List[str] = field(default_factory=list)


class PluginRegistry:
    """
    Central plugin registry with secure discovery and management.
    
    This class provides plugin discovery, registration, dependency management,
    and verification while maintaining VoiceOS security boundaries.
    """
    
    def __init__(self, workspace_root: Path):
        self.workspace_root = workspace_root
        self.logger = logging.getLogger(__name__)
        
        # Registry storage
        self.registry_path = workspace_root / "registry" / "plugin_registry.json"
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Registry state
        self.state = RegistryState.INITIALIZING
        self.entries: Dict[str, PluginRegistryEntry] = {}
        self.index_by_source: Dict[DiscoverySource, Set[str]] = {
            source: set() for source in DiscoverySource
        }
        
        # Discovery configuration
        self.discovery_config = DiscoveryConfig()
        
        # Dependency graph
        self.dependency_graph: Dict[str, Set[str]] = {}
        self.reverse_dependency_graph: Dict[str, Set[str]] = {}
        
        # Registry locks
        self._registry_lock = asyncio.Lock()
        self._discovery_lock = asyncio.Lock()
        
        # Background tasks
        self._discovery_task = None
        self._verification_task = None
        
        # Metrics
        self.registry_metrics = {
            "total_plugins": 0,
            "enabled_plugins": 0,
            "verified_plugins": 0,
            "failed_verifications": 0,
            "last_discovery_time": 0,
            "discovery_count": 0
        }
    
    async def initialize(self, discovery_config: Optional[DiscoveryConfig] = None):
        """Initialize plugin registry"""
        self.logger.info("Initializing plugin registry...")
        
        if discovery_config:
            self.discovery_config = discovery_config
        
        # Load existing registry
        await self._load_registry()
        
        # Start background discovery
        if self.discovery_config.auto_discovery:
            self._discovery_task = asyncio.create_task(self._background_discovery())
        
        # Start verification
        self._verification_task = asyncio.create_task(self._background_verification())
        
        self.state = RegistryState.ACTIVE
        self.logger.info(f"Plugin registry initialized with {len(self.entries)} plugins")
    
    async def shutdown(self):
        """Shutdown plugin registry"""
        self.logger.info("Shutting down plugin registry...")
        
        # Cancel background tasks
        if self._discovery_task:
            self._discovery_task.cancel()
        if self._verification_task:
            self._verification_task.cancel()
        
        # Save registry
        await self._save_registry()
        
        self.state = RegistryState.MAINTENANCE
        self.logger.info("Plugin registry shutdown complete")
    
    async def discover_plugins(self, sources: Optional[List[DiscoverySource]] = None) -> Dict[str, Any]:
        """
        Discover plugins from specified sources.
        
        Args:
            sources: List of discovery sources (None = all configured sources)
            
        Returns:
            Discovery results
        """
        if sources is None:
            sources = [
                DiscoverySource.LOCAL_DIRECTORY,
                DiscoverySource.REMOTE_REPOSITORY,
                DiscoverySource.CONFIGURATION_FILE
            ]
        
        discovery_results = {}
        total_discovered = 0
        
        async with self._discovery_lock:
            for source in sources:
                try:
                    if source == DiscoverySource.LOCAL_DIRECTORY:
                        result = await self._discover_local_plugins()
                    elif source == DiscoverySource.REMOTE_REPOSITORY:
                        result = await self._discover_remote_plugins()
                    elif source == DiscoverySource.CONFIGURATION_FILE:
                        result = await self._discover_configured_plugins()
                    else:
                        result = {"discovered": [], "errors": []}
                    
                    discovery_results[source.value] = result
                    total_discovered += len(result.get("discovered", []))
                    
                except Exception as e:
                    self.logger.error(f"Discovery failed for {source.value}: {e}")
                    discovery_results[source.value] = {"discovered": [], "errors": [str(e)]}
        
        # Update metrics
        self.registry_metrics["discovery_count"] += 1
        self.registry_metrics["last_discovery_time"] = time.time()
        
        return {
            "success": True,
            "total_discovered": total_discovered,
            "results": discovery_results
        }
    
    async def register_plugin(self, manifest: PluginManifest, 
                            source: DiscoverySource = DiscoverySource.DYNAMIC_REGISTRATION,
                            metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Register a plugin in the registry.
        
        Args:
            manifest: Plugin manifest
            source: Discovery source
            metadata: Additional metadata
            
        Returns:
            Registration result
        """
        async with self._registry_lock:
            try:
                # Check if plugin already exists
                if manifest.name in self.entries:
                    existing_entry = self.entries[manifest.name]
                    if existing_entry.checksum == self._calculate_checksum(manifest):
                        return {
                            "success": True,
                            "plugin_name": manifest.name,
                            "action": "already_registered"
                        }
                
                # Validate manifest
                validation_result = await self._validate_manifest(manifest)
                if not validation_result["valid"]:
                    return {
                        "success": False,
                        "error": "Manifest validation failed",
                        "issues": validation_result["issues"]
                    }
                
                # Check blacklist/whitelist
                if not self._check_access_control(manifest.name):
                    return {
                        "success": False,
                        "error": f"Plugin {manifest.name} is not allowed by access control"
                    }
                
                # Create registry entry
                entry = PluginRegistryEntry(
                    manifest=manifest,
                    source=source,
                    registration_time=time.time(),
                    last_updated=time.time(),
                    checksum=self._calculate_checksum(manifest),
                    metadata=metadata or {},
                    dependencies=manifest.dependencies,
                    dependents=[],
                    enabled=True,
                    verified=False
                )
                
                # Update dependency graphs
                await self._update_dependency_graphs(entry)
                
                # Register entry
                self.entries[manifest.name] = entry
                self.index_by_source[source].add(manifest.name)
                
                # Update metrics
                self._update_metrics()
                
                # Save registry
                await self._save_registry()
                
                return {
                    "success": True,
                    "plugin_name": manifest.name,
                    "action": "registered",
                    "source": source.value
                }
                
            except Exception as e:
                self.logger.error(f"Plugin registration failed: {e}")
                return {
                    "success": False,
                    "error": f"Registration failed: {e}"
                }
    
    async def unregister_plugin(self, plugin_name: str) -> Dict[str, Any]:
        """
        Unregister a plugin from the registry.
        
        Args:
            plugin_name: Name of plugin to unregister
            
        Returns:
            Unregistration result
        """
        async with self._registry_lock:
            try:
                if plugin_name not in self.entries:
                    return {
                        "success": False,
                        "error": f"Plugin not found: {plugin_name}"
                    }
                
                entry = self.entries[plugin_name]
                
                # Check for dependents
                if entry.dependents:
                    return {
                        "success": False,
                        "error": f"Plugin has dependents: {', '.join(entry.dependents)}",
                        "dependents": entry.dependents
                    }
                
                # Remove from dependency graphs
                await self._remove_from_dependency_graphs(plugin_name)
                
                # Remove from registry
                del self.entries[plugin_name]
                self.index_by_source[entry.source].discard(plugin_name)
                
                # Update metrics
                self._update_metrics()
                
                # Save registry
                await self._save_registry()
                
                return {
                    "success": True,
                    "plugin_name": plugin_name,
                    "action": "unregistered"
                }
                
            except Exception as e:
                self.logger.error(f"Plugin unregistration failed: {e}")
                return {
                    "success": False,
                    "error": f"Unregistration failed: {e}"
                }
    
    async def get_plugin_info(self, plugin_name: str) -> Optional[Dict[str, Any]]:
        """Get plugin information from registry"""
        if plugin_name not in self.entries:
            return None
        
        entry = self.entries[plugin_name]
        
        return {
            "manifest": entry.manifest,
            "source": entry.source.value,
            "registration_time": entry.registration_time,
            "last_updated": entry.last_updated,
            "checksum": entry.checksum,
            "metadata": entry.metadata,
            "dependencies": entry.dependencies,
            "dependents": entry.dependents,
            "enabled": entry.enabled,
            "verified": entry.verified
        }
    
    async def list_plugins(self, source: Optional[DiscoverySource] = None,
                         enabled_only: bool = False,
                         verified_only: bool = False) -> List[Dict[str, Any]]:
        """
        List plugins in registry.
        
        Args:
            source: Filter by discovery source
            enabled_only: Filter by enabled plugins only
            verified_only: Filter by verified plugins only
            
        Returns:
            List of plugin information
        """
        plugins = []
        
        for plugin_name, entry in self.entries.items():
            # Apply filters
            if source and entry.source != source:
                continue
            if enabled_only and not entry.enabled:
                continue
            if verified_only and not entry.verified:
                continue
            
            plugins.append({
                "name": plugin_name,
                "version": entry.manifest.version,
                "description": entry.manifest.description,
                "source": entry.source.value,
                "enabled": entry.enabled,
                "verified": entry.verified,
                "dependencies": entry.dependencies,
                "dependents": entry.dependents
            })
        
        return plugins
    
    async def enable_plugin(self, plugin_name: str) -> Dict[str, Any]:
        """Enable a plugin"""
        if plugin_name not in self.entries:
            return {"success": False, "error": f"Plugin not found: {plugin_name}"}
        
        self.entries[plugin_name].enabled = True
        await self._save_registry()
        self._update_metrics()
        
        return {"success": True, "plugin_name": plugin_name, "enabled": True}
    
    async def disable_plugin(self, plugin_name: str) -> Dict[str, Any]:
        """Disable a plugin"""
        if plugin_name not in self.entries:
            return {"success": False, "error": f"Plugin not found: {plugin_name}"}
        
        self.entries[plugin_name].enabled = False
        await self._save_registry()
        self._update_metrics()
        
        return {"success": True, "plugin_name": plugin_name, "enabled": False}
    
    async def verify_plugin(self, plugin_name: str) -> Dict[str, Any]:
        """Verify plugin integrity"""
        if plugin_name not in self.entries:
            return {"success": False, "error": f"Plugin not found: {plugin_name}"}
        
        entry = self.entries[plugin_name]
        
        try:
            # Calculate current checksum
            current_checksum = self._calculate_checksum(entry.manifest)
            
            if current_checksum == entry.checksum:
                entry.verified = True
                await self._save_registry()
                self._update_metrics()
                
                return {
                    "success": True,
                    "plugin_name": plugin_name,
                    "verified": True,
                    "checksum": current_checksum
                }
            else:
                return {
                    "success": False,
                    "plugin_name": plugin_name,
                    "verified": False,
                    "error": "Checksum mismatch - plugin may be corrupted"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Verification failed: {e}"
            }
    
    async def get_dependency_graph(self) -> Dict[str, Any]:
        """Get plugin dependency graph"""
        return {
            "dependencies": {k: list(v) for k, v in self.dependency_graph.items()},
            "dependents": {k: list(v) for k, v in self.reverse_dependency_graph.items()},
            "circular_dependencies": self._detect_circular_dependencies()
        }
    
    async def _discover_local_plugins(self) -> Dict[str, Any]:
        """Discover plugins in local directories"""
        discovered = []
        errors = []
        
        for directory in self.discovery_config.scan_directories:
            if not directory.exists():
                errors.append(f"Directory not found: {directory}")
                continue
            
            try:
                for plugin_path in directory.iterdir():
                    if plugin_path.is_dir() and (plugin_path / "plugin.yaml").exists():
                        try:
                            manifest = await self._load_manifest_from_path(plugin_path)
                            if manifest:
                                # Register plugin
                                result = await self.register_plugin(
                                    manifest, DiscoverySource.LOCAL_DIRECTORY
                                )
                                if result["success"]:
                                    discovered.append(manifest.name)
                                else:
                                    errors.append(f"Failed to register {manifest.name}: {result.get('error')}")
                        except Exception as e:
                            errors.append(f"Error processing {plugin_path}: {e}")
                            
            except Exception as e:
                errors.append(f"Error scanning directory {directory}: {e}")
        
        return {"discovered": discovered, "errors": errors}
    
    async def _discover_remote_plugins(self) -> Dict[str, Any]:
        """Discover plugins from remote repositories"""
        discovered = []
        errors = []
        
        for repo_url in self.discovery_config.remote_repositories:
            try:
                # This would implement remote repository discovery
                # For now, return empty results
                self.logger.info(f"Remote discovery not implemented for: {repo_url}")
                
            except Exception as e:
                errors.append(f"Error accessing repository {repo_url}: {e}")
        
        return {"discovered": discovered, "errors": errors}
    
    async def _discover_configured_plugins(self) -> Dict[str, Any]:
        """Discover plugins from configuration files"""
        discovered = []
        errors = []
        
        config_file = self.workspace_root / "config" / "plugins.yaml"
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config_data = yaml.safe_load(f)
                
                for plugin_config in config_data.get("plugins", []):
                    try:
                        # Create manifest from configuration
                        manifest = PluginManifest(
                            name=plugin_config["name"],
                            version=plugin_config.get("version", "1.0.0"),
                            description=plugin_config.get("description", ""),
                            author=plugin_config.get("author", "Unknown"),
                            security_level=SecurityLevel(plugin_config.get("security_level", "sandboxed")),
                            integration_type=IntegrationType(plugin_config.get("integration_type", "wrapper")),
                            required_permissions=[PermissionLevel(p) for p in plugin_config.get("required_permissions", ["medium"])],
                            dependencies=plugin_config.get("dependencies", [])
                        )
                        
                        result = await self.register_plugin(
                            manifest, DiscoverySource.CONFIGURATION_FILE
                        )
                        if result["success"]:
                            discovered.append(manifest.name)
                        else:
                            errors.append(f"Failed to register {manifest.name}: {result.get('error')}")
                            
                    except Exception as e:
                        errors.append(f"Error processing plugin config: {e}")
                        
            except Exception as e:
                errors.append(f"Error reading plugin configuration: {e}")
        
        return {"discovered": discovered, "errors": errors}
    
    async def _load_manifest_from_path(self, plugin_path: Path) -> Optional[PluginManifest]:
        """Load plugin manifest from path"""
        manifest_path = plugin_path / "plugin.yaml"
        
        if not manifest_path.exists():
            return None
        
        try:
            with open(manifest_path, 'r') as f:
                manifest_data = yaml.safe_load(f)
            
            return PluginManifest(
                name=manifest_data["name"],
                version=manifest_data["version"],
                description=manifest_data["description"],
                author=manifest_data.get("author", "Unknown"),
                security_level=SecurityLevel(manifest_data.get("security_level", "sandboxed")),
                integration_type=IntegrationType(manifest_data.get("integration_type", "wrapper")),
                required_permissions=[PermissionLevel(p) for p in manifest_data.get("required_permissions", ["medium"])],
                dependencies=manifest_data.get("dependencies", []),
                entry_points=manifest_data.get("entry_points", {}),
                security_policies={}
            )
        except Exception as e:
            self.logger.error(f"Error loading manifest from {manifest_path}: {e}")
            return None
    
    async def _validate_manifest(self, manifest: PluginManifest) -> Dict[str, Any]:
        """Validate plugin manifest"""
        issues = []
        
        # Required fields
        if not manifest.name:
            issues.append("Plugin name is required")
        if not manifest.version:
            issues.append("Plugin version is required")
        if not manifest.description:
            issues.append("Plugin description is required")
        
        # Security level
        if manifest.security_level not in SecurityLevel:
            issues.append(f"Invalid security level: {manifest.security_level}")
        
        # Integration type
        if manifest.integration_type not in IntegrationType:
            issues.append(f"Invalid integration type: {manifest.integration_type}")
        
        # Permissions
        for permission in manifest.required_permissions:
            if permission not in PermissionLevel:
                issues.append(f"Invalid permission level: {permission}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
    
    def _check_access_control(self, plugin_name: str) -> bool:
        """Check plugin against access control lists"""
        # Check blacklist
        if plugin_name in self.discovery_config.blacklist:
            return False
        
        # Check whitelist (if configured)
        if self.discovery_config.whitelist:
            return plugin_name in self.discovery_config.whitelist
        
        return True
    
    def _calculate_checksum(self, manifest: PluginManifest) -> str:
        """Calculate manifest checksum"""
        manifest_str = json.dumps({
            "name": manifest.name,
            "version": manifest.version,
            "description": manifest.description,
            "author": manifest.author,
            "security_level": manifest.security_level.value,
            "integration_type": manifest.integration_type.value,
            "required_permissions": [p.value for p in manifest.required_permissions],
            "dependencies": manifest.dependencies
        }, sort_keys=True)
        
        return hashlib.sha256(manifest_str.encode()).hexdigest()
    
    async def _update_dependency_graphs(self, entry: PluginRegistryEntry):
        """Update dependency graphs for new entry"""
        plugin_name = entry.manifest.name
        
        # Initialize dependency sets
        if plugin_name not in self.dependency_graph:
            self.dependency_graph[plugin_name] = set()
        
        # Add dependencies
        for dep in entry.dependencies:
            if dep not in self.dependency_graph:
                self.dependency_graph[dep] = set()
            
            self.dependency_graph[plugin_name].add(dep)
            
            # Update reverse graph
            if dep not in self.reverse_dependency_graph:
                self.reverse_dependency_graph[dep] = set()
            self.reverse_dependency_graph[dep].add(plugin_name)
    
    async def _remove_from_dependency_graphs(self, plugin_name: str):
        """Remove plugin from dependency graphs"""
        # Remove from dependency graph
        if plugin_name in self.dependency_graph:
            for dep in self.dependency_graph[plugin_name]:
                if dep in self.reverse_dependency_graph:
                    self.reverse_dependency_graph[dep].discard(plugin_name)
            del self.dependency_graph[plugin_name]
        
        # Remove from reverse dependency graph
        if plugin_name in self.reverse_dependency_graph:
            for dependent in self.reverse_dependency_graph[plugin_name]:
                if dependent in self.dependency_graph:
                    self.dependency_graph[dependent].discard(plugin_name)
            del self.reverse_dependency_graph[plugin_name]
    
    def _detect_circular_dependencies(self) -> List[List[str]]:
        """Detect circular dependencies in plugin graph"""
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node, path):
            if node in rec_stack:
                # Found cycle
                cycle_start = path.index(node)
                cycle = path[cycle_start:] + [node]
                cycles.append(cycle)
                return
            
            if node in visited:
                return
            
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self.dependency_graph.get(node, []):
                dfs(neighbor, path + [node])
            
            rec_stack.remove(node)
        
        for node in self.dependency_graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def _update_metrics(self):
        """Update registry metrics"""
        self.registry_metrics["total_plugins"] = len(self.entries)
        self.registry_metrics["enabled_plugins"] = len([
            e for e in self.entries.values() if e.enabled
        ])
        self.registry_metrics["verified_plugins"] = len([
            e for e in self.entries.values() if e.verified
        ])
    
    async def _background_discovery(self):
        """Background plugin discovery"""
        while True:
            try:
                await asyncio.sleep(self.discovery_config.discovery_interval)
                await self.discover_plugins()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Background discovery error: {e}")
    
    async def _background_verification(self):
        """Background plugin verification"""
        while True:
            try:
                await asyncio.sleep(600)  # Verify every 10 minutes
                
                for plugin_name in list(self.entries.keys()):
                    await self.verify_plugin(plugin_name)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Background verification error: {e}")
    
    async def _load_registry(self):
        """Load registry from disk"""
        if self.registry_path.exists():
            try:
                with open(self.registry_path, 'r') as f:
                    registry_data = json.load(f)
                
                # Load entries
                for plugin_name, entry_data in registry_data.get("entries", {}).items():
                    # Reconstruct manifest
                    manifest_data = entry_data["manifest"]
                    manifest = PluginManifest(
                        name=manifest_data["name"],
                        version=manifest_data["version"],
                        description=manifest_data["description"],
                        author=manifest_data.get("author", "Unknown"),
                        security_level=SecurityLevel(manifest_data["security_level"]),
                        integration_type=IntegrationType(manifest_data["integration_type"]),
                        required_permissions=[PermissionLevel(p) for p in manifest_data["required_permissions"]],
                        dependencies=manifest_data.get("dependencies", []),
                        entry_points=manifest_data.get("entry_points", {}),
                        security_policies={}
                    )
                    
                    # Reconstruct entry
                    entry = PluginRegistryEntry(
                        manifest=manifest,
                        source=DiscoverySource(entry_data["source"]),
                        registration_time=entry_data["registration_time"],
                        last_updated=entry_data["last_updated"],
                        checksum=entry_data["checksum"],
                        metadata=entry_data.get("metadata", {}),
                        dependencies=entry_data.get("dependencies", []),
                        dependents=entry_data.get("dependents", []),
                        enabled=entry_data.get("enabled", True),
                        verified=entry_data.get("verified", False)
                    )
                    
                    self.entries[plugin_name] = entry
                    self.index_by_source[entry.source].add(plugin_name)
                
                # Update dependency graphs
                for plugin_name, entry in self.entries.items():
                    await self._update_dependency_graphs(entry)
                
                self._update_metrics()
                self.logger.info(f"Loaded {len(self.entries)} plugins from registry")
                
            except Exception as e:
                self.logger.error(f"Error loading registry: {e}")
    
    async def _save_registry(self):
        """Save registry to disk"""
        try:
            registry_data = {
                "entries": {},
                "metadata": {
                    "last_saved": time.time(),
                    "version": "1.0"
                }
            }
            
            # Serialize entries
            for plugin_name, entry in self.entries.items():
                registry_data["entries"][plugin_name] = {
                    "manifest": {
                        "name": entry.manifest.name,
                        "version": entry.manifest.version,
                        "description": entry.manifest.description,
                        "author": entry.manifest.author,
                        "security_level": entry.manifest.security_level.value,
                        "integration_type": entry.manifest.integration_type.value,
                        "required_permissions": [p.value for p in entry.manifest.required_permissions],
                        "dependencies": entry.manifest.dependencies,
                        "entry_points": entry.manifest.entry_points
                    },
                    "source": entry.source.value,
                    "registration_time": entry.registration_time,
                    "last_updated": entry.last_updated,
                    "checksum": entry.checksum,
                    "metadata": entry.metadata,
                    "dependencies": entry.dependencies,
                    "dependents": entry.dependents,
                    "enabled": entry.enabled,
                    "verified": entry.verified
                }
            
            with open(self.registry_path, 'w') as f:
                json.dump(registry_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error saving registry: {e}")
    
    def get_registry_metrics(self) -> Dict[str, Any]:
        """Get registry metrics"""
        return self.registry_metrics.copy()


# Global registry instance
plugin_registry = None

def get_plugin_registry() -> PluginRegistry:
    """Get or create plugin registry instance"""
    global plugin_registry
    if plugin_registry is None:
        plugin_registry = PluginRegistry(config.project_root / "workspace")
    return plugin_registry
