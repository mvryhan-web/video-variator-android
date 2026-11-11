"""
VoiceOS Basic File Tools

This module provides basic file operation utilities for VoiceOS.
These are legacy tools that have been superseded by the enhanced file manager.
"""

import subprocess


def open_app(app):
    """
    Open an application using subprocess.
    
    Args:
        app (str): Application path or command
        
    Returns:
        str: Success message or error string
    """
    try:
        subprocess.Popen(app)
        return f"{app} opened successfully."
    except Exception as e:
        return str(e)
    

def create_file(path):
    """
    Create an empty file at the specified path.
    
    Args:
        path (str): File path to create
        
    Returns:
        str: Success message
    """
    with open(path, "w") as f:
        pass
    return f"File created at {path}"


import os


def delete_file(path):
    """
    Delete a file at the specified path.
    
    Args:
        path (str): File path to delete
        
    Returns:
        str: Success message or error
    """
    if os.path.exists(path):
        os.remove(path)

        return "File deleted."

    return "File not found."

def read_file(path):
    """
    Read content from a file.
    
    Args:
        path (str): File path to read
        
    Returns:
        str: File content or error message
    """
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        return content
    return "File not found."


def write_file(path, content):
    """
    Write content to a file.
    
    Args:
        path (str): File path to write
        content (str): Content to write
        
    Returns:
        str: Success message
    """
    with open(path, "w") as f:
        f.write(content)
    return f"Content written to {path}" 

