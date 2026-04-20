"""
ToDoList FastAPI Application Entry Point
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import APP_CONFIG, CORS_CONFIG
from models.database import init_db
from services.trash_service import cleanup_expired_tasks
from models.database import AsyncSessionLocal

# Import routers
from routers import tasks, subtasks, calendar, completed, trash, notes, workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting up...")
    
    # Initialize database tables
    await init_db()
    print("Database initialized")
    
    # Clean up expired trash items
    async with AsyncSessionLocal() as db:
        count = await cleanup_expired_tasks(db)
        if count > 0:
            print(f"Cleaned up {count} expired tasks from trash")
    
    yield
    
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=APP_CONFIG["title"],
    description=APP_CONFIG["description"],
    version=APP_CONFIG["version"],
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_CONFIG["allow_origins"],
    allow_credentials=CORS_CONFIG["allow_credentials"],
    allow_methods=CORS_CONFIG["allow_methods"],
    allow_headers=CORS_CONFIG["allow_headers"],
)

# Include routers
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(subtasks.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(completed.router, prefix="/api/v1")
app.include_router(trash.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(workflow.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": APP_CONFIG["version"]}

# Static files for frontend (React SPA build output)
# Must be registered AFTER API routes so API routes take precedence
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=APP_CONFIG["debug"],
        log_level="info"
    )
