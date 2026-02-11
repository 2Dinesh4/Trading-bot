from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

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