from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.services.mt5_bridge import MT5Bridge

router = APIRouter()


@router.get("/symbols")
async def get_symbols(
    current_user = Depends(get_current_user)
):
    """Get available trading symbols from MT5"""
    try:
        symbols = MT5Bridge.get_symbols()
        return {"symbols": symbols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching symbols: {str(e)}")


@router.get("/history/{symbol}")
async def get_historical_data(
    symbol: str,
    timeframe: str = "M15",
    count: int = 100,
    current_user = Depends(get_current_user)
):
    """Get historical candle data for a symbol"""
    try:
        data = MT5Bridge.get_historical_data(symbol, timeframe, count)
        return {"symbol": symbol, "timeframe": timeframe, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching historical data: {str(e)}")

