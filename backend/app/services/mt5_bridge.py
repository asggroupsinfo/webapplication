import MetaTrader5 as mt5
import time
import asyncio
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


class MT5Bridge:
    """MT5 Connection Bridge with auto-reconnection and heartbeat"""
    
    _instance = None
    _connected = False
    _connection_attempts = 0
    _max_retries = 10
    
    @classmethod
    async def initialize(cls):
        """Initialize MT5 connection"""
        if cls._instance is None:
            cls._instance = cls()
        await cls._instance.connect()
        return cls._instance
    
    @classmethod
    async def shutdown(cls):
        """Shutdown MT5 connection"""
        if cls._instance and cls._connected:
            mt5.shutdown()
            cls._connected = False
            logger.info("MT5 connection closed")
    
    async def connect(self):
        """Connect to MT5 with exponential backoff retry"""
        if self._connected:
            return True
        
        retry_delay = 1  # Start with 1 second
        
        for attempt in range(self._max_retries):
            try:
                if not mt5.initialize():
                    error = mt5.last_error()
                    logger.warning(f"MT5 initialization failed (attempt {attempt + 1}): {error}")
                    if attempt < self._max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay = min(retry_delay * 2, 60)  # Exponential backoff, max 60s
                        continue
                    else:
                        raise Exception(f"Failed to initialize MT5 after {self._max_retries} attempts")
                
                # Login to account
                authorized = mt5.login(
                    login=settings.MT5_LOGIN,
                    password=settings.MT5_PASSWORD,
                    server=settings.MT5_SERVER
                )
                
                if not authorized:
                    error = mt5.last_error()
                    logger.warning(f"MT5 login failed (attempt {attempt + 1}): {error}")
                    mt5.shutdown()
                    if attempt < self._max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay = min(retry_delay * 2, 60)
                        continue
                    else:
                        raise Exception(f"Failed to login to MT5 after {self._max_retries} attempts")
                
                self._connected = True
                self._connection_attempts = 0
                logger.info("MT5 connected successfully")
                
                # Broadcast connection status
                from app.services.websocket_manager import manager
                asyncio.create_task(manager.broadcast(json.dumps({"type": "mt5_status", "status": "connected"})))
                
                # Start heartbeat task
                asyncio.create_task(self._heartbeat_loop())
                
                return True
                
            except Exception as e:
                logger.error(f"MT5 connection error: {e}")
                if attempt < self._max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)
                else:
                    raise
    
    async def _heartbeat_loop(self):
        """Heartbeat mechanism to check connection every 5-10 seconds"""
        from app.services.websocket_manager import manager
        
        while self._connected:
            try:
                await asyncio.sleep(5)  # Check every 5 seconds
                terminal_info = mt5.terminal_info()
                
                if terminal_info is None:
                    logger.warning("MT5 heartbeat failed - connection lost")
                    self._connected = False
                    # Broadcast status update
                    await manager.broadcast(json.dumps({"type": "mt5_status", "status": "disconnected"}))
                    # Attempt reconnection
                    await self.connect()
                else:
                    logger.debug("MT5 heartbeat OK")
                    # Broadcast status update
                    await manager.broadcast(json.dumps({"type": "mt5_status", "status": "connected"}))
                    
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                self._connected = False
                # Attempt reconnection
                await self.connect()
    
    @classmethod
    def get_symbols(cls) -> List[str]:
        """Get list of available symbols"""
        if not cls._connected:
            raise Exception("MT5 not connected")
        
        symbols = mt5.symbols_get()
        if symbols is None:
            raise Exception("Failed to get symbols from MT5")
        
        return [symbol.name for symbol in symbols]
    
    @classmethod
    def get_historical_data(cls, symbol: str, timeframe: str, count: int) -> List[Dict]:
        """Get historical candle data"""
        if not cls._connected:
            raise Exception("MT5 not connected")
        
        # Map timeframe string to MT5 constant
        timeframe_map = {
            "M1": mt5.TIMEFRAME_M1,
            "M5": mt5.TIMEFRAME_M5,
            "M15": mt5.TIMEFRAME_M15,
            "M30": mt5.TIMEFRAME_M30,
            "H1": mt5.TIMEFRAME_H1,
            "H4": mt5.TIMEFRAME_H4,
            "D1": mt5.TIMEFRAME_D1,
            "W1": mt5.TIMEFRAME_W1,
        }
        
        mt5_timeframe = timeframe_map.get(timeframe, mt5.TIMEFRAME_M15)
        
        rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, count)
        if rates is None:
            raise Exception(f"Failed to get historical data for {symbol}")
        
        # Convert to list of dicts
        data = []
        for rate in rates:
            data.append({
                "time": datetime.fromtimestamp(rate[0]).isoformat(),
                "open": float(rate[1]),
                "high": float(rate[2]),
                "low": float(rate[3]),
                "close": float(rate[4]),
                "volume": int(rate[5]),
            })
        
        return data
    
    @classmethod
    def get_current_price(cls, symbol: str) -> Optional[Dict]:
        """Get current price for a symbol"""
        if not cls._connected:
            raise Exception("MT5 not connected")
        
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return None
        
        return {
            "symbol": symbol,
            "bid": float(tick.bid),
            "ask": float(tick.ask),
            "time": datetime.fromtimestamp(tick.time).isoformat(),
        }
    
    @classmethod
    def is_connected(cls) -> bool:
        """Check if MT5 is connected"""
        return cls._connected

