from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.utils.jwt_handler import decode_token
from decimal import Decimal

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])
security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Extract user_id from JWT token"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except Exception as e:
        print(f"❌ Token decode error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.get("/balance")
async def get_wallet_balance(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get user's wallet balance"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"✅ Wallet balance for user {user_id}: ${user.wallet_balance}")
    
    return {
        "success": True,
        "balance": float(user.wallet_balance),
        "currency": "USDT"
    }

@router.get("/transactions")
async def get_wallet_transactions(
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get wallet transaction history"""
    transactions = db.query(WalletTransaction).filter(
        WalletTransaction.user_id == user_id
    ).order_by(WalletTransaction.created_at.desc()).limit(limit).all()
    
    return {
        "success": True,
        "transactions": [
            {
                "id": t.id,
                "type": t.transaction_type,
                "amount": float(t.amount),
                "balance_after": float(t.balance_after),
                "description": t.description,
                "symbol": t.symbol,
                "created_at": t.created_at.isoformat()
            }
            for t in transactions
        ]
    }

@router.post("/add-funds")
async def add_fake_funds(
    amount: float,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Add fake funds for testing"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.wallet_balance += Decimal(str(amount))
    
    transaction = WalletTransaction(
        user_id=user_id,
        transaction_type="deposit",
        amount=Decimal(str(amount)),
        balance_after=user.wallet_balance,
        description=f"Test deposit of {amount} USDT"
    )
    db.add(transaction)
    db.commit()
    
    print(f"✅ Added {amount} USDT to user {user_id}. New balance: ${user.wallet_balance}")
    
    return {
        "success": True,
        "message": f"Added {amount} USDT to wallet",
        "new_balance": float(user.wallet_balance)
    }
