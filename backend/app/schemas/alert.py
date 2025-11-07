from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
from decimal import Decimal


class AlertBase(BaseModel):
    symbol: str
    condition_type: str
    timeframe: str
    webhook_url: str
    trigger_type: str = "ONCE"
    is_active: bool = True


class AlertCreate(AlertBase):
    condition_value: Optional[Decimal] = None
    condition_code: Optional[str] = None


class AlertUpdate(BaseModel):
    symbol: Optional[str] = None
    condition_type: Optional[str] = None
    condition_value: Optional[Decimal] = None
    condition_code: Optional[str] = None
    timeframe: Optional[str] = None
    webhook_url: Optional[str] = None
    trigger_type: Optional[str] = None
    is_active: Optional[bool] = None


class AlertResponse(AlertBase):
    id: str
    user_id: str
    condition_value: Optional[Decimal] = None
    condition_code: Optional[str] = None
    last_triggered: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

