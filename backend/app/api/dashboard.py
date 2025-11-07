from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.services.mt5_bridge import MT5Bridge

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics"""
    try:
        # Get MT5 connection status
        mt5_status = "connected" if MT5Bridge.is_connected() else "disconnected"
        
        # Get active alerts count for current user
        active_alerts_count = db.query(func.count(Alert.id)).filter(
            Alert.user_id == current_user.id,
            Alert.is_active == True
        ).scalar() or 0
        
        # Get total alerts count for current user
        total_alerts_count = db.query(func.count(Alert.id)).filter(
            Alert.user_id == current_user.id
        ).scalar() or 0
        
        # Get strategies count (placeholder for now)
        strategies_count = 0
        
        return {
            "mt5_status": mt5_status,
            "active_alerts": active_alerts_count,
            "total_alerts": total_alerts_count,
            "strategies": strategies_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

