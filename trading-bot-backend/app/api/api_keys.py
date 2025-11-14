from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.api_keys import UserAPIKey
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse, APIKeyUpdate
from app.utils.encryption import encrypt_string, decrypt_string
from datetime import datetime

router = APIRouter(prefix="/api/keys", tags=["API Keys"])


@router.post("/", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    user_id: int,
    key_data: APIKeyCreate,
    db: Session = Depends(get_db)
):
    """Create new API key for user"""
    
    # Verify user exists and KYC is approved
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.kyc_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC must be approved before adding API keys"
        )
    
    # Encrypt sensitive data
    new_key = UserAPIKey(
        user_id=user_id,
        exchange=key_data.exchange.lower(),
        api_key_encrypted=encrypt_string(key_data.api_key),
        api_secret_encrypted=encrypt_string(key_data.api_secret) if key_data.api_secret else None,
        access_token_encrypted=encrypt_string(key_data.access_token) if key_data.access_token else None,
        key_name=key_data.key_name or f"{key_data.exchange} Key"
    )
    
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return new_key


@router.get("/{user_id}", response_model=list[APIKeyResponse])
async def get_user_api_keys(user_id: int, db: Session = Depends(get_db)):
    """Get all API keys for a user"""
    
    keys = db.query(UserAPIKey).filter(UserAPIKey.user_id == user_id).all()
    return keys


@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: int,
    update_data: APIKeyUpdate,
    db: Session = Depends(get_db)
):
    """Update API key"""
    
    key = db.query(UserAPIKey).filter(UserAPIKey.id == key_id).first()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    if update_data.key_name is not None:
        key.key_name = update_data.key_name
    
    if update_data.is_active is not None:
        key.is_active = update_data.is_active
    
    db.commit()
    db.refresh(key)
    
    return key


@router.delete("/{key_id}")
async def delete_api_key(key_id: int, db: Session = Depends(get_db)):
    """Delete API key"""
    
    key = db.query(UserAPIKey).filter(UserAPIKey.id == key_id).first()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(key)
    db.commit()
    
    return {"success": True, "message": "API key deleted"}
