from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    scrip = Column(String(50), nullable=False)
    
    # Entry details
    entry_price = Column(Numeric(15, 4), nullable=False)
    entry_time = Column(DateTime, nullable=False)
    quantity = Column(Numeric(15, 8), default=1)
    
    # Exit details
    exit_price = Column(Numeric(15, 4), nullable=True)
    exit_time = Column(DateTime, nullable=True)
    
    # Stop loss and target
    stop_loss_price = Column(Numeric(15, 4), nullable=True)
    target_price = Column(Numeric(15, 4), nullable=True)
    current_price = Column(Numeric(15, 4), nullable=True)
    
    # Highest price for Trailing Stop
    highest_price = Column(Numeric(15, 4), default=0)
    
    # P&L
    pnl_percent = Column(Numeric(10, 2), nullable=True)
    pnl_amount = Column(Numeric(15, 2), nullable=True)
    
    # Status
    status = Column(String(20), default="open")
    
    # Order IDs
    buy_order_id = Column(String(100), nullable=True)
    sell_order_id = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # ✅ Relationships (CRITICAL)
    user = relationship("User", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")