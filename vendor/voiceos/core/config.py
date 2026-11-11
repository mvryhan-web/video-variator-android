"""
VoiceOS Configuration Management

This module provides centralized configuration management for VoiceOS,
handling environment variables, project paths, and system settings.
"""

import os
from pathlib import Path
from typing import Optional


class Config:
    """
    Central configuration management class for VoiceOS.
    
    This class handles loading and accessing configuration values from
    environment variables and provides access to project paths and
    system settings throughout the VoiceOS application.
    
    Attributes:
        project_root (Path): Root directory of the VoiceOS project
    """
    
    def __init__(self):
        """Initialize configuration and load environment variables."""
        self.project_root = Path(__file__).parent.parent
        self.load_env()
    
    def load_env(self):
        """
        Load environment variables from .env file.
        
        Reads the .env file in the project root and loads all
        non-comment, non-empty lines as environment variables.
        """
        env_file = self.project_root / ".env"
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        key, value = line.split('=', 1)
                        os.environ[key] = value
    
    @property
    def llm_endpoint(self) -> str:
        """Get LLM API endpoint URL."""
        return os.getenv('LLM_ENDPOINT', 'http://localhost:11434/api/generate')
    
    @property
    def llm_model(self) -> str:
        """Get default LLM model name."""
        return os.getenv('LLM_MODEL', 'mistral')
    
    @property
    def tts_output_path(self) -> str:
        """Get TTS output file path."""
        return os.getenv('TTS_OUTPUT_PATH', str(self.project_root / 'output' / 'response.wav'))
    
    @property
    def models_directory(self) -> str:
        """Get models directory path."""
        return os.getenv('MODELS_DIRECTORY', str(self.project_root / 'models'))
    
    @property
    def log_level(self) -> str:
        """Get logging level."""
        return os.getenv('LOG_LEVEL', 'INFO')
    
    @property
    def whisper_model(self) -> str:
        """Get Whisper STT model name."""
        return os.getenv('WHISPER_MODEL', 'base')
    
    @property
    def tts_model(self) -> str:
        """Get TTS model path."""
        return os.getenv('TTS_MODEL', 'tts_models/en/ljspeech/tacotron2-DDC')
    
    @property
    def max_ram_threshold(self) -> int:
        """Get maximum RAM threshold in GB."""
        return int(os.getenv('MAX_RAM_THRESHOLD', '12'))
    
    def ensure_output_directory(self):
        """
        Ensure output directory exists for TTS files.
        
        Creates the output directory if it doesn't exist.
        """
        output_dir = Path(self.tts_output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)


# Global config instance
config = Config()