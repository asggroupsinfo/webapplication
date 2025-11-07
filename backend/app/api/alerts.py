from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse

router = APIRouter()


@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all alerts for current user"""
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return alerts


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new alert with custom webhook URL"""
    # Validate webhook URL format
    if not alert_data.webhook_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook URL format. Must start with http:// or https://"
        )
    
    new_alert = Alert(
        user_id=current_user.id,
        symbol=alert_data.symbol,
        condition_type=alert_data.condition_type,
        condition_value=alert_data.condition_value,
        condition_code=alert_data.condition_code,
        timeframe=alert_data.timeframe,
        webhook_url=alert_data.webhook_url,
        trigger_type=alert_data.trigger_type,
        is_active=alert_data.is_active
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    
    return new_alert


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get alert by ID"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    alert_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update alert"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    # Update fields
    if alert_data.symbol is not None:
        alert.symbol = alert_data.symbol
    if alert_data.condition_type is not None:
        alert.condition_type = alert_data.condition_type
    if alert_data.condition_value is not None:
        alert.condition_value = alert_data.condition_value
    if alert_data.condition_code is not None:
        alert.condition_code = alert_data.condition_code
    if alert_data.timeframe is not None:
        alert.timeframe = alert_data.timeframe
    if alert_data.webhook_url is not None:
        # Validate webhook URL
        if not alert_data.webhook_url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook URL format. Must start with http:// or https://"
            )
        alert.webhook_url = alert_data.webhook_url
    if alert_data.trigger_type is not None:
        alert.trigger_type = alert_data.trigger_type
    if alert_data.is_active is not None:
        alert.is_active = alert_data.is_active
    
    db.commit()
    db.refresh(alert)
    
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete alert"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    db.delete(alert)
    db.commit()
    
    return None

