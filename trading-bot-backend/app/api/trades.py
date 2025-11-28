from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_db
from app.utils.jwt_handler import decode_token
from app.models import Trade

router = APIRouter(prefix="/api/trades", tags=["Trades"])
security = HTTPBearer()


# ===== AUTH HELPER (Same as trading.py) =====

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user_id from JWT token"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")


# ===== DATA MODELS =====

class TradeCreate(BaseModel):
    scrip: str
    entry_price: float
    entry_time: str
    quantity: float = 1.0
    stop_loss_price: float  # ← Made required (not Optional)
    target_price: float     # ← Made required (not Optional)


class TradeClose(BaseModel):
    exit_price: float
    exit_time: str
    pnl_percent: float
    pnl_amount: float
    status: str


# ===== API ENDPOINTS =====

@router.post("")
async def create_trade(
    trade_data: TradeCreate = Body(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Save new trade when bot starts"""
    try:
        new_trade = Trade(
            user_id=user_id,
            scrip=trade_data.scrip,
            entry_price=trade_data.entry_price,
            entry_time=datetime.fromisoformat(trade_data.entry_time.replace('Z', '+00:00')),
            quantity=trade_data.quantity,
            stop_loss_price=trade_data.stop_loss_price,
            target_price=trade_data.target_price,
            status="open"
        )
        
        db.add(new_trade)
        db.commit()
        db.refresh(new_trade)
        
        return {
            "success": True,
            "trade_id": new_trade.id,
            "message": "Trade saved"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{trade_id}/close")
async def close_trade(
    trade_id: int,
    close_data: TradeClose = Body(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update trade when it closes"""
    try:
        trade = db.query(Trade).filter(
            Trade.id == trade_id,
            Trade.user_id == user_id
        ).first()
        
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        trade.exit_price = close_data.exit_price
        trade.exit_time = datetime.fromisoformat(close_data.exit_time.replace('Z', '+00:00'))
        trade.pnl_percent = close_data.pnl_percent
        trade.pnl_amount = close_data.pnl_amount
        trade.status = close_data.status
        trade.updated_at = datetime.now()
        
        db.commit()
        
        return {
            "success": True,
            "message": "Trade closed"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_trades(
    limit: int = 50,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Load all past trades for this user"""
    try:
        trades = db.query(Trade).filter(
            Trade.user_id == user_id,
            Trade.exit_time.isnot(None)
        ).order_by(Trade.exit_time.desc()).limit(limit).all()
        
        trades_list = []
        for trade in trades:
            trades_list.append({
                "id": trade.id,
                "symbol": trade.scrip,
                "entry": float(trade.entry_price),
                "exit": float(trade.exit_price) if trade.exit_price else None,
                "pnl": float(trade.pnl_percent) if trade.pnl_percent else 0,
                "reason": trade.status.replace("_", " ").title(),
                "time": trade.exit_time.isoformat() if trade.exit_time else None
            })
        
        return {
            "success": True,
            "trades": trades_list,
            "total": len(trades_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
