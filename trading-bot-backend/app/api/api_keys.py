from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.api_keys import UserAPIKey
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse
from app.utils.encryption import encrypt_string, decrypt_string
from app.utils.jwt_handler import verify_token
from fastapi.security import OAuth2PasswordBearer
from binance.client import Client

router = APIRouter(prefix="/api/keys", tags=["API Keys"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------------------------------------------------------
# HELPER: Get User ID from Token
# ---------------------------------------------------------
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    """Extract user_id securely from the JWT token"""
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ✅ FIX: Get 'user_id' from token (auth.py saves it as 'user_id', not 'sub')
    user_id = payload.get("user_id")
    
    # Fallback for standard JWTs just in case
    if user_id is None:
        user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user_id",
        )
        
    return int(user_id)

# ---------------------------------------------------------
# HELPER: Test Keys & Get Balance
# ---------------------------------------------------------
def fetch_binance_balance(api_key: str, api_secret: str, testnet: bool = False):
    """Tries to connect to Binance and fetch USDT balance"""
    try:
        # 1. Connect
        client = Client(api_key, api_secret, testnet=testnet)
        
        # 2. Test Connection (This will fail if keys are bad)
        account = client.get_account()
        
        # 3. Find USDT
        balances = account.get('balances', [])
        for b in balances:
            if b['asset'] == 'USDT':
                return float(b['free'])
        return 0.0
    except Exception as e:
        print(f"❌ Key Validation Failed: {e}")
        return None

# ---------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------

@router.post("/", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id) # ✅ Fixed dependency used here
):
    """Create new API key - Validates & Syncs Balance Immediately"""
    
    # 1. Verify User exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. 🛡️ VALIDATE KEYS BEFORE SAVING (QA Defense)
    if key_data.exchange.lower() == "binance":
        print(f"🔍 Validating keys for User {user_id}...")
        real_balance = fetch_binance_balance(key_data.api_key, key_data.api_secret)
        
        if real_balance is None:
            raise HTTPException(
                status_code=400, 
                detail="❌ Invalid API Keys. Binance rejected the connection. Please check your keys."
            )
        
        # Keys are good! Update wallet immediately.
        user.wallet_balance = real_balance
        db.commit()
        print(f"💰 Initial Balance Sync: ${real_balance}")

    # 3. Check if key already exists for this exchange (Update instead of Create)
    existing_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == user_id,
        UserAPIKey.exchange == key_data.exchange.lower()
    ).first()

    encrypted_key = encrypt_string(key_data.api_key)
    encrypted_secret = encrypt_string(key_data.api_secret) if key_data.api_secret else None

    if existing_key:
        existing_key.api_key_encrypted = encrypted_key
        existing_key.api_secret_encrypted = encrypted_secret
        existing_key.is_active = True
        if key_data.key_name:
            existing_key.key_name = key_data.key_name
        db.commit()
        db.refresh(existing_key)
        return existing_key

    # 4. Create New Key
    new_key = UserAPIKey(
        user_id=user_id,
        exchange=key_data.exchange.lower(),
        api_key_encrypted=encrypted_key,
        api_secret_encrypted=encrypted_secret,
        key_name=key_data.key_name or f"{key_data.exchange} Key",
        is_active=True
    )
    
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return new_key

@router.get("/balance/{user_id_param}") 
async def get_real_balance(
    user_id_param: int, 
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Fetch LIVE balance using stored keys & Update DB"""
    
    # 1. Get User's Keys
    key_entry = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == user_id_param, 
        UserAPIKey.exchange == 'binance',
        UserAPIKey.is_active == True
    ).first()

    if not key_entry:
        return {"balance": 0.0, "linked": False, "message": "No Binance keys linked"}

    # 2. Decrypt Keys
    try:
        api_key = decrypt_string(key_entry.api_key_encrypted)
        api_secret = decrypt_string(key_entry.api_secret_encrypted)
    except Exception:
        return {"balance": 0.0, "linked": True, "error": "Decryption failed"}

    # 3. Fetch Real Balance
    real_balance = fetch_binance_balance(api_key, api_secret)
    
    if real_balance is None:
        return {"balance": 0.0, "linked": True, "error": "Binance Connection Failed (Invalid Keys?)"}

    # 4. Sync to DB
    user = db.query(User).filter(User.id == user_id_param).first()
    if user:
        user.wallet_balance = real_balance
        db.commit()

    return {"balance": real_balance, "linked": True}
# ... (Keep all previous code)

# --- UNLINK / DELETE KEY ENDPOINT ---
@router.delete("/{exchange}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    exchange: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Permanently removes API keys for a specific exchange"""
    
    # Find the key
    key_entry = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == user_id,
        UserAPIKey.exchange == exchange.lower()
    ).first()

    if not key_entry:
        raise HTTPException(status_code=404, detail="No linked account found to unlink.")

    # Delete it
    db.delete(key_entry)
    
    # Optional: Reset user wallet balance to 0.0 since they are unlinked
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.wallet_balance = 0.0
        
    db.commit()
    
    return None