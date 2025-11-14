from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    """User model for authentication and user management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    provider = Column(String, default="email")  # email, google
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    strategies = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")

class Strategy(Base):
    """Trading strategy configuration"""
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Trading parameters
    scrip = Column(String, nullable=False)  # e.g., BTCUSDT
    entry_value = Column(Float, nullable=False)
    initial_stop_loss = Column(Float, nullable=False)  # Percentage
    exit_percent = Column(Float, nullable=False)  # Target percentage
    
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
    scrip = Column(String, nullable=False)  # e.g., BTCUSDT
    
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
    
    # Status: open, closed_target, closed_stoploss, closed_manual
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
    side = Column(String, nullable=False)  # BUY, SELL
    order_type = Column(String, nullable=False)  # MARKET, LIMIT
    
    # Pricing
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    executed_qty = Column(Float, nullable=True)
    
    # Status
    status = Column(String, nullable=False)  # NEW, FILLED, CANCELLED
    
    # Timestamps
    order_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
