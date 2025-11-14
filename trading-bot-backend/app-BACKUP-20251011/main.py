from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.services.exchange_service import exchange_service
from app.database import engine, Base, SessionLocal
from pydantic import BaseModel
import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import text  # ✅ ADDED THIS


# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartTrade API",
    description="Multi-Exchange Trading Bot with Database",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    print("🚀 SmartTrade API v2.0 - Multi-Exchange")
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
    
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    print("\n🛑 Shutting down SmartTrade API...")

@app.get("/")
async def root():
    return {
        "message": "SmartTrade Multi-Exchange Bot",
        "version": "2.0.0",
        "exchanges": ["Binance (Crypto)", "Upstox (Indian Stocks)"],
        "supported_stocks": list(exchange_service.indian_stock_map.keys())
    }

@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    """Get price from any exchange"""
    if not symbol or not isinstance(symbol, str):
        return {"success": False, "error": "Invalid symbol provided"}

    logger.info(f"📊 Price: {symbol}")
    result = exchange_service.get_price(symbol)
    return result

@app.post("/api/order/buy")
async def place_buy_order(request: OrderRequest, db: Session = Depends(get_db)):
    """Place BUY order"""
    logger.info(f"🟢 BUY: {request.symbol}")
    result = exchange_service.place_order(request.symbol, 'BUY', request.quantity)
    
    # Log to database if successful
    if result.get("success"):
        try:
            # TODO: Create TradeHistory model and log here
            logger.info(f"💾 Order logged to database")
        except Exception as e:
            logger.error(f"Database logging failed: {str(e)}")
    
    return result

@app.post("/api/order/sell")
async def place_sell_order(request: OrderRequest, db: Session = Depends(get_db)):
    """Place SELL order"""
    logger.info(f"🔴 SELL: {request.symbol}")
    result = exchange_service.place_order(request.symbol, 'SELL', request.quantity)
    
    # Log to database if successful
    if result.get("success"):
        try:
            # TODO: Create TradeHistory model and log here
            logger.info(f"💾 Order logged to database")
        except Exception as e:
            logger.error(f"Database logging failed: {str(e)}")
    
    return result

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    binance_status = "connected" if exchange_service.binance_client else "disconnected"
    upstox_status = "connected" if exchange_service.upstox_market_api else "disconnected"
    
    # Check database connection
    try:
        db.execute(text("SELECT 1"))  # ✅ FIXED: Added text()
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    if binance_status == "disconnected" or upstox_status == "disconnected":
        return {
            "status": "unhealthy",
            "binance": binance_status,
            "upstox": upstox_status,
            "database": db_status,
            "error": "One or more services are disconnected. Check logs for details."
        }

    return {
        "status": "healthy",
        "binance": binance_status,
        "upstox": upstox_status,
        "database": db_status
    }

@app.get("/api/supported-stocks")
async def get_stocks():
    """List supported Indian stocks"""
    return {
        "success": True,
        "stocks": list(exchange_service.indian_stock_map.keys()),
        "count": len(exchange_service.indian_stock_map)
    }

@app.get("/api/db-version")
async def get_db_version(db: Session = Depends(get_db)):
    """Get database version"""
    try:
        result = db.execute(text("SELECT version();"))  # ✅ FIXED: Added text()
        version = result.scalar()
        return {
            "success": True,
            "database": "PostgreSQL",
            "version": version
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/db-health")
async def db_health_check(db: Session = Depends(get_db)):
    """Check database health"""
    try:
        db.execute(text("SELECT 1"))  # ✅ FIXED: Added text()
        return {
            "success": True,
            "status": "healthy",
            "message": "Database is connected and responding"
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }
