from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.utils.password import hash_password, verify_password
from app.utils.jwt_handler import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with default wallet balance"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )
    
    password = user_data.password[:72] if len(user_data.password) > 72 else user_data.password
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(password),
        phone=user_data.phone if user_data.phone else "",
        kyc_status="pending",
        wallet_balance=10000.00  # Default 10,000 USDT for new users
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token with user details including wallet balance"""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid credentials"
        )
    
    password = credentials.password[:72] if len(credentials.password) > 72 else credentials.password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account is deactivated"
        )
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "kyc_status": user.kyc_status,
            "is_admin": user.is_admin,
            "wallet_balance": float(user.wallet_balance)  # NEW - wallet balance included
        }
    }
