from sqlalchemy import Column, String, Numeric, DateTime, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class MarketData(Base):
    __tablename__ = "market_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False, index=True)
    open_price = Column(Numeric(15, 5), nullable=False)
    high_price = Column(Numeric(15, 5), nullable=False)
    low_price = Column(Numeric(15, 5), nullable=False)
    close_price = Column(Numeric(15, 5), nullable=False)
    volume = Column(BigInteger)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite index for faster queries
    __table_args__ = (
        Index('idx_market_data_symbol_timeframe', 'symbol', 'timeframe'),
        Index('idx_market_data_timestamp', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<MarketData {self.symbol} {self.timeframe} {self.timestamp}>"

