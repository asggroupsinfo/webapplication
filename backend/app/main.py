from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import Base, engine
from app.services.mt5_bridge import MT5Bridge
from app.services.websocket_manager import manager
from app.services.alert_engine import alert_engine
from app.api import auth, users, alerts, charts, dashboard

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Forex Master Pro API...")
    try:
        await MT5Bridge.initialize()
        logger.info("MT5 Bridge initialized")
    except Exception as e:
        logger.error(f"Failed to initialize MT5 Bridge: {e}")
    
    # Start Redis message handler
    asyncio.create_task(manager.handle_redis_messages())
    
    # Start alert engine
    await alert_engine.start()
    logger.info("Alert engine started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Forex Master Pro API...")
    await alert_engine.stop()
    await MT5Bridge.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional Forex Trading Platform",
    version=settings.VERSION,
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts"])
app.include_router(charts.router, prefix=f"{settings.API_V1_STR}/charts", tags=["Charts"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data"""
    import uuid
    import json
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)
    
    # Send initial MT5 status
    mt5_status = "connected" if MT5Bridge.is_connected() else "disconnected"
    await manager.send_personal_message(
        json.dumps({"type": "mt5_status", "status": mt5_status}),
        client_id
    )
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Parse JSON message
                message = json.loads(data)
                message_type = message.get("type")
                
                # Handle different message types
                if message_type == "subscribe":
                    # Subscribe to specific data stream
                    symbol = message.get("symbol")
                    if symbol:
                        # Subscribe to price updates for this symbol
                        pass
                elif message_type == "unsubscribe":
                    # Unsubscribe from data stream
                    pass
                else:
                    # Echo back for debugging
                    await manager.send_personal_message(
                        json.dumps({"type": "echo", "data": message}),
                        client_id
                    )
            except json.JSONDecodeError:
                # Handle plain text messages
                await manager.send_personal_message(
                    json.dumps({"type": "echo", "data": data}),
                    client_id
                )
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"WebSocket client {client_id} disconnected")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Forex Master Pro API",
        "status": "running",
        "version": settings.VERSION
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    mt5_status = "connected" if MT5Bridge.is_connected() else "disconnected"
    return {
        "status": "healthy",
        "mt5": mt5_status,
        "redis": "connected" if manager.redis_client else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)

