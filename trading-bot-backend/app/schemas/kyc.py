from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class KYCDocumentCreate(BaseModel):
    document_type: str  # aadhar, pan, passport
    document_number: str


class KYCDocumentResponse(BaseModel):
    id: int
    document_type: str
    document_number: str
    document_url: str
    is_verified: bool
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class KYCStatusResponse(BaseModel):
    kyc_status: str  # pending, approved, rejected
    kyc_submitted_at: Optional[datetime]
    kyc_approved_at: Optional[datetime]
    kyc_rejected_reason: Optional[str]
