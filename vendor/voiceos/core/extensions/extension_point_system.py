"""
VoiceOS Extension Point System

This module provides a comprehensive extension point system that allows
extensions to hook into VoiceOS at specific points while maintaining
security boundaries and architectural purity.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from datetime import datetime
import inspect

from core.config import config
from permissions.permission_engine import PermissionLevel
from core.extensions.secure_extension_integration import get_secure_extension_manager, ExtensionPoint, ExtensionType


class HookPriority(Enum):
    """Hook execution priority"""
    HIGHEST = 100
    HIGH = 75
    NORMAL = 50
    LOW = 25
    LOWEST = 0


class ExtensionHookType(Enum):
    """Extension hook types"""
    BEFORE = "before"          # Execute before main operation
    AFTER = "after"            # Execute after main operation
    AROUND = "around"          # Execute around main operation
    ERROR = "error"            # Execute on error
    FINALLY = "finally"        # Execute in finally block


@dataclass
class ExtensionHook:
    """Extension hook definition"""
    extension_name: str
    hook_type: ExtensionHookType
    priority: HookPriority
    condition: Optional[str] = None
    enabled: bool = True
    execution_count: int = 0
    last_execution: Optional[datetime] = None
    error_count: int = 0
    average_execution_time: float = 0.0


@dataclass
class ExtensionPointContext:
    """Extension point execution context"""
    point: ExtensionPoint
    operation: str
    parameters: Dict[str, Any]
    result: Any = None
    error: Optional[Exception] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.now)
    hooks_executed: List[str] = field(default_factory=list)


T = TypeVar('T')


class ExtensionPointSystem:
    """
    Manages extension points and hook execution throughout VoiceOS.
    
    This system provides secure extension integration while maintaining
    VoiceOS security boundaries and architectural purity.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Extension manager
        self.extension_manager = get_secure_extension_manager()
        
        # Extension point registry
        self.extension_points: Dict[ExtensionPoint, List[ExtensionHook]] = {
            point: [] for point in ExtensionPoint
        }
        
        # Hook execution history
        self.execution_history: List[Dict[str, Any]] = []
        
        # Extension point decorators
        self.decorators: Dict[str, Callable] = {}
        
        # Initialize extension points
        self._initialize_extension_points()
    
    def register_extension_hook(self, extension_name: str, point: ExtensionPoint,
                              hook_type: ExtensionHookType, priority: HookPriority = HookPriority.NORMAL,
                              condition: Optional[str] = None) -> Dict[str, Any]:
        """
        Register an extension hook for a specific point.
        
        Args:
            extension_name: Name of extension
            point: Extension point
            hook_type: Hook type
            priority: Execution priority
            condition: Optional condition for hook execution
            
        Returns:
            Registration result
        """
        try:
            # Check if extension is registered
            registered_extensions = self.extension_manager.get_registered_extensions()
            extension_found = any(ext["name"] == extension_name for ext in registered_extensions)
            
            if not extension_found:
                return {
                    "success": False,
                    "error": f"Extension not found: {extension_name}"
                }
            
            # Create hook
            hook = ExtensionHook(
                extension_name=extension_name,
                hook_type=hook_type,
                priority=priority,
                condition=condition
            )
            
            # Register hook
            self.extension_points[point].append(hook)
            
            # Sort hooks by priority (highest first)
            self.extension_points[point].sort(key=lambda h: h.priority.value, reverse=True)
            
            self.logger.info(f"Registered extension hook: {extension_name} for {point.value}")
            
            return {
                "success": True,
                "extension_name": extension_name,
                "point": point.value,
                "hook_type": hook_type.value,
                "priority": priority.value
            }
            
        except Exception as e:
            self.logger.error(f"Failed to register extension hook: {e}")
            return {
                "success": False,
                "error": f"Registration failed: {e}"
            }
    
    async def execute_extension_point(self, point: ExtensionPoint, operation: str,
                                   parameters: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Execute all extension hooks for a specific point.
        
        Args:
            point: Extension point to execute
            operation: Operation name
            parameters: Operation parameters
            **kwargs: Additional context
            
        Returns:
            Execution results
        """
        context = ExtensionPointContext(
            point=point,
            operation=operation,
            parameters=parameters,
            metadata=kwargs
        )
        
        try:
            # Execute BEFORE hooks
            await self._execute_hooks(context, ExtensionHookType.BEFORE)
            
            # Execute main operation (if provided)
            if "main_operation" in kwargs:
                context.result = await kwargs["main_operation"](**parameters)
            
            # Execute AFTER hooks
            await self._execute_hooks(context, ExtensionHookType.AFTER)
            
            # Record execution
            self._record_execution(context, success=True)
            
            return {
                "success": True,
                "result": context.result,
                "hooks_executed": len(context.hooks_executed),
                "execution_time": (datetime.now() - context.start_time).total_seconds()
            }
            
        except Exception as e:
            context.error = e
            
            # Execute ERROR hooks
            await self._execute_hooks(context, ExtensionHookType.ERROR)
            
            # Execute FINALLY hooks
            await self._execute_hooks(context, ExtensionHookType.FINALLY)
            
            # Record failed execution
            self._record_execution(context, success=False)
            
            return {
                "success": False,
                "error": str(e),
                "hooks_executed": len(context.hooks_executed),
                "execution_time": (datetime.now() - context.start_time).total_seconds()
            }
    
    async def _execute_hooks(self, context: ExtensionPointContext, hook_type: ExtensionHookType):
        """Execute hooks of specific type"""
        hooks = self.extension_points[context.point]
        
        # Filter hooks by type and enabled status
        type_hooks = [h for h in hooks if h.hook_type == hook_type and h.enabled]
        
        # Filter by condition if specified
        filtered_hooks = []
        for hook in type_hooks:
            if hook.condition:
                if self._evaluate_condition(hook.condition, context):
                    filtered_hooks.append(hook)
            else:
                filtered_hooks.append(hook)
        
        # Execute hooks in priority order
        for hook in filtered_hooks:
            try:
                start_time = datetime.now()
                
                # Execute extension hook
                await self._execute_single_hook(hook, context)
                
                # Update hook statistics
                hook.execution_count += 1
                hook.last_execution = datetime.now()
                execution_time = (datetime.now() - start_time).total_seconds()
                
                if hook.execution_count == 1:
                    hook.average_execution_time = execution_time
                else:
                    hook.average_execution_time = (
                        (hook.average_execution_time * (hook.execution_count - 1) + execution_time) /
                        hook.execution_count
                    )
                
                context.hooks_executed.append(hook.extension_name)
                
            except Exception as e:
                hook.error_count += 1
                self.logger.error(f"Extension hook execution error: {e}")
    
    async def _execute_single_hook(self, hook: ExtensionHook, context: ExtensionPointContext):
        """Execute a single extension hook"""
        # Execute extension point through extension manager
        extension_context = {
            "hook_type": hook.hook_type.value,
            "operation": context.operation,
            "parameters": context.parameters,
            "result": context.result,
            "error": context.error,
            "metadata": context.metadata
        }
        
        result = await self.extension_manager.execute_extension_point(
            context.point, extension_context
        )
        
        # Update context with extension results
        if result["success"] and result["results"]:
            for extension_result in result["results"]:
                if extension_result["success"] and extension_result["result"]:
                    # Merge extension results into context
                    if isinstance(extension_result["result"], dict):
                        context.metadata.update(extension_result["result"])
                    else:
                        context.result = extension_result["result"]
    
    def _evaluate_condition(self, condition: str, context: ExtensionPointContext) -> bool:
        """Evaluate hook condition"""
        try:
            # Simple condition evaluation
            # In a real implementation, this would use a safe expression evaluator
            
            # Replace common variables
            eval_context = {
                "operation": context.operation,
                "parameters": context.parameters,
                "result": context.result,
                "error": context.error
            }
            
            # For now, return True (no condition filtering)
            return True
            
        except Exception as e:
            self.logger.error(f"Condition evaluation error: {e}")
            return False
    
    def _record_execution(self, context: ExtensionPointContext, success: bool):
        """Record extension point execution"""
        self.execution_history.append({
            "point": context.point.value,
            "operation": context.operation,
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "hooks_executed": len(context.hooks_executed),
            "execution_time": (datetime.now() - context.start_time).total_seconds(),
            "extensions": context.hooks_executed.copy(),
            "error": str(context.error) if context.error else None
        })
    
    def create_extension_decorator(self, point: ExtensionPoint):
        """Create a decorator for extension point"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Create context
                context = ExtensionPointContext(
                    point=point,
                    operation=func.__name__,
                    parameters=kwargs,
                    metadata={"args": args}
                )
                
                try:
                    # Execute BEFORE hooks
                    await self._execute_hooks(context, ExtensionHookType.BEFORE)
                    
                    # Execute main function
                    result = await func(*args, **kwargs)
                    context.result = result
                    
                    # Execute AFTER hooks
                    await self._execute_hooks(context, ExtensionHookType.AFTER)
                    
                    return result
                    
                except Exception as e:
                    context.error = e
                    
                    # Execute ERROR hooks
                    await self._execute_hooks(context, ExtensionHookType.ERROR)
                    
                    # Re-raise exception
                    raise
                    
                finally:
                    # Execute FINALLY hooks
                    await self._execute_hooks(context, ExtensionHookType.FINALLY)
            
            return wrapper
        
        return decorator
    
    def _initialize_extension_points(self):
        """Initialize extension points with decorators"""
        # Create decorators for common extension points
        self.decorators["before_tool_execution"] = self.create_extension_decorator(ExtensionPoint.BEFORE_TOOL_EXECUTION)
        self.decorators["after_tool_execution"] = self.create_extension_decorator(ExtensionPoint.AFTER_TOOL_EXECUTION)
        self.decorators["before_llm_request"] = self.create_extension_decorator(ExtensionPoint.BEFORE_LLM_REQUEST)
        self.decorators["after_llm_response"] = self.create_extension_decorator(ExtensionPoint.AFTER_LLM_RESPONSE)
        self.decorators["data_processing"] = self.create_extension_decorator(ExtensionPoint.DATA_PROCESSING)
        self.decorators["user_input_validation"] = self.create_extension_decorator(ExtensionPoint.USER_INPUT_VALIDATION)
        self.decorators["system_startup"] = self.create_extension_decorator(ExtensionPoint.SYSTEM_STARTUP)
        self.decorators["system_shutdown"] = self.create_extension_decorator(ExtensionPoint.SYSTEM_SHUTDOWN)
        self.decorators["error_handling"] = self.create_extension_decorator(ExtensionPoint.ERROR_HANDLING)
        self.decorators["logging"] = self.create_extension_decorator(ExtensionPoint.LOGGING_EXTENSION)
    
    def get_extension_point_status(self, point: ExtensionPoint) -> Dict[str, Any]:
        """Get status of an extension point"""
        hooks = self.extension_points[point]
        
        return {
            "point": point.value,
            "total_hooks": len(hooks),
            "enabled_hooks": len([h for h in hooks if h.enabled]),
            "hooks_by_type": {
                hook_type.value: len([h for h in hooks if h.hook_type == hook_type])
                for hook_type in ExtensionHookType
            },
            "extensions": [
                {
                    "extension_name": hook.extension_name,
                    "hook_type": hook.hook_type.value,
                    "priority": hook.priority.value,
                    "enabled": hook.enabled,
                    "execution_count": hook.execution_count,
                    "error_count": hook.error_count,
                    "average_execution_time": hook.average_execution_time
                }
                for hook in hooks
            ]
        }
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall extension point system status"""
        total_hooks = sum(len(hooks) for hooks in self.extension_points.values())
        enabled_hooks = sum(len([h for h in hooks if h.enabled]) for hooks in self.extension_points.values())
        
        # Get recent executions
        recent_executions = [
            e for e in self.execution_history
            if datetime.fromisoformat(e["timestamp"]) > datetime.now() - timedelta(hours=1)
        ]
        
        return {
            "total_extension_points": len(self.extension_points),
            "total_hooks": total_hooks,
            "enabled_hooks": enabled_hooks,
            "recent_executions": len(recent_executions),
            "execution_success_rate": (
                len([e for e in recent_executions if e["success"]]) / len(recent_executions) * 100
                if recent_executions else 0
            ),
            "extension_points": {
                point.value: self.get_extension_point_status(point)
                for point in ExtensionPoint
            }
        }
    
    def enable_hook(self, extension_name: str, point: ExtensionPoint, hook_type: ExtensionHookType) -> Dict[str, Any]:
        """Enable a specific hook"""
        hooks = self.extension_points[point]
        
        for hook in hooks:
            if hook.extension_name == extension_name and hook.hook_type == hook_type:
                hook.enabled = True
                return {
                    "success": True,
                    "extension_name": extension_name,
                    "point": point.value,
                    "hook_type": hook_type.value,
                    "enabled": True
                }
        
        return {
            "success": False,
            "error": "Hook not found"
        }
    
    def disable_hook(self, extension_name: str, point: ExtensionPoint, hook_type: ExtensionHookType) -> Dict[str, Any]:
        """Disable a specific hook"""
        hooks = self.extension_points[point]
        
        for hook in hooks:
            if hook.extension_name == extension_name and hook.hook_type == hook_type:
                hook.enabled = False
                return {
                    "success": True,
                    "extension_name": extension_name,
                    "point": point.value,
                    "hook_type": hook_type.value,
                    "enabled": False
                }
        
        return {
            "success": False,
            "error": "Hook not found"
        }
    
    def remove_hook(self, extension_name: str, point: ExtensionPoint, hook_type: ExtensionHookType) -> Dict[str, Any]:
        """Remove a specific hook"""
        hooks = self.extension_points[point]
        
        for i, hook in enumerate(hooks):
            if hook.extension_name == extension_name and hook.hook_type == hook_type:
                hooks.pop(i)
                return {
                    "success": True,
                    "extension_name": extension_name,
                    "point": point.value,
                    "hook_type": hook_type.value,
                    "removed": True
                }
        
        return {
            "success": False,
            "error": "Hook not found"
        }
    
    def get_execution_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get extension point execution history"""
        return self.execution_history[-limit:]


# Global extension point system instance
extension_point_system = None

def get_extension_point_system() -> ExtensionPointSystem:
    """Get or create extension point system instance"""
    global extension_point_system
    if extension_point_system is None:
        extension_point_system = ExtensionPointSystem()
    return extension_point_system


# Example usage decorators
def before_tool_execution(func: Callable) -> Callable:
    """Decorator for before tool execution extension point"""
    system = get_extension_point_system()
    return system.decorators["before_tool_execution"](func)


def after_tool_execution(func: Callable) -> Callable:
    """Decorator for after tool execution extension point"""
    system = get_extension_point_system()
    return system.decorators["after_tool_execution"](func)


def before_llm_request(func: Callable) -> Callable:
    """Decorator for before LLM request extension point"""
    system = get_extension_point_system()
    return system.decorators["before_llm_request"](func)


def after_llm_response(func: Callable) -> Callable:
    """Decorator for after LLM response extension point"""
    system = get_extension_point_system()
    return system.decorators["after_llm_response"](func)


def data_processing(func: Callable) -> Callable:
    """Decorator for data processing extension point"""
    system = get_extension_point_system()
    return system.decorators["data_processing"](func)


def user_input_validation(func: Callable) -> Callable:
    """Decorator for user input validation extension point"""
    system = get_extension_point_system()
    return system.decorators["user_input_validation"](func)


def error_handling(func: Callable) -> Callable:
    """Decorator for error handling extension point"""
    system = get_extension_point_system()
    return system.decorators["error_handling"](func)


def logging_decorator(func: Callable) -> Callable:
    """Decorator for logging extension point"""
    system = get_extension_point_system()
    return system.decorators["logging"](func)
