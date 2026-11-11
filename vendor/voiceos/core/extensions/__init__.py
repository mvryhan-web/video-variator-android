"""
VoiceOS Extension System

This module contains all components related to extensions,
including secure integration and extension point management.
"""

from .secure_extension_integration import get_secure_extension_manager
from .extension_point_system import get_extension_point_system

__all__ = [
    'get_secure_extension_manager',
    'get_extension_point_system'
]
