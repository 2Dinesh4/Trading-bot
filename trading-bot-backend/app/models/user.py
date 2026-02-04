from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    """Enhanced User model with KYC, Wallet, OTP, API Key, and Risk Management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Wallet (Real Balance syncs here)
    wallet_balance = Column(Numeric(20, 2), default=0.00, nullable=False)
    
    # ✅ BUG-006 FIX: Risk Management Fields
    daily_pnl = Column(Numeric(20, 2), default=0.00) # Tracks net P&L for the current day
    last_trade_date = Column(DateTime, default=datetime.utcnow) # Used to reset daily_pnl at midnight
    
    # KYC fields
    kyc_status = Column(String, default="pending")
    kyc_submitted_at = Column(DateTime, nullable=True)
    kyc_approved_at = Column(DateTime, nullable=True)
    kyc_rejected_reason = Column(String, nullable=True)
    
    # Authentication & OTP
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    
    provider = Column(String, default="email")
    is_active = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    api_keys = relationship("UserAPIKey", back_populates="user", cascade="all, delete-orphan")
    
    kyc_documents = relationship("KYCDocument", back_populates="user", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    wallet_transactions = relationship("WalletTransaction", back_populates="user", cascade="all, delete-orphan")