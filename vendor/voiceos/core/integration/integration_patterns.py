"""
VoiceOS Loose Coupling Integration Patterns

This module provides integration patterns that maintain architectural purity
while enabling secure plugin, helper, and extension integration.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Protocol, TypeVar, Generic
from dataclasses import dataclass
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path

from core.config import config
from permissions.permission_engine import PermissionLevel
from core.plugins.secure_plugin_integration import SecurityPolicy, SecurityLevel


class IntegrationPattern(Enum):
    """Integration pattern types"""
    EVENT_DRIVEN = "event_driven"      # Loose coupling via events
    PROXY_PATTERN = "proxy_pattern"    # Proxy through VoiceOS interfaces
    ADAPTER_PATTERN = "adapter_pattern" # Adapt to VoiceOS contracts
    GATEWAY_PATTERN = "gateway_pattern" # Gateway with validation
    OBSERVER_PATTERN = "observer_pattern" # Observer for loose coupling


@dataclass
class IntegrationContract:
    """Contract defining integration boundaries"""
    interface_name: str
    required_methods: List[str]
    provided_methods: List[str]
    security_requirements: List[SecurityLevel]
    resource_limits: Dict[str, Any]
    event_subscriptions: List[str] = None


class VoiceOSInterface(Protocol):
    """Protocol defining VoiceOS interface contracts"""
    
    async def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute operation with VoiceOS compliance"""
        ...
    
    def get_security_policy(self) -> SecurityPolicy:
        """Get security policy for operations"""
        ...
    
    def validate_permissions(self, required_level: PermissionLevel) -> bool:
        """Validate user permissions"""
        ...


T = TypeVar('T')


class EventDrivenIntegration(Generic[T]):
    """Event-driven integration pattern for loose coupling"""
    
    def __init__(self, event_bus, contract: IntegrationContract):
        self.event_bus = event_bus
        self.contract = contract
        self.logger = logging.getLogger(__name__)
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_history: List[Dict[str, Any]] = []
    
    async def publish_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """
        Publish event to subscribers.
        
        Args:
            event_type: Type of event
            data: Event data
        """
        event = {
            "type": event_type,
            "data": data,
            "timestamp": asyncio.get_event_loop().time(),
            "source": "voiceos_integration"
        }
        
        # Store event for audit
        self.event_history.append(event)
        
        # Notify subscribers
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    await callback(event)
                except Exception as e:
                    self.logger.error(f"Event subscriber error: {e}")
    
    def subscribe(self, event_type: str, callback: Callable) -> None:
        """
        Subscribe to event type.
        
        Args:
            event_type: Event type to subscribe to
            callback: Callback function
        """
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    def get_event_history(self, event_type: Optional[str] = None, 
                          limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get event history.
        
        Args:
            event_type: Optional event type filter
            limit: Maximum number of events to return
            
        Returns:
            List of events
        """
        events = self.event_history
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        return events[-limit:]


class ProxyIntegration:
    """Proxy pattern for secure integration"""
    
    def __init__(self, target_interface: VoiceOSInterface, 
                 security_policy: SecurityPolicy):
        self.target = target_interface
        self.security_policy = security_policy
        self.logger = logging.getLogger(__name__)
        self.access_log: List[Dict[str, Any]] = []
    
    async def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute operation through proxy with security validation.
        
        Args:
            operation: Operation to execute
            params: Operation parameters
            
        Returns:
            Execution result
        """
        # Log access attempt
        access_record = {
            "operation": operation,
            "params": params,
            "timestamp": asyncio.get_event_loop().time(),
            "user_permissions": "validated"
        }
        
        # Validate operation against security policy
        if operation not in self.security_policy.allowed_operations:
            access_record["status"] = "blocked"
            access_record["reason"] = "Operation not allowed"
            self.access_log.append(access_record)
            
            return {
                "success": False,
                "error": "Operation not allowed by security policy"
            }
        
        # Validate permissions
        if not self.target.validate_permissions(
            self.security_policy.level.value
        ):
            access_record["status"] = "blocked"
            access_record["reason"] = "Insufficient permissions"
            self.access_log.append(access_record)
            
            return {
                "success": False,
                "error": "Insufficient permissions"
            }
        
        try:
            # Execute through target interface
            result = await self.target.execute(operation, params)
            
            access_record["status"] = "success"
            access_record["result_type"] = type(result.get("result")).__name__
            self.access_log.append(access_record)
            
            return result
            
        except Exception as e:
            access_record["status"] = "error"
            access_record["error"] = str(e)
            self.access_log.append(access_record)
            
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_access_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get access log for audit"""
        return self.access_log[-limit:]


class AdapterIntegration(Generic[T]):
    """Adapter pattern for integrating external components"""
    
    def __init__(self, external_component: T, contract: IntegrationContract):
        self.external = external_component
        self.contract = contract
        self.logger = logging.getLogger(__name__)
        self.adaptation_methods: Dict[str, Callable] = {}
    
    def register_adaptation(self, method_name: str, adapter_func: Callable) -> None:
        """
        Register adaptation method.
        
        Args:
            method_name: Method name to adapt
            adapter_func: Adaptation function
        """
        self.adaptation_methods[method_name] = adapter_func
    
    async def adapt_and_execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapt operation and execute on external component.
        
        Args:
            operation: Operation to execute
            params: Operation parameters
            
        Returns:
            Adapted execution result
        """
        if operation not in self.adaptation_methods:
            return {
                "success": False,
                "error": f"No adaptation registered for operation: {operation}"
            }
        
        try:
            # Apply adaptation
            adapter_func = self.adaptation_methods[operation]
            adapted_params = await adapter_func(params)
            
            # Execute on external component
            if hasattr(self.external, operation):
                method = getattr(self.external, operation)
                if asyncio.iscoroutinefunction(method):
                    result = await method(**adapted_params)
                else:
                    result = method(**adapted_params)
                
                return {
                    "success": True,
                    "result": result,
                    "adapted": True
                }
            else:
                return {
                    "success": False,
                    "error": f"External component missing method: {operation}"
                }
                
        except Exception as e:
            self.logger.error(f"Adapter execution failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }


class GatewayIntegration:
    """Gateway pattern for controlled access"""
    
    def __init__(self, security_policy: SecurityPolicy):
        self.security_policy = security_policy
        self.logger = logging.getLogger(__name__)
        self.registered_services: Dict[str, Any] = {}
        self.gateway_rules: Dict[str, Dict[str, Any]] = {}
    
    def register_service(self, service_name: str, service: Any, 
                        rules: Dict[str, Any]) -> None:
        """
        Register service with gateway rules.
        
        Args:
            service_name: Service name
            service: Service instance
            rules: Gateway rules for service
        """
        self.registered_services[service_name] = service
        self.gateway_rules[service_name] = rules
    
    async def gateway_execute(self, service_name: str, operation: str, 
                            params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute operation through gateway with validation.
        
        Args:
            service_name: Service name
            operation: Operation to execute
            params: Operation parameters
            
        Returns:
            Execution result
        """
        if service_name not in self.registered_services:
            return {
                "success": False,
                "error": f"Service not registered: {service_name}"
            }
        
        service = self.registered_services[service_name]
        rules = self.gateway_rules[service_name]
        
        # Validate against gateway rules
        if not self._validate_gateway_rules(operation, params, rules):
            return {
                "success": False,
                "error": "Operation blocked by gateway rules"
            }
        
        try:
            # Apply gateway transformations
            transformed_params = self._apply_transformations(params, rules)
            
            # Execute operation
            if hasattr(service, operation):
                method = getattr(service, operation)
                if asyncio.iscoroutinefunction(method):
                    result = await method(**transformed_params)
                else:
                    result = method(**transformed_params)
                
                return {
                    "success": True,
                    "result": result,
                    "gateway_processed": True
                }
            else:
                return {
                    "success": False,
                    "error": f"Service missing method: {operation}"
                }
                
        except Exception as e:
            self.logger.error(f"Gateway execution failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _validate_gateway_rules(self, operation: str, params: Dict[str, Any], 
                              rules: Dict[str, Any]) -> bool:
        """Validate operation against gateway rules"""
        # Check allowed operations
        allowed_ops = rules.get("allowed_operations", [])
        if allowed_ops and operation not in allowed_ops:
            return False
        
        # Check blocked operations
        blocked_ops = rules.get("blocked_operations", [])
        if operation in blocked_ops:
            return False
        
        # Check parameter constraints
        param_constraints = rules.get("parameter_constraints", {})
        for param, constraint in param_constraints.items():
            if param in params:
                if not self._validate_parameter(params[param], constraint):
                    return False
        
        return True
    
    def _validate_parameter(self, value: Any, constraint: Dict[str, Any]) -> bool:
        """Validate parameter against constraint"""
        constraint_type = constraint.get("type")
        max_length = constraint.get("max_length")
        allowed_values = constraint.get("allowed_values")
        
        if constraint_type and not isinstance(value, constraint_type):
            return False
        
        if max_length and hasattr(value, '__len__') and len(value) > max_length:
            return False
        
        if allowed_values and value not in allowed_values:
            return False
        
        return True
    
    def _apply_transformations(self, params: Dict[str, Any], 
                            rules: Dict[str, Any]) -> Dict[str, Any]:
        """Apply parameter transformations"""
        transformations = rules.get("transformations", {})
        transformed = params.copy()
        
        for param, transform in transformations.items():
            if param in transformed:
                if transform == "sanitize":
                    # Basic sanitization
                    if isinstance(transformed[param], str):
                        transformed[param] = transformed[param].strip()
                elif transform == "normalize":
                    # Basic normalization
                    if isinstance(transformed[param], str):
                        transformed[param] = transformed[param].lower()
        
        return transformed


class IntegrationManager:
    """Manages all integration patterns"""
    
    def __init__(self, event_bus, tool_registry):
        self.event_bus = event_bus
        self.tool_registry = tool_registry
        self.logger = logging.getLogger(__name__)
        
        # Integration pattern instances
        self.event_driven: Dict[str, EventDrivenIntegration] = {}
        self.proxy_integrations: Dict[str, ProxyIntegration] = {}
        self.adapter_integrations: Dict[str, AdapterIntegration] = {}
        self.gateway_integrations: Dict[str, GatewayIntegration] = {}
    
    def create_event_driven(self, name: str, contract: IntegrationContract) -> EventDrivenIntegration:
        """Create event-driven integration"""
        integration = EventDrivenIntegration(self.event_bus, contract)
        self.event_driven[name] = integration
        return integration
    
    def create_proxy_integration(self, name: str, target: VoiceOSInterface, 
                               security_policy: SecurityPolicy) -> ProxyIntegration:
        """Create proxy integration"""
        integration = ProxyIntegration(target, security_policy)
        self.proxy_integrations[name] = integration
        return integration
    
    def create_adapter_integration(self, name: str, external_component: Any, 
                                  contract: IntegrationContract) -> AdapterIntegration:
        """Create adapter integration"""
        integration = AdapterIntegration(external_component, contract)
        self.adapter_integrations[name] = integration
        return integration
    
    def create_gateway_integration(self, name: str, 
                                  security_policy: SecurityPolicy) -> GatewayIntegration:
        """Create gateway integration"""
        integration = GatewayIntegration(security_policy)
        self.gateway_integrations[name] = integration
        return integration
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all integrations"""
        return {
            "event_driven": list(self.event_driven.keys()),
            "proxy_integrations": list(self.proxy_integrations.keys()),
            "adapter_integrations": list(self.adapter_integrations.keys()),
            "gateway_integrations": list(self.gateway_integrations.keys()),
            "total_integrations": len(self.event_driven) + len(self.proxy_integrations) + 
                                 len(self.adapter_integrations) + len(self.gateway_integrations)
        }


# Global integration manager instance
integration_manager = None

def get_integration_manager(event_bus, tool_registry) -> IntegrationManager:
    """Get or create integration manager instance"""
    global integration_manager
    if integration_manager is None:
        integration_manager = IntegrationManager(event_bus, tool_registry)
    return integration_manager
