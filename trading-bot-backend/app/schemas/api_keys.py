from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class APIKeyCreate(BaseModel):
    exchange: str  # binance, upstox
    api_key: str
    api_secret: Optional[str] = None
    access_token: Optional[str] = None
    key_name: Optional[str] = None


class APIKeyResponse(BaseModel):
    id: int
    exchange: str
    key_name: Optional[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class APIKeyUpdate(BaseModel):
    key_name: Optional[str] = None
    is_active: Optional[bool] = None
