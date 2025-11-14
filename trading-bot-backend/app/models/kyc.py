from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class KYCDocument(Base):
    """KYC documents for user verification"""
    __tablename__ = "kyc_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Document details
    document_type = Column(String, nullable=False)  # aadhar, pan, passport, driving_license
    document_number = Column(String, nullable=False)
    document_url = Column(String, nullable=False)  # File path or URL
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, nullable=True)  # Admin user ID
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="kyc_documents")
