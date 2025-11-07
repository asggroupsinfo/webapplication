from sqlalchemy import Column, String, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mt5_login = Column(String(50), nullable=False)
    encrypted_mt5_password = Column(String(500), nullable=False)  # Encrypted password
    mt5_server = Column(String(255), nullable=False)
    balance = Column(Numeric(15, 2), default=0.00)
    equity = Column(Numeric(15, 2), default=0.00)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="accounts")
    
    def __repr__(self):
        return f"<Account {self.mt5_login}>"

