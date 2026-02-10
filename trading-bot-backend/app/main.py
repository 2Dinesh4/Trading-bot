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
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import text
from pathlib import Path

# --- CRITICAL: Import ALL Models here so Base knows to create their tables ---
from app.models.user import User
from app.models.trade import Trade
from app.models.wallet import Wallet
from app.models.api_keys import APIKey
from app.models.kyc import KYC
# ---------------------------------------------------------------------------

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
    version="3.1.0"
)

# CORS - Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Static files
UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

# Include API routers
app.include_router(auth_router)
app.include_router(kyc_router)
app.include_router(api_keys_router)
app.include_router(admin_router)
app.include_router(wallet_router)
app.include_router(trading_router)
app.include_router(trades_router)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Price Endpoint
@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    """Get price from any exchange (Public Endpoint)"""
    if not symbol:
        return {"success": False, "error": "Invalid symbol"}
    
    # Use exchange service to fetch price
    return exchange_service.get_price(symbol)

# ✅ STARTUP EVENT: Creates Tables & Starts Engine
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("🚀 STARTING SMARTTRADE API v3.1")
    print("="*60)

    # 1. Create Database Tables
    try:
        # This will create Users, Trades, Wallets, etc. if they don't exist
        Base.metadata.create_all(bind=engine)
        print("✅ Database: Tables checked & created successfully.")
    except Exception as e:
        print(f"⚠️ Database Error: {str(e)}")
        print("   (If using Docker, ensure the DB container is running)")

    # 2. Start Trading Engine
    asyncio.create_task(trading_engine.run_loop())
    print("✅ Trading Engine: Background loop started.")
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    print("\n🛑 Shutting down SmartTrade API...")
    trading_engine.running = False

@app.get("/")
async def root():
    return {
        "message": "SmartTrade Platform Active",
        "version": "3.1.0",
        "mode": "Multi-User BYOK",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Simple query to check DB connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "database": db_status,
        "engine": "running" if trading_engine.running else "stopped"
    }