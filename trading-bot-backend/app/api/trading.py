from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User  # ✅ Need User model to check P&L
from app.services.trading_service import trading_service
from app.services.trading_engine import trading_engine  # ✅ Import Engine
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
            # Fallback for some JWT shapes
            user_id = payload.get("sub")
            
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return int(user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")

@router.post("/start")
async def start_trade(
    symbol: str = Body(...),
    amount: float = Body(...),
    entry_price: float = Body(...),
    max_risk: float = Body(50.0), # ✅ BUG-006: Accept Max Loss Limit (Default $50)
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Start a new trade - ENFORCES DAILY LOSS LIMIT"""
    
    # 1. Fetch User to check Risk Status
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. ✅ BUG-006 FIX: Check Daily Loss
    # If daily_pnl is negative (loss) and exceeds the max_risk threshold
    if user.daily_pnl and user.daily_pnl <= (max_risk * -1):
        raise HTTPException(
            status_code=400, 
            detail=f"🚫 TRADING BLOCKED: Daily Loss Limit of ${max_risk} hit. Current P&L: ${user.daily_pnl}"
        )

    # 3. Proceed if safe
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

# ---------------------------------------------------------------
# ✅ BUG-001 FIX: EMERGENCY STOP ENDPOINT
# ---------------------------------------------------------------
@router.post("/emergency-stop") # ✅ Renamed to match Frontend Fetch
async def emergency_stop(
    user_id: int = Depends(get_current_user_id)
):
    """Triggers the Emergency Stop Logic"""
    print(f"🚨 USER {user_id} TRIGGERED EMERGENCY STOP")
    result = await trading_engine.trigger_emergency_stop()
    return result