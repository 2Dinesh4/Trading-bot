# Import all models
from app.models.user import User
from app.models.kyc import KYCDocument
from app.models.api_keys import UserAPIKey

# Import from the OLD models.py file (if it exists)
from app.database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


class Strategy(Base):
    """Trading strategy configuration"""
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Trading parameters
    scrip = Column(String, nullable=False)
    entry_value = Column(Float, nullable=False)
    initial_stop_loss = Column(Float, nullable=False)
    exit_percent = Column(Float, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy", cascade="all, delete-orphan")


class Trade(Base):
    """Individual trade records"""
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    
    # Trade details
    scrip = Column(String, nullable=False)
    
    # Entry details
    entry_price = Column(Float, nullable=False)
    entry_time = Column(DateTime, default=datetime.utcnow)
    quantity = Column(Float, nullable=False)
    
    # Exit details
    exit_price = Column(Float, nullable=True)
    exit_time = Column(DateTime, nullable=True)
    
    # Stop loss and target
    stop_loss_price = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    
    # P&L
    pnl_percent = Column(Float, nullable=True)
    pnl_amount = Column(Float, nullable=True)
    
    # Status
    status = Column(String, default="open")
    
    # Binance order IDs
    buy_order_id = Column(String, nullable=True)
    sell_order_id = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")


class Order(Base):
    """Order history from Binance"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=True)
    
    # Binance order details
    binance_order_id = Column(String, unique=True, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)
    order_type = Column(String, nullable=False)
    
    # Pricing
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    executed_qty = Column(Float, nullable=True)
    
    # Status
    status = Column(String, nullable=False)
    
    # Timestamps
    order_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


__all__ = [
    "User",
    "KYCDocument",
    "UserAPIKey",
    "Strategy",
    "Trade",
    "Order"
]
