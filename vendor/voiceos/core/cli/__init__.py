"""
VoiceOS CLI System

This module contains components for command-line interface integration.
"""

from .voice_cli_integration import get_voice_cli
from .response_builder import get_response_builder

__all__ = [
    'get_voice_cli',
    'get_response_builder'
]
