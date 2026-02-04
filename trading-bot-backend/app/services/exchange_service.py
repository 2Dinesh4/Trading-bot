from binance.client import Client
import logging
import os
import requests  # ✅ Added for public API fallback
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.models.api_keys import UserAPIKey
from datetime import datetime
from app.utils.encryption import decrypt_string

load_dotenv()
logger = logging.getLogger(__name__)

class ExchangeService:
    def __init__(self):
        # Admin Keys (Fallback/System usage)
        self.admin_key = os.getenv("BINANCE_API_KEY")
        self.admin_secret = os.getenv("BINANCE_API_SECRET")
        self.testnet = os.getenv("BINANCE_TESTNET", "false").lower() == "true"
        self.binance_client = None 
        
        # Initialize Admin Client for public data fetching
        self.initialize_admin_client()

    def initialize_admin_client(self):
        """Init the global admin client for fetching generic price data"""
        if self.admin_key and self.admin_secret:
            try:
                self.binance_client = Client(self.admin_key, self.admin_secret, testnet=self.testnet)
                logger.info("✅ Exchange Service: Admin Client Initialized (For Data)")
            except Exception as e:
                logger.error(f"❌ Failed to init Admin Client: {e}")

    def get_user_client(self, db: Session, user_id: int):
        """
        Creates a Binance Client specifically for the logged-in user
        using their stored API keys.
        """
        keys = db.query(UserAPIKey).filter(
            UserAPIKey.user_id == user_id, 
            UserAPIKey.exchange == 'binance',
            UserAPIKey.is_active == True
        ).first()

        if not keys:
            return None 

        try:
            api_key = decrypt_string(keys.api_key_encrypted)
            api_secret = decrypt_string(keys.api_secret_encrypted)
            client = Client(api_key, api_secret, testnet=self.testnet)
            return client
        except Exception as e:
            logger.error(f"❌ Could not create client for user {user_id}: {e}")
            return None

    def get_price(self, symbol: str):
        """Get live price (Public data) - Tries Admin Client first, then Public API"""
        
        # Ensure symbol format
        if "USDT" not in symbol.upper():
            symbol = f"{symbol.upper()}USDT"

        # 1. Try Internal Client (Fastest)
        if self.binance_client:
            try:
                ticker = self.binance_client.get_symbol_ticker(symbol=symbol)
                return {
                    "success": True, 
                    "price": float(ticker['price']),
                    "symbol": symbol,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception:
                pass # If this fails, drop through to fallback

        # 2. Fallback: Direct Public API Request (No keys needed)
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
            response = requests.get(url, timeout=5)
            data = response.json()
            
            if "price" in data:
                return {
                    "success": True, 
                    "price": float(data['price']),
                    "symbol": symbol,
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Price Fetch Failed: {e}")
            
        return {"success": False, "error": "Could not fetch price"}

    def place_order(self, db: Session, user_id: int, symbol: str, side: str, quantity: float):
        """Execute Real Order for Specific User"""
        
        client = self.get_user_client(db, user_id)
        if not client:
            return {"success": False, "error": "Please link your Binance Account first!"}

        if "USDT" not in symbol.upper():
            symbol = f"{symbol.upper()}USDT"

        try:
            logger.info(f"👤 User {user_id} placing {side} order for {symbol}")
            order = client.create_order(
                symbol=symbol,
                side=side.upper(),
                type='MARKET',
                quantity=quantity
            )
            
            fill_price = float(order['fills'][0]['price']) if order.get('fills') else 0.0
            
            return {
                "success": True, 
                "price": fill_price, 
                "order_id": order['orderId'],
                "status": "FILLED"
            }
        except Exception as e:
            logger.error(f"Order Failed for User {user_id}: {e}")
            return {"success": False, "error": str(e)}

exchange_service = ExchangeService()