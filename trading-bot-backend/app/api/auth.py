from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.utils.password import hash_password, verify_password
from app.utils.jwt_handler import create_access_token
from app.services.email_service import email_service
import re
import random
import string
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

STRICT_EMAIL_REGEX = r"^[a-zA-Z][\w\.-]{3,}@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Step 1: Register and Send OTP"""
    
    if not re.match(STRICT_EMAIL_REGEX, user_data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    
    if existing_user:
        if existing_user.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            otp = generate_otp()
            existing_user.hashed_password = hash_password(user_data.password)
            existing_user.name = user_data.name
            existing_user.otp_code = otp
            existing_user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
            db.commit()
            email_service.send_otp_email(user_data.email, otp)
            return {"message": "Account pending. Verification code resent to email."}

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone if user_data.phone else "",
        kyc_status="pending",
        wallet_balance=0.00,  # ✅ CHANGED: Start with 0.00 (Real Money Mode)
        is_active=False,
        otp_code=otp,
        otp_expires_at=otp_expiry
    )
    
    db.add(new_user)
    db.commit()
    
    email_service.send_otp_email(user_data.email, otp)
    
    return {
        "message": "Registration successful. Please check your email for the verification code.",
        "email": user_data.email
    }

@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Step 2: Verify OTP and Activate Account"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_active:
        return {"message": "Account already active. Please login."}

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    if user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    user.is_active = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    
    return {
        "message": "Email verified successfully!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "wallet_balance": float(user.wallet_balance)
        }
    }

@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(
            status_code=403, 
            detail="Account is not verified. Please verify your email."
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
            "wallet_balance": float(user.wallet_balance)
        }
    }