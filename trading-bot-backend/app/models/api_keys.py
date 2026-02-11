from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# 1. Define the class as "UserAPIKey" (Matches exchange_service.py)
class UserAPIKey(Base):
    """User-specific API keys for exchanges (Encrypted)"""
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Exchange details
    exchange = Column(String, default="binance", nullable=False)
    
    # Encrypted keys (Store these securely!)
    api_key_encrypted = Column(String, nullable=False)
    api_secret_encrypted = Column(String, nullable=True)
    access_token_encrypted = Column(String, nullable=True) # For brokers like Upstox
    
    # Metadata
    key_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="api_keys")

# 2. Create an Alias (Matches main.py)
# This tells Python: "If anyone looks for 'APIKey', give them 'UserAPIKey'"
APIKey = UserAPIKey