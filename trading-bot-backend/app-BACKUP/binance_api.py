from binance.client import Client
from binance.enums import *
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class BinanceAPI:
    """Binance API integration for trading operations"""
    
    def __init__(self):
        """Initialize Binance client with API credentials"""
        api_key = os.getenv('BINANCE_API_KEY')
        api_secret = os.getenv('BINANCE_SECRET_KEY')
        testnet = os.getenv('BINANCE_TESTNET', 'true').lower() == 'true'
        
        if not api_key or not api_secret:
            raise ValueError("Binance API credentials not found in .env file")
        
        try:
            if testnet:
                # Testnet for testing with fake money
                self.client = Client(api_key, api_secret, testnet=True)
                print("🧪 Connected to Binance TESTNET (Fake Money)")
            else:
                # Real trading - BE CAREFUL!
                self.client = Client(api_key, api_secret)
                print("💰 Connected to Binance REAL TRADING")
                print("⚠️  WARNING: Using REAL money!")
        except Exception as e:
            print(f"❌ Failed to connect to Binance: {e}")
            raise
    
    def get_account_balance(self):
        """Get account balance for all assets"""
        try:
            account = self.client.get_account()
            balances = []
            
            for balance in account['balances']:
                free = float(balance['free'])
                locked = float(balance['locked'])
                
                # Only include assets with non-zero balance
                if free > 0 or locked > 0:
                    balances.append({
                        'asset': balance['asset'],
                        'free': free,
                        'locked': locked,
                        'total': free + locked
                    })
            
            return {
                'success': True,
                'balances': balances,
                'count': len(balances)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_current_price(self, symbol):
        """
        Get current price for a trading pair
        Example: get_current_price('BTCUSDT')
        """
        try:
            if not symbol or not isinstance(symbol, str):
                raise ValueError("Invalid symbol provided")

            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return {
                'success': True,
                'symbol': ticker['symbol'],
                'price': float(ticker['price'])
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to fetch price for {symbol}: {str(e)}"
            }
    
    def get_24h_ticker(self, symbol):
        """Get 24-hour price statistics"""
        try:
            ticker = self.client.get_ticker(symbol=symbol)
            return {
                'success': True,
                'symbol': symbol,
                'price': float(ticker['lastPrice']),
                'high_24h': float(ticker['highPrice']),
                'low_24h': float(ticker['lowPrice']),
                'volume_24h': float(ticker['volume']),
                'price_change_24h': float(ticker['priceChange']),
                'price_change_percent_24h': float(ticker['priceChangePercent'])
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def place_market_buy(self, symbol, quantity):
        """
        Place market buy order (buy at current market price)
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            quantity: Amount to buy (e.g., 0.001 BTC)
        """
        try:
            if not symbol or not isinstance(symbol, str):
                raise ValueError("Invalid symbol provided")
            if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
                raise ValueError("Invalid quantity provided")

            order = self.client.order_market_buy(
                symbol=symbol,
                quantity=quantity
            )
            
            return {
                'success': True,
                'order_id': order['orderId'],
                'symbol': order['symbol'],
                'side': order['side'],
                'quantity': float(order['executedQty']),
                'price': float(order['fills'][0]['price']) if order['fills'] else 0,
                'status': order['status'],
                'timestamp': order['transactTime']
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to place market buy order for {symbol}: {str(e)}"
            }
    
    def place_market_sell(self, symbol, quantity):
        """
        Place market sell order (sell at current market price)
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            quantity: Amount to sell (e.g., 0.001 BTC)
        """
        try:
            order = self.client.order_market_sell(
                symbol=symbol,
                quantity=quantity
            )
            
            return {
                'success': True,
                'order_id': order['orderId'],
                'symbol': order['symbol'],
                'side': order['side'],
                'quantity': float(order['executedQty']),
                'price': float(order['fills'][0]['price']) if order['fills'] else 0,
                'status': order['status'],
                'timestamp': order['transactTime']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def place_limit_order(self, symbol, side, quantity, price):
        """
        Place limit order (buy/sell at specific price)
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: 'BUY' or 'SELL'
            quantity: Amount to trade
            price: Price per unit
        """
        try:
            if side.upper() == 'BUY':
                order = self.client.order_limit_buy(
                    symbol=symbol,
                    quantity=quantity,
                    price=str(price)
                )
            else:
                order = self.client.order_limit_sell(
                    symbol=symbol,
                    quantity=quantity,
                    price=str(price)
                )
            
            return {
                'success': True,
                'order_id': order['orderId'],
                'symbol': order['symbol'],
                'side': order['side'],
                'quantity': float(order['origQty']),
                'price': float(order['price']),
                'status': order['status'],
                'timestamp': order['transactTime']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_order_status(self, symbol, order_id):
        """Check the status of an order"""
        try:
            order = self.client.get_order(symbol=symbol, orderId=order_id)
            
            return {
                'success': True,
                'order_id': order['orderId'],
                'symbol': order['symbol'],
                'status': order['status'],
                'side': order['side'],
                'price': float(order['price']),
                'executed_qty': float(order['executedQty']),
                'original_qty': float(order['origQty'])
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_order(self, symbol, order_id):
        """Cancel an open order"""
        try:
            result = self.client.cancel_order(symbol=symbol, orderId=order_id)
            
            return {
                'success': True,
                'order_id': result['orderId'],
                'symbol': result['symbol'],
                'status': result['status']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_recent_trades(self, symbol, limit=10):
        """Get recent trades for an account"""
        try:
            trades = self.client.get_my_trades(symbol=symbol, limit=limit)
            
            trade_list = []
            for trade in trades:
                trade_list.append({
                    'id': trade['id'],
                    'symbol': trade['symbol'],
                    'price': float(trade['price']),
                    'quantity': float(trade['qty']),
                    'commission': float(trade['commission']),
                    'commission_asset': trade['commissionAsset'],
                    'time': trade['time'],
                    'is_buyer': trade['isBuyer']
                })
            
            return {
                'success': True,
                'trades': trade_list,
                'count': len(trade_list)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_open_orders(self, symbol=None):
        """Get all open orders (or for specific symbol)"""
        try:
            if symbol:
                orders = self.client.get_open_orders(symbol=symbol)
            else:
                orders = self.client.get_open_orders()
            
            order_list = []
            for order in orders:
                order_list.append({
                    'order_id': order['orderId'],
                    'symbol': order['symbol'],
                    'side': order['side'],
                    'type': order['type'],
                    'price': float(order['price']),
                    'quantity': float(order['origQty']),
                    'executed_qty': float(order['executedQty']),
                    'status': order['status'],
                    'time': order['time']
                })
            
            return {
                'success': True,
                'orders': order_list,
                'count': len(order_list)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
