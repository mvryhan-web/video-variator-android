"""
VoiceOS Logger Module

This module provides centralized logging functionality for VoiceOS,
with structured logging and multiple output formats.
"""

import logging
import os
from datetime import datetime


class VoiceOSLogger:
    """
    Centralized logger for VoiceOS with structured logging.
    
    Provides consistent logging across all VoiceOS components with
    configurable output formats and log levels.
    
    Attributes:
        logger: The underlying Python logger instance
    """
    
    def __init__(self, name="VoiceOS"):
        """
        Initialize VoiceOS logger.
        
        Args:
            name (str): Logger name, defaults to "VoiceOS"
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '[%(asctime)s] %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def info(self, message):
        """
        Log info level message.
        
        Args:
            message (str): Message to log
        """
        self.logger.info(message)
    
    def debug(self, message):
        """
        Log debug level message.
        
        Args:
            message (str): Message to log
        """
        self.logger.debug(message)
    
    def warning(self, message):
        """
        Log warning level message.
        
        Args:
            message (str): Message to log
        """
        self.logger.warning(message)
    
    def error(self, message):
        """
        Log error level message.
        
        Args:
            message (str): Message to log
        """
        self.logger.error(message)


# Global logger instance
logger = VoiceOSLogger()