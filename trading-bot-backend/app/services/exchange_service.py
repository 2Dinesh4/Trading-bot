"""
Multi-Exchange Service - PRODUCTION MODE
⚠️ WARNING: REAL MONEY TRADING LOGIC ENABLED ⚠️
"""

import os
import logging
import time
from typing import Dict
from datetime import datetime
from dotenv import load_dotenv

# ✅ CRITICAL IMPORTS
from binance.client import Client as BinanceClient
from binance.exceptions import BinanceAPIException
import upstox_client
from upstox_client.rest import ApiException

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ExchangeService:
    def __init__(self):
        """Initialize exchanges"""
        
        print("\n" + "="*70)
        print("🚨 INITIALIZING EXCHANGE SERVICE: PRODUCTION MODE 🚨")
        print("="*70)
        
        self.binance_client = None  # For Data (Real)
        self.trading_client = None  # For Orders (Real)
        self.upstox_market_api = None
        
        # 1. Initialize REAL Binance Client (For Data & Trading)
        self._init_binance_data()
        
        # 2. Initialize TRADING Client Logic
        self._init_binance_trading()
        
        # 3. Initialize Upstox
        self._init_upstox()
        
        # Supported stocks
        self.supported_stocks = [
            'RELIANCE', 'TCS', 'INFY', 'HDFCBANK',
            'ICICIBANK', 'SBIN', 'ITC', 'BHARTIARTL'
        ]
        
        print("="*70 + "\n")

    def _init_binance_data(self):
        """Initialize the connection for fetching REAL market data"""
        print(f"\n📋 Binance Data Config (The 'Eyes'):")
        try:
            # Check for keys in .env
            api_key = os.getenv("BINANCE_API_KEY")
            api_secret = os.getenv("BINANCE_API_SECRET")
            
            # Force Real Data Mode
            testnet = os.getenv("BINANCE_TESTNET", "false").lower() == "true"
            
            if testnet:
                print("⚠️  WARNING: BINANCE_TESTNET is TRUE (Using Testnet Data)")
            else:
                print("🔴  PRODUCTION: Using REAL Market Data")

            if not api_key or not api_secret:
                print(f"   ❌ Binance API credentials missing in .env")
                self.binance_client = None
            else:
                self.binance_client = BinanceClient(
                    api_key=api_key,
                    api_secret=api_secret,
                    testnet=testnet,
                    requests_params={'timeout': 10}
                )
                
                # Sync timestamp
                try:
                    server_time = self.binance_client.get_server_time()
                    local_time = int(time.time() * 1000)
                    time_offset = server_time['serverTime'] - local_time
                    self.binance_client.timestamp_offset = time_offset
                    print(f"   ⏰ Time sync: offset = {time_offset}ms")
                except Exception as sync_err:
                    print(f"   ⚠️ Couldn't sync timestamp: {sync_err}")
                
                # Test connection
                status = self.binance_client.get_account()
                print(f"✅ Binance Connected Successfully")
                print(f"   Can Trade: {status.get('canTrade', False)} (Required for Real Trading)")
                
        except Exception as e:
            print(f"❌ Binance Data Connection Error: {str(e)}")
            self.binance_client = None

    def _init_binance_trading(self):
        """Initialize the connection for PLACING ORDERS (The 'Hands')"""
        print(f"\n📋 Binance Trading Config (The 'Hands'):")
        
        use_testnet_orders = os.getenv("USE_TESTNET_FOR_ORDERS", "false").lower() == "true"
        
        if use_testnet_orders:
            print("⚠️  Hybrid Mode: Using TESTNET Keys for Orders")
            test_key = os.getenv("BINANCE_TESTNET_KEY")
            test_secret = os.getenv("BINANCE_TESTNET_SECRET")
            
            if test_key and test_secret and "PLACEHOLDER" not in test_key:
                try:
                    self.trading_client = BinanceClient(test_key, test_secret, testnet=True)
                    print("✅ Trading Client: Connected to TESTNET")
                except Exception as e:
                    print(f"❌ Testnet Connection Failed: {e}")
            else:
                print("❌ Testnet Keys Missing. Trading Disabled.")
                self.trading_client = None
        else:
            # 🔴 REAL MONEY MODE
            print("🔴  Trading Mode: REAL MONEY (Using Main Keys)")
            if self.binance_client:
                self.trading_client = self.binance_client
                print("✅ Trading Client: Linked to Real Account")
            else:
                print("❌ Main Client not connected. Trading Disabled.")
                self.trading_client = None

    def _init_upstox(self):
        """Initialize Upstox"""
        self.upstox_access_token = os.getenv("UPSTOX_ACCESS_TOKEN")
        self.upstox_api_key = os.getenv("UPSTOX_API_KEY")
        
        print(f"\n📋 Upstox Config:")
        if self.upstox_access_token and self.upstox_api_key:
            try:
                configuration = upstox_client.Configuration()
                configuration.api_key['authorization'] = self.upstox_access_token
                configuration.api_key_prefix['authorization'] = 'Bearer'
                api_client = upstox_client.ApiClient(configuration)
                self.upstox_market_api = upstox_client.MarketQuoteApi(api_client)
                print(f"✅ Upstox: Initialized Successfully")
            except Exception as e:
                print(f"⚠️ Upstox: Init Error - {str(e)}")
        else:
            print(f"⚠️ Upstox: Credentials missing!")

    def detect_exchange(self, symbol: str) -> str:
        symbol_upper = symbol.upper()
        if any(x in symbol_upper for x in ['USDT', 'BTC', 'ETH', 'BNB', 'DOGE']):
            return 'BINANCE'
        if symbol_upper in self.supported_stocks:
            return 'UPSTOX'
        return 'BINANCE'
    
    def get_price(self, symbol: str) -> Dict:
        """Get price from appropriate exchange"""
        exchange = self.detect_exchange(symbol)
        try:
            if exchange == 'BINANCE':
                return self.get_binance_price(symbol)
            else:
                return self.get_upstox_price(symbol)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_binance_price(self, symbol: str) -> Dict:
        """Get REAL price from Binance API"""
        try:
            if not self.binance_client:
                return {"success": False, "error": "Binance Data not connected"}
            
            if not any(x in symbol.upper() for x in ['USDT', 'BNB', 'BUSD']):
                ticker_symbol = f"{symbol}USDT"
            else:
                ticker_symbol = symbol
            
            try:
                ticker = self.binance_client.get_symbol_ticker(symbol=ticker_symbol)
            except:
                ticker = self.binance_client.get_symbol_ticker(symbol=symbol)
            
            price = float(ticker['price'])
            
            return {
                "success": True,
                "symbol": symbol,
                "price": price,
                "exchange": "BINANCE",
                "type": "CRYPTO",
                "currency": "USDT",
                "timestamp": datetime.now().isoformat(),
                "is_real": True
            }
        except Exception as e:
            return {"success": False, "error": f"Binance API Error: {str(e)}"}
    
    def get_upstox_price(self, symbol: str) -> Dict:
        """Get REAL price from Upstox API v2"""
        try:
            symbol_upper = symbol.upper()
            if not self.upstox_market_api:
                return {"success": False, "error": "Upstox not configured"}
            
            try:
                api_response = self.upstox_market_api.ltp(symbol=[symbol_upper], api_version="v2")
                if hasattr(api_response, 'status') and api_response.status != 'success':
                    return {"success": False, "error": "Upstox API failed"}
                
                data_dict = api_response.data
                quote = data_dict.get(symbol_upper)
                if not quote:
                    return {"success": False, "error": f"No data for {symbol_upper}"}
                
                price = float(quote.last_price)
                return {
                    "success": True, "symbol": symbol, "price": price,
                    "exchange": "UPSTOX", "type": "STOCK", "market": "NSE",
                    "currency": "INR", "timestamp": datetime.now().isoformat(), "is_real": True
                }
            except Exception as e:
                 return {"success": False, "error": f"Upstox Lyp Error: {e}"}
        except Exception as e:
            return {"success": False, "error": f"Upstox Error: {str(e)}"}
    
    def place_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place order using the TRADING Client"""
        exchange = self.detect_exchange(symbol)
        if exchange == 'BINANCE':
            return self.place_binance_order(symbol, side, quantity)
        else:
            return self.place_upstox_order(symbol, side, quantity)
    
    def place_binance_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place Binance order"""
        try:
            # Check if Trading Client is connected
            if not self.trading_client:
                return {
                    "success": False, 
                    "error": "Trading Client not connected (Check Keys in .env)"
                }
            
            if not any(x in symbol.upper() for x in ['USDT', 'BNB', 'BUSD']):
                ticker_symbol = f"{symbol}USDT"
            else:
                ticker_symbol = symbol
            
            logger.info(f"🔴 PLACING REAL MONEY ORDER: {side} {quantity} {ticker_symbol}")

            # ------------------------------------------------------------------
            # ✅ REAL EXECUTION BLOCK (ACTIVATED)
            # ------------------------------------------------------------------
            try:
                order = self.trading_client.create_order(
                    symbol=ticker_symbol,
                    side=side.upper(),
                    type='MARKET',
                    quantity=quantity
                )
                
                logger.info(f"✅ ORDER FILLED! ID: {order['orderId']}")
                
                cummulative_quote = float(order['cummulativeQuoteQty'])
                executed_qty = float(order['executedQty'])
                avg_price = cummulative_quote / executed_qty if executed_qty > 0 else 0
                
                return {
                    "success": True,
                    "order_id": str(order['orderId']),
                    "symbol": symbol,
                    "side": side,
                    "quantity": executed_qty,
                    "price": avg_price,
                    "exchange": "BINANCE",
                    "status": "FILLED"
                }
            except BinanceAPIException as api_err:
                logger.error(f"❌ Binance Order Failed: {api_err.message}")
                return {"success": False, "error": f"Binance Error: {api_err.message}"}
            # ------------------------------------------------------------------
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def place_upstox_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place Upstox order (Simulated for now)"""
        return {
            "success": True,
            "order_id": f"UPSTOX_{symbol}_{int(time.time())}",
            "symbol": symbol,
            "side": side,
            "quantity": int(quantity),
            "price": 0,
            "exchange": "UPSTOX",
            "status": "PLACED_SIMULATION"
        }

# ✅ INITIALIZE SERVICE
exchange_service = ExchangeService()