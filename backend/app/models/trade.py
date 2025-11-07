from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    ticket = Column(BigInteger, unique=True, nullable=False)
    symbol = Column(String(20), nullable=False)
    trade_type = Column(String(10), nullable=False)  # BUY, SELL
    volume = Column(Numeric(10, 2), nullable=False)
    open_price = Column(Numeric(10, 5), nullable=False)
    close_price = Column(Numeric(10, 5))
    stop_loss = Column(Numeric(10, 5))
    take_profit = Column(Numeric(10, 5))
    open_time = Column(DateTime(timezone=True), nullable=False)
    close_time = Column(DateTime(timezone=True))
    profit = Column(Numeric(15, 2))
    status = Column(String(20), default="OPEN")  # OPEN, CLOSED
    
    # Relationships
    account = relationship("Account", backref="trades")
    
    def __repr__(self):
        return f"<Trade {self.ticket} {self.symbol}>"

