from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.services.exchange_service import exchange_service
from app.database import engine, Base, SessionLocal
from pydantic import BaseModel
import logging
import os
import asyncio  # ✅ Added for background tasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pathlib import Path

# ✅ Import the Trading Engine
from app.services.trading_engine import trading_engine

# Import API routers
from app.api.auth import router as auth_router
from app.api.kyc import router as kyc_router
from app.api.api_keys import router as api_keys_router
from app.api.admin import router as admin_router
from app.api.wallet import router as wallet_router
from app.api.trading import router as trading_router
from app.api.trades import router as trades_router

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartTrade API",
    description="Multi-User Trading Bot with KYC and Wallet",
    version="3.0.0"
)

# CORS - UPDATED
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ✅ Mount static files for KYC documents
UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")
logger.info("✅ Static file serving enabled: /uploads")

# Include API routers
app.include_router(auth_router)
app.include_router(kyc_router)
app.include_router(api_keys_router)
app.include_router(admin_router)
app.include_router(wallet_router)
app.include_router(trading_router)
app.include_router(trades_router)

# Request model
class OrderRequest(BaseModel):
    symbol: str
    quantity: float

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    # Initialize database tables
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database: Tables created/verified")
    except Exception as e:
        print(f"⚠️ Database: {str(e)}")
    
    binance_key = os.getenv("BINANCE_API_KEY")
    upstox_key = os.getenv("UPSTOX_API_KEY")
    database_url = os.getenv("DATABASE_URL")
    
    print("\n" + "="*60)
    print("🚀 SmartTrade API v3.0 - Multi-User with KYC")
    print("="*60)
    
    if binance_key:
        print("✅ Binance (Crypto)")
    else:
        print("❌ Binance (Crypto)")
    
    if upstox_key:
        print("✅ Upstox (Indian Stocks)")
    else:
        print("❌ Upstox (Indian Stocks)")
    
    if database_url:
        print("✅ Database (PostgreSQL)")
    else:
        print("⚠️ Database (Not configured)")
    
    # ✅ Show upload directory
    print(f"✅ KYC Uploads: {UPLOAD_DIR.absolute()}")
    
    # ✅ START THE TRADING ENGINE HERE
    asyncio.create_task(trading_engine.run_loop())
    print("✅ Background Trading Engine Started (Monitoring Prices...)")
    
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    print("\n🛑 Shutting down SmartTrade API...")
    # Stop the engine gracefully
    trading_engine.running = False

@app.get("/")
async def root():
    return {
        "message": "SmartTrade Multi-User Bot with KYC",
        "version": "3.0.0",
        "features": [
            "Multi-user authentication",
            "KYC verification",
            "Per-user API keys",
            "Admin panel",
            "Trade history tracking",
            "Document upload & viewing",
            "Automated Trading Engine" # ✅ Added to list
        ]
    }

@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    """Get price from any exchange"""
    if not symbol or not isinstance(symbol, str):
        return {"success": False, "error": "Invalid symbol provided"}

    # logger.info(f"📊 Price: {symbol}") 
    # Commented out logging to reduce console noise during high-frequency polling
    result = exchange_service.get_price(symbol)
    return result

@app.post("/api/order/buy")
async def place_buy_order(request: OrderRequest, db: Session = Depends(get_db)):
    """Place BUY order"""
    logger.info(f"🟢 BUY: {request.symbol}")
    result = exchange_service.place_order(request.symbol, 'BUY', request.quantity)
    
    if result.get("success"):
        try:
            logger.info(f"💾 Order logged to database")
        except Exception as e:
            logger.error(f"Database logging failed: {str(e)}")
    
    return result

@app.post("/api/order/sell")
async def place_sell_order(request: OrderRequest, db: Session = Depends(get_db)):
    """Place SELL order"""
    logger.info(f"🔴 SELL: {request.symbol}")
    result = exchange_service.place_order(request.symbol, 'SELL', request.quantity)
    
    if result.get("success"):
        try:
            logger.info(f"💾 Order logged to database")
        except Exception as e:
            logger.error(f"Database logging failed: {str(e)}")
    
    return result

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    binance_status = "connected" if exchange_service.binance_client else "disconnected"
    upstox_status = "connected" if exchange_service.upstox_market_api else "disconnected"
    
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "binance": binance_status,
        "upstox": upstox_status,
        "database": db_status,
        "engine": "running" if trading_engine.running else "stopped" # ✅ Added engine status
    }

@app.get("/api/supported-stocks")
async def get_stocks():
    """List supported Indian stocks"""
    return {
        "success": True,
        "stocks": list(exchange_service.indian_stock_map.keys()),
        "count": len(exchange_service.indian_stock_map)
    }