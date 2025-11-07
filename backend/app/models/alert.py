from sqlalchemy import Column, String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    condition_type = Column(String(50), nullable=False)  # PRICE_ABOVE, PRICE_BELOW, PINE_CONDITION, etc.
    condition_value = Column(Numeric(10, 5))  # For price-based conditions
    condition_code = Column(Text)  # For Pine script conditions
    timeframe = Column(String(10), nullable=False)  # 5M, 15M, 1H, etc.
    webhook_url = Column(Text, nullable=False)  # Dynamic webhook URL from user
    trigger_type = Column(String(20), default="ONCE")  # ONCE, RECURRING
    is_active = Column(Boolean, default=True, nullable=False)
    last_triggered = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="alerts")
    
    def __repr__(self):
        return f"<Alert {self.symbol} {self.condition_type}>"

