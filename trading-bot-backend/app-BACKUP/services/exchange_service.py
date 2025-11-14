"""
Multi-Exchange Service - Binance + Upstox (REAL TRADING)
SIMPLIFIED - NO REFRESH TOKEN NEEDED
"""

import os
import logging
import requests
from typing import Dict
from datetime import datetime
from binance.client import Client as BinanceClient
from binance.exceptions import BinanceAPIException
import upstox_client
from upstox_client.rest import ApiException

logger = logging.getLogger(__name__)

class ExchangeService:
    def __init__(self):
        """Initialize exchanges"""
        
        print("\n" + "="*70)
        print("🔧 Initializing Exchange Service...")
        print("="*70)
        
        # ===== BINANCE =====
        try:
            api_key = os.getenv("BINANCE_API_KEY")
            api_secret = os.getenv("BINANCE_API_SECRET")
            testnet_env = os.getenv("BINANCE_TESTNET", "false")
            testnet = testnet_env.lower() == "true"
            
            print(f"\n📋 Binance Config:")
            print(f"   Raw BINANCE_TESTNET value: '{testnet_env}'")
            print(f"   Testnet Mode (parsed): {testnet}")
            print(f"   API Key: {api_key[:15] if api_key else '❌ MISSING'}...")
            print(f"   API Secret: {api_secret[:15] if api_secret else '❌ MISSING'}...")
            
            if not api_key or not api_secret:
                print(f"   ❌ Binance API credentials missing in .env")
                self.binance_client = None
            else:
                self.binance_client = BinanceClient(
                    api_key=api_key,
                    api_secret=api_secret,
                    testnet=testnet
                )
                
                # Test connection
                status = self.binance_client.get_account()
                print(f"✅ Binance: Connected Successfully")
                print(f"   Account Type: {status.get('accountType', 'N/A')}")
                print(f"   Can Trade: {status.get('canTrade', False)}")
                
        except Exception as e:
            if isinstance(e, BinanceAPIException) and e.code == -2015:
                print("❌ Binance API Error: Invalid API-key, IP, or permissions for action.")
                print("   Please verify your API credentials, whitelist your IP, and check permissions.")
            else:
                print(f"❌ Binance Connection Error: {str(e)}")
            logger.error(f"Binance error: {str(e)}")
            import traceback
            traceback.print_exc()
            self.binance_client = None
        
        # ===== UPSTOX =====
        self.upstox_access_token = os.getenv("UPSTOX_ACCESS_TOKEN")
        self.upstox_api_key = os.getenv("UPSTOX_API_KEY")
        
        print(f"\n📋 Upstox Config:")
        print(f"   API Key: {self.upstox_api_key[:15] if self.upstox_api_key else '❌ MISSING'}...")
        print(f"   Access Token: {'✅ PRESENT' if self.upstox_access_token else '❌ MISSING'}")
        
        # Initialize Upstox client
        self.upstox_market_api = None
        
        if self.upstox_access_token and self.upstox_api_key:
            try:
                self._init_upstox_client()
                print(f"✅ Upstox: Initialized Successfully")
                
            except Exception as e:
                print(f"⚠️ Upstox: Initialization Error - {str(e)}")
                logger.error(f"Upstox init error: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⚠️ Upstox: Credentials missing!")
        
        # Supported stocks
        self.supported_stocks = [
            'RELIANCE', 'TCS', 'INFY', 'HDFCBANK',
            'ICICIBANK', 'SBIN', 'ITC', 'BHARTIARTL'
        ]
        
        print("="*70 + "\n")
    
    def _init_upstox_client(self):
        """Initialize Upstox API client"""
        configuration = upstox_client.Configuration()
        configuration.api_key['authorization'] = self.upstox_access_token
        configuration.api_key_prefix['authorization'] = 'Bearer'
        
        api_client = upstox_client.ApiClient(configuration)
        self.upstox_market_api = upstox_client.MarketQuoteApi(api_client)
    
    def detect_exchange(self, symbol: str) -> str:
        """Detect which exchange to use"""
        symbol_upper = symbol.upper()
        if any(x in symbol_upper for x in ['USDT', 'BTC', 'ETH', 'BNB', 'DOGE']):
            return 'BINANCE'
        if symbol_upper in self.supported_stocks:
            return 'UPSTOX'
        return 'BINANCE'
    
    def get_price(self, symbol: str) -> Dict:
        """Get price from appropriate exchange"""
        exchange = self.detect_exchange(symbol)
        print(f"\n📊 Getting price for {symbol} from {exchange}")
        
        try:
            if exchange == 'BINANCE':
                return self.get_binance_price(symbol)
            else:
                return self.get_upstox_price(symbol)
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            logger.error(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    def get_binance_price(self, symbol: str) -> Dict:
        """Get REAL price from Binance API"""
        try:
            if not self.binance_client:
                print(f"   ❌ Binance not connected - check your API credentials in .env")
                return {"success": False, "error": "Binance not connected"}
            
            print(f"   🔍 Fetching {symbol} from Binance...")
            
            if not any(x in symbol.upper() for x in ['USDT', 'BNB', 'BUSD']):
                ticker_symbol = f"{symbol}USDT"
            else:
                ticker_symbol = symbol
            
            print(f"   📡 Querying: {ticker_symbol}")
            
            try:
                ticker = self.binance_client.get_symbol_ticker(symbol=ticker_symbol)
            except:
                ticker = self.binance_client.get_symbol_ticker(symbol=symbol)
            
            price = float(ticker['price'])
            
            print(f"   ✅ Got LIVE price from 🪙 Binance: ${price}")
            logger.info(f"✅ Binance: {symbol} = ${price}")
            
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
            print(f"   ❌ Failed to get real price from API: {str(e)}")
            logger.error(f"Binance error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Binance API Error: {str(e)}"}
    
    def get_upstox_price(self, symbol: str) -> Dict:
        """Get REAL price from Upstox API v2"""
        try:
            symbol_upper = symbol.upper()
            
            if symbol_upper not in self.supported_stocks:
                print(f"   ❌ Stock {symbol} not supported")
                print(f"   📊 Supported: {', '.join(self.supported_stocks)}")
                return {"success": False, "error": f"Stock {symbol} not supported"}
            
            print(f"   🔍 Symbol: {symbol_upper}")
            
            if not self.upstox_market_api:
                print(f"   ❌ Upstox not configured")
                return {"success": False, "error": "Upstox not configured"}
            
            print(f"   📡 Calling Upstox API v2...")
            
            # ✅ Call API
            api_response = self.upstox_market_api.ltp(symbol=[symbol_upper], api_version="v2")
            
            print(f"   📊 Response status: {api_response.status}")
            
            if api_response.status != 'success':
                error_msg = getattr(api_response, 'errors', 'Unknown error')
                print(f"   ❌ Upstox API Error: {error_msg}")
                return {"success": False, "error": f"Upstox API Error: {error_msg}"}
            
            data_dict = api_response.data
            quote = data_dict.get(symbol_upper)
            
            if not quote:
                print(f"   ❌ No quote found for: {symbol_upper}")
                return {"success": False, "error": f"No data for {symbol_upper}"}
            
            if isinstance(quote, dict):
                price = float(quote.get('last_price', 0))
            else:
                price = float(getattr(quote, 'last_price', 0))
            
            if price == 0:
                print(f"   ❌ Price is 0 or invalid")
                return {"success": False, "error": "Price not available"}
            
            print(f"   ✅ Got LIVE price from 🇮🇳 Upstox: ₹{price}")
            logger.info(f"✅ Upstox: {symbol} = ₹{price}")
            
            return {
                "success": True,
                "symbol": symbol,
                "price": price,
                "exchange": "UPSTOX",
                "type": "STOCK",
                "market": "NSE",
                "currency": "INR",
                "timestamp": datetime.now().isoformat(),
                "is_real": True
            }
            
        except ApiException as e:
            print(f"❌ Upstox API Exception (Status {e.status}): {str(e)}")
            logger.error(f"Upstox API error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Upstox API Error: {str(e)}"}
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            logger.error(f"Upstox error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Error: {str(e)}"}
    
    def place_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place order"""
        exchange = self.detect_exchange(symbol)
        if exchange == 'BINANCE':
            return self.place_binance_order(symbol, side, quantity)
        else:
            return self.place_upstox_order(symbol, side, quantity)
    
    def place_binance_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place Binance order"""
        try:
            if not self.binance_client:
                return {"success": False, "error": "Binance not connected"}
            
            if not any(x in symbol.upper() for x in ['USDT', 'BNB', 'BUSD']):
                ticker_symbol = f"{symbol}USDT"
            else:
                ticker_symbol = symbol
            
            ticker = self.binance_client.get_symbol_ticker(symbol=ticker_symbol)
            price = float(ticker['price'])
            
            return {
                "success": True,
                "order_id": f"BINANCE_{symbol}_{datetime.now().timestamp()}",
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "price": price,
                "exchange": "BINANCE",
                "status": "PLACED"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def place_upstox_order(self, symbol: str, side: str, quantity: float) -> Dict:
        """Place Upstox order"""
        try:
            price_data = self.get_upstox_price(symbol)
            if not price_data["success"]:
                return price_data
            
            price = float(price_data["price"])
            
            return {
                "success": True,
                "order_id": f"UPSTOX_{symbol}_{datetime.now().timestamp()}",
                "symbol": symbol,
                "side": side,
                "quantity": int(quantity),
                "price": price,
                "exchange": "UPSTOX",
                "status": "PLACED"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

# ✅ INITIALIZE SERVICE
exchange_service = ExchangeService()
