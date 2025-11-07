import json
import redis
import asyncio
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.core.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket connection manager with Redis Pub/Sub for scaling"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.redis_client = None
        self.redis_pubsub = None
        self._setup_redis()
    
    def _setup_redis(self):
        """Setup Redis connection and Pub/Sub"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_pubsub = self.redis_client.pubsub()
            # Subscribe to MT5 data channel
            self.redis_pubsub.subscribe("mt5_data")
            logger.info("Redis Pub/Sub connected")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.redis_client = None
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id}")
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"WebSocket disconnected: {client_id}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        disconnected = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)
        
        # Remove disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def handle_redis_messages(self):
        """Handle messages from Redis Pub/Sub and broadcast to WebSocket clients"""
        if not self.redis_pubsub:
            return
        
        while True:
            try:
                message = self.redis_pubsub.get_message(timeout=0.1)
                if message and message['type'] == 'message':
                    data = message['data']
                    # Broadcast to all connected WebSocket clients
                    await self.broadcast(data)
                await asyncio.sleep(0.1)  # Small delay to prevent busy loop
            except Exception as e:
                logger.error(f"Error handling Redis message: {e}")
                await asyncio.sleep(1)  # Wait before retrying
    
    def publish_to_redis(self, channel: str, data: dict):
        """Publish data to Redis channel"""
        if self.redis_client:
            try:
                self.redis_client.publish(channel, json.dumps(data))
            except Exception as e:
                logger.error(f"Error publishing to Redis: {e}")


# Global connection manager instance
manager = ConnectionManager()

