from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.trading_service import trading_service
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt_handler import decode_token

router = APIRouter(prefix="/api/trading", tags=["Trading"])
security = HTTPBearer()

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

@router.post("/start")
async def start_trade(
    symbol: str = Body(...),
    amount: float = Body(...),
    entry_price: float = Body(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Start a new trade - deducts amount from wallet"""
    return trading_service.start_trade(db, user_id, symbol, amount, entry_price)

@router.post("/close")
async def close_trade(
    symbol: str = Body(...),
    initial_amount: float = Body(...),
    final_amount: float = Body(...),
    profit_loss: float = Body(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Close a trade - adds final amount back to wallet"""
    return trading_service.close_trade(db, user_id, symbol, initial_amount, final_amount, profit_loss)
