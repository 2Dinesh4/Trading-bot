from sqlalchemy.orm import Session
from app.models.user import User
from app.models.wallet import WalletTransaction
from decimal import Decimal
import logging
import os
from dotenv import load_dotenv

# Import Services
from app.services.exchange_service import exchange_service
from app.services.email_service import email_service

load_dotenv()
logger = logging.getLogger(__name__)

class TradingService:
    """Handle REAL trading operations"""
    
    @staticmethod
    def get_binance_balance():
        """Fetch REAL USDT Balance from the Connected Account"""
        try:
            # exchange_service.binance_client is the REAL client
            client = exchange_service.binance_client
            if not client:
                logger.error("❌ Binance Client is None. Cannot fetch balance.")
                return None
            
            # Fetch account info
            account = client.get_account()
            balances = account.get('balances', [])
            
            # Find USDT
            for b in balances:
                if b['asset'] == 'USDT':
                    free_bal = float(b['free'])
                    logger.info(f"💰 Real Binance Balance: ${free_bal:.2f} USDT")
                    return free_bal
            return 0.0
        except Exception as e:
            logger.error(f"❌ Failed to fetch Binance Balance: {e}")
            return None

    @staticmethod
    def start_trade(db: Session, user_id: int, symbol: str, amount: float, entry_price: float):
        """Execute trade if Real Binance Balance allows"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            # 1. Check Real Balance (CRITICAL SAFETY CHECK)
            real_balance = TradingService.get_binance_balance()
            
            if real_balance is None:
                return {"success": False, "error": "❌ API Keys Invalid or Network Error. Cannot Trade."}
            
            if real_balance < amount:
                return {
                    "success": False, 
                    "error": f"❌ Insufficient Real USDT. Have: ${real_balance:.2f}, Need: ${amount}"
                }
            
            # 2. Update Local DB for UI consistency
            trade_amount = Decimal(str(amount))
            user.wallet_balance -= trade_amount
            
            transaction = WalletTransaction(
                user_id=user_id,
                transaction_type="trade_debit",
                amount=-trade_amount,
                balance_after=user.wallet_balance,
                description=f"REAL TRADE: {symbol} | Invested ${amount}",
                symbol=symbol
            )
            db.add(transaction)
            db.commit()
            
            logger.info(f"✅ Real Trade Authorized: User {user_id} invested ${amount} in {symbol}")
            return {
                "success": True,
                "message": f"Real Trade Initiated. Deducted ${amount} from local tracking.",
                "new_balance": float(user.wallet_balance)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error starting trade: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def close_trade(db: Session, user_id: int, symbol: str, initial_amount: float, final_amount: float, profit_loss: float):
        """Log the closed trade"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user: return {"success": False, "error": "User not found"}
            
            final_amt = Decimal(str(final_amount))
            profit = Decimal(str(profit_loss))
            
            # Update local wallet
            user.wallet_balance += final_amt
            
            # Log transaction
            description = f"REAL CLOSE: {symbol}. P/L: ${profit}"
            transaction = WalletTransaction(
                user_id=user_id,
                transaction_type="profit" if profit > 0 else "loss",
                amount=final_amt,
                balance_after=user.wallet_balance,
                description=description,
                symbol=symbol
            )
            db.add(transaction)
            db.commit()
            
            logger.info(f"✅ Trade closed: User {user_id} received ${final_amount}")
            
            # Send Email
            try:
                pnl_percent = (float(profit) / float(initial_amount)) * 100
                email_service.send_trade_alert(
                    symbol=symbol,
                    action="SELL (Real Trade Closed)",
                    price=0, 
                    pnl=pnl_percent,
                    reason=f"Real P/L: ${float(profit):.2f}"
                )
            except Exception as mail_err:
                logger.error(f"⚠️ Failed to send email: {mail_err}")

            return {"success": True, "message": "Trade Closed", "new_balance": float(user.wallet_balance)}
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error closing trade: {str(e)}")
            return {"success": False, "error": str(e)}

trading_service = TradingService()