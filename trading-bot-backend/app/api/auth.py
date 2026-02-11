from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.wallet import Wallet  # Make sure this import exists
from app.schemas.user import UserCreate, UserLogin
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
    
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)

    if existing_user:
        if existing_user.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # Resend OTP to pending account
            existing_user.hashed_password = hash_password(user_data.password)
            existing_user.full_name = user_data.name # Fixed field name
            existing_user.otp_code = otp
            existing_user.otp_expires_at = otp_expiry
            db.commit()
            # Try to send email, pass if fails (for dev environment)
            try:
                email_service.send_otp_email(user_data.email, otp)
            except:
                print(f"DEV MODE: OTP for {user_data.email} is {otp}")
            return {"message": "Account pending. Verification code resent to email."}

    # Create New User
    new_user = User(
        email=user_data.email,
        full_name=user_data.name, # Fixed field name
        hashed_password=hash_password(user_data.password),
        phone_number=user_data.phone if user_data.phone else "", # Fixed field name
        kyc_status="pending",
        is_active=False,
        otp_code=otp,
        otp_expires_at=otp_expiry
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Wallet for User
    new_wallet = Wallet(user_id=new_user.id, balance=0.00)
    db.add(new_wallet)
    db.commit()
    
    try:
        email_service.send_otp_email(user_data.email, otp)
    except:
        print(f"DEV MODE: OTP for {user_data.email} is {otp}")
    
    return {
        "message": "Registration successful. Please check your email for the verification code.",
        "email": user_data.email
    }

@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Step 2: Strict OTP Verification"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_active:
        return {"message": "Account already active. Please login."}

    input_otp = data.otp.strip()
    stored_otp = user.otp_code.strip() if user.otp_code else ""

    if stored_otp != input_otp:
        raise HTTPException(status_code=400, detail="❌ Invalid OTP code")

    if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="⏰ OTP expired. Please request a new one.")

    # ✅ Activate User
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
            "name": user.full_name,
            "wallet_balance": user.wallet.balance if user.wallet else 0.0
        }
    }

@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 🛑 BLOCK IF NOT VERIFIED
    if not user.is_active:
        raise HTTPException(
            status_code=403, 
            detail="Account is not verified" 
        )
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "kyc_status": user.kyc_status,
            "is_admin": user.is_admin,
            "wallet_balance": user.wallet.balance if user.wallet else 0.0
        }
    }