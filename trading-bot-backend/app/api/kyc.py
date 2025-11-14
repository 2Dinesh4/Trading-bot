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

UPLOAD_DIR = Path("app/uploads/kyc")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.post("/upload", response_model=KYCDocumentResponse)
async def upload_kyc_document(
    document_type: str = Form(...),
    document_number: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    valid_types = ["aadhar", "pan", "passport", "driving_license"]
    if document_type.lower() not in valid_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}")
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"user_{user_id}_{document_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    kyc_doc = KYCDocument(
        user_id=user_id,
        document_type=document_type.lower(),
        document_number=document_number,
        document_url=str(file_path),
        is_verified=False
    )
    db.add(kyc_doc)
    user.kyc_status = "submitted"
    user.kyc_submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(kyc_doc)
    return kyc_doc

@router.get("/status/{user_id}", response_model=KYCStatusResponse)
async def get_kyc_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "kyc_status": user.kyc_status,
        "kyc_submitted_at": user.kyc_submitted_at,
        "kyc_approved_at": user.kyc_approved_at,
        "kyc_rejected_reason": user.kyc_rejected_reason
    }

@router.get("/documents/{user_id}")
async def get_user_documents(user_id: int, db: Session = Depends(get_db)):
    documents = db.query(KYCDocument).filter(KYCDocument.user_id == user_id).all()
    return {
        "success": True,
        "count": len(documents),
        "documents": documents
    }
