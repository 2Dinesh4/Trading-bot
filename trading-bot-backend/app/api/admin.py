from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.kyc import KYCDocument
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/kyc/pending")
async def get_pending_kyc(db: Session = Depends(get_db)):
    """Get all users with pending KYC"""
    
    users = db.query(User).filter(User.kyc_status == "submitted").all()
    
    result = []
    for user in users:
        documents = db.query(KYCDocument).filter(KYCDocument.user_id == user.id).all()
        result.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "kyc_submitted_at": user.kyc_submitted_at,
            "documents": [
                {
                    "id": doc.id,
                    "type": doc.document_type,
                    "number": doc.document_number,
                    "url": doc.document_url
                } for doc in documents
            ]
        })
    
    return {
        "success": True,
        "count": len(result),
        "users": result
    }


@router.post("/kyc/approve/{user_id}")
async def approve_kyc(user_id: int, admin_id: int, db: Session = Depends(get_db)):
    """Approve user KYC"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user KYC status
    user.kyc_status = "approved"
    user.kyc_approved_at = datetime.utcnow()
    user.kyc_rejected_reason = None
    
    # Mark all documents as verified
    documents = db.query(KYCDocument).filter(KYCDocument.user_id == user_id).all()
    for doc in documents:
        doc.is_verified = True
        doc.verified_at = datetime.utcnow()
        doc.verified_by = admin_id
    
    db.commit()
    
    return {
        "success": True,
        "message": f"KYC approved for user {user.name}",
        "user_id": user_id,
        "kyc_status": "approved"
    }


@router.post("/kyc/reject/{user_id}")
async def reject_kyc(
    user_id: int,
    reason: str,
    db: Session = Depends(get_db)
):
    """Reject user KYC"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user KYC status
    user.kyc_status = "rejected"
    user.kyc_rejected_reason = reason
    user.kyc_approved_at = None
    
    db.commit()
    
    return {
        "success": True,
        "message": f"KYC rejected for user {user.name}",
        "user_id": user_id,
        "kyc_status": "rejected",
        "reason": reason
    }


@router.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users (admin view)"""
    
    users = db.query(User).all()
    
    return {
        "success": True,
        "count": len(users),
        "users": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "kyc_status": user.kyc_status,
                "is_active": user.is_active,
                "created_at": user.created_at
            } for user in users
        ]
    }
