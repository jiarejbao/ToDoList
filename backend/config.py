"""
Configuration management for ToDoList application
"""

import os
from pathlib import Path

# Database configuration
# WSL2 PostgreSQL 需要通过特定 IP 访问
# 获取 WSL IP: 在 WSL 中运行 `hostname -I`
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),  # Windows用localhost, WSL用localhost
    "port": int(os.getenv("DB_PORT", "5432")),
    "user": os.getenv("DB_USER", "baojiaren"),
    "password": os.getenv("DB_PASSWORD", "todolist_baojiaren"),
    "database": os.getenv("DB_NAME", "todolist"),
}

# Construct async PostgreSQL URL
DATABASE_URL = (
    f"postgresql+asyncpg://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}"
    f"@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"
)

# Application settings
APP_CONFIG = {
    "title": "ToDoList API",
    "description": "A local-first task management API with FastAPI and PostgreSQL",
    "version": "1.0.0",
    "debug": os.getenv("DEBUG", "true").lower() == "true",
}

# Trash cleanup settings
TRASH_CONFIG = {
    "expire_days": 30,  # Auto cleanup after 30 days
    "cleanup_on_startup": True,
}

# CORS settings
CORS_CONFIG = {
    "allow_origins": ["*"],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
