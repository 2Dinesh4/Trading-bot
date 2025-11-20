from sqlalchemy.orm import Session
from app.models.user import User
from app.models.wallet import WalletTransaction
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class TradingService:
    """Handle trading operations with wallet integration"""
    
    @staticmethod
    def start_trade(db: Session, user_id: int, symbol: str, amount: float, entry_price: float):
        """Deduct trade amount from wallet when starting trade"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            trade_amount = Decimal(str(amount))
            
            # Check if user has sufficient balance
            if user.wallet_balance < trade_amount:
                return {
                    "success": False,
                    "error": f"Insufficient balance. You have ${user.wallet_balance}, need ${trade_amount}"
                }
            
            # Deduct from wallet
            user.wallet_balance -= trade_amount
            
            # Log transaction
            transaction = WalletTransaction(
                user_id=user_id,
                transaction_type="trade_debit",
                amount=-trade_amount,
                balance_after=user.wallet_balance,
                description=f"Started trade: {symbol} with ${amount}",
                symbol=symbol
            )
            db.add(transaction)
            db.commit()
            
            logger.info(f"✅ Trade started: User {user_id} invested ${amount} in {symbol}")
            
            return {
                "success": True,
                "message": f"Deducted ${amount} from wallet",
                "new_balance": float(user.wallet_balance)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error starting trade: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def close_trade(db: Session, user_id: int, symbol: str, initial_amount: float, final_amount: float, profit_loss: float):
        """Add money back to wallet when closing trade"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            final_amt = Decimal(str(final_amount))
            profit = Decimal(str(profit_loss))
            
            # Add final amount back to wallet
            user.wallet_balance += final_amt
            
            # Log transaction
            tx_type = "profit" if profit > 0 else "loss" if profit < 0 else "trade_credit"
            description = f"Closed trade: {symbol}. Initial: ${initial_amount}, Final: ${final_amount}, {'Profit' if profit >= 0 else 'Loss'}: ${abs(profit)}"
            
            transaction = WalletTransaction(
                user_id=user_id,
                transaction_type=tx_type,
                amount=final_amt,
                balance_after=user.wallet_balance,
                description=description,
                symbol=symbol
            )
            db.add(transaction)
            db.commit()
            
            logger.info(f"✅ Trade closed: User {user_id} received ${final_amount} from {symbol} (P/L: ${profit})")
            
            return {
                "success": True,
                "message": f"Added ${final_amount} to wallet",
                "new_balance": float(user.wallet_balance),
                "profit_loss": float(profit)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error closing trade: {str(e)}")
            return {"success": False, "error": str(e)}

# Initialize service
trading_service = TradingService()
