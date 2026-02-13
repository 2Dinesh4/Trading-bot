from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.wallet import Wallet  # Make sure this import exists
from app.schemas.user import UserCreate, UserLogin
from app.utils.password import hash_password, verify_password
from app.utils.jwt_handler import create_access_token
from app.services.email_service import email_service
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import re
import random
import string
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

STRICT_EMAIL_REGEX = r"^[a-zA-Z][\w\.-]{3,}@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$"
GOOGLE_CLIENT_ID = "123918068153-lp753gducn2ogetdjsbpdc27sp5cludt.apps.googleusercontent.com"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class GoogleLoginRequest(BaseModel):
    token: str

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
            existing_user.name = user_data.name
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
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone if user_data.phone else "",
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
            "name": user.name,
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
            "name": user.name,
            "kyc_status": user.kyc_status,
            "is_admin": user.is_admin,
            "wallet_balance": user.wallet.balance if user.wallet else 0.0
        }
    }

@router.post("/google")
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Google Sign-In Endpoint"""
    try:
        # Verify the Google token
        id_info = id_token.verify_oauth2_token(
            data.token,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID
        )
        
        email = id_info['email']
        name = id_info.get('name', '')
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create user automatically (Active by default for Google)
            user = User(
                email=email,
                name=name,
                hashed_password=hash_password(email),  # Dummy password for Google users
                kyc_status="pending",
                is_active=True,  # Auto-activate Google users
                provider="google"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create Wallet for new Google user
            new_wallet = Wallet(user_id=user.id, balance=0.00)
            db.add(new_wallet)
            db.commit()
        
        # Create access token
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
                "wallet_balance": user.wallet.balance if user.wallet else 0.0
            }
        }
    except ValueError as e:
        print(f"❌ Google Token Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google Token")
    except Exception as e:
        print(f"❌ Google Login Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")
