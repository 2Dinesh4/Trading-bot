from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.kyc import KYCDocument
from app.schemas.kyc import KYCDocumentResponse, KYCStatusResponse
from app.utils.jwt_handler import decode_token
from datetime import datetime
import os
import shutil
from pathlib import Path

router = APIRouter(prefix="/api/kyc", tags=["KYC"])

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path("app/uploads/kyc")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_current_user_id(authorization: str = Header(None)):
    """Extract user ID from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token"
            )
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid or expired token"
        )


@router.post("/upload", response_model=KYCDocumentResponse)
async def upload_kyc_document(
    document_type: str = Form(...),
    document_number: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Upload KYC document for user verification"""
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    
    # Validate document type
    valid_types = ["aadhar", "pan", "passport", "driving_license"]
    if document_type.lower() not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Create unique filename
    filename = f"user_{user_id}_{document_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"✅ File saved successfully: {file_path}")
    except Exception as e:
        print(f"❌ File save error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Save to database
    try:
        kyc_doc = KYCDocument(
            user_id=user_id,
            document_type=document_type.lower(),
            document_number=document_number,
            document_url=str(file_path),
            is_verified=False,
            uploaded_at=datetime.utcnow()
        )
        db.add(kyc_doc)
        
        # Update user KYC status
        user.kyc_status = "submitted"
        user.kyc_submitted_at = datetime.utcnow()
        
        db.commit()
        db.refresh(kyc_doc)
        
        print(f"✅ KYC document saved to database: ID {kyc_doc.id}")
        
        return kyc_doc
        
    except Exception as e:
        db.rollback()
        print(f"❌ Database error: {str(e)}")
        
        # Delete file if database insert fails
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Deleted file due to database error")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Database error: {str(e)}"
        )


@router.get("/status/{user_id}", response_model=KYCStatusResponse)
async def get_kyc_status(
    user_id: int, 
    db: Session = Depends(get_db)
):
    """Get KYC verification status for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    
    return {
        "kyc_status": user.kyc_status,
        "kyc_submitted_at": user.kyc_submitted_at,
        "kyc_approved_at": user.kyc_approved_at,
        "kyc_rejected_reason": user.kyc_rejected_reason
    }


@router.get("/documents/{user_id}")
async def get_user_documents(
    user_id: int, 
    db: Session = Depends(get_db)
):
    """Get all KYC documents uploaded by a user"""
    documents = db.query(KYCDocument).filter(
        KYCDocument.user_id == user_id
    ).order_by(KYCDocument.uploaded_at.desc()).all()
    
    return {
        "success": True,
        "count": len(documents),
        "documents": documents
    }


@router.delete("/document/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Delete a KYC document (only if not verified)"""
    document = db.query(KYCDocument).filter(
        KYCDocument.id == document_id,
        KYCDocument.user_id == user_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete verified document"
        )
    
    # Delete file from disk
    try:
        if os.path.exists(document.document_url):
            os.remove(document.document_url)
    except Exception as e:
        print(f"Warning: Failed to delete file: {e}")
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    return {
        "success": True,
        "message": "Document deleted successfully"
    }
