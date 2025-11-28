from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, nullable=True)
    scrip = Column(String(50), nullable=False)
    entry_price = Column(Numeric(15, 4), nullable=False)
    entry_time = Column(DateTime, nullable=False)
    quantity = Column(Numeric(15, 8), default=1)
    exit_price = Column(Numeric(15, 4), nullable=True)
    exit_time = Column(DateTime, nullable=True)
    stop_loss_price = Column(Numeric(15, 4), nullable=True)
    target_price = Column(Numeric(15, 4), nullable=True)
    current_price = Column(Numeric(15, 4), nullable=True)
    pnl_percent = Column(Numeric(10, 2), nullable=True)
    pnl_amount = Column(Numeric(15, 2), nullable=True)
    status = Column(String(20), default="open")
    buy_order_id = Column(String(100), nullable=True)
    sell_order_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
