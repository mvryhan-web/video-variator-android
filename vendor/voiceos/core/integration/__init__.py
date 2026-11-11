"""
VoiceOS Integration Framework

This module contains components for integration patterns and controlled execution.
"""

from .integration_patterns import get_integration_manager
from .controlled_execution import get_controlled_execution_manager

__all__ = [
    'get_integration_manager',
    'get_controlled_execution_manager'
]
