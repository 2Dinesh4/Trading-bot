import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.trade import Trade
from app.models.user import User  # ✅ Imported User for P&L updates
from app.services.exchange_service import exchange_service
from app.services.trading_service import trading_service
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

class TradingEngine:
    def __init__(self):
        self.running = False

    async def run_loop(self):
        """This loop runs forever in the background"""
        logger.info("🚀 Trading Engine Started (Background - PRODUCTION)")
        self.running = True
        
        while self.running:
            try:
                # Create a new database session every second
                db = SessionLocal()
                self.process_active_trades(db)
                db.close()
            except Exception as e:
                logger.error(f"Engine Loop Error: {e}")
            
            # Wait 1 second before checking again
            await asyncio.sleep(1)

    def process_active_trades(self, db: Session):
        """Check all 'open' trades to see if we should Sell"""
        # 1. Get all open trades
        trades = db.query(Trade).filter(Trade.status == "open").all()
        
        for trade in trades:
            # 2. Get Real Price from Binance/Upstox
            price_data = exchange_service.get_price(trade.scrip)
            
            if not price_data.get('success'):
                continue

            current_price = float(price_data['price'])
            
            # 3. Update 'Highest Price' (Crucial for Trailing Stop)
            if not trade.highest_price or current_price > float(trade.highest_price):
                trade.highest_price = current_price
                
                # 4. Trailing Logic: Move Stop Loss UP
                # Example: Keep SL 2% below the Highest Price
                trailing_gap = 0.02 # 2%
                new_sl = float(trade.highest_price) * (1 - trailing_gap)
                
                if new_sl > float(trade.stop_loss_price):
                    trade.stop_loss_price = new_sl
                    # Silent log to avoid spamming
                    # logger.info(f"🔄 Trailing SL moved up to {new_sl:.2f} for {trade.scrip}")
                    db.commit()

            # 5. Check EXIT Conditions
            # Condition A: Price hit Stop Loss?
            if current_price <= float(trade.stop_loss_price):
                self.execute_sell(db, trade, current_price, "Stop Loss Hit")
            
            # Condition B: Price hit Target?
            elif current_price >= float(trade.target_price):
                self.execute_sell(db, trade, current_price, "Target Profit Hit")

    def execute_sell(self, db: Session, trade: Trade, exit_price: float, reason: str):
        """Execute the Sell, Notify User, and Update Daily P&L"""
        logger.info(f"🔴 DECISION: Executing SELL for {trade.scrip} | Reason: {reason}")
        
        # -----------------------------------------------------------
        # ✅ STEP 1: EXECUTE REAL SELL ON BINANCE
        # -----------------------------------------------------------
        order_result = exchange_service.place_order(trade.scrip, 'SELL', float(trade.quantity))
        
        if not order_result.get('success'):
            logger.error(f"❌ FAILED TO SELL ON BINANCE: {order_result.get('error')}")
            # If emergency stop, we might force close locally even if API fails? 
            # For now, we return to try again next loop.
            return

        # Use the *actual* fill price from Binance if available, otherwise use trigger price
        final_exit_price = float(order_result.get('price', exit_price))
        if final_exit_price == 0: final_exit_price = exit_price # Fallback

        logger.info(f"✅ BINANCE SOLD! Price: ${final_exit_price}")

        # -----------------------------------------------------------
        # ✅ STEP 2: CALCULATE PNL & UPDATE DB
        # -----------------------------------------------------------
        quantity = float(trade.quantity)
        entry_val = float(trade.entry_price) * quantity
        exit_val = final_exit_price * quantity
        pnl_amount = exit_val - entry_val
        pnl_percent = (pnl_amount / entry_val) * 100

        # Refund Money to Local Wallet (Syncing Record)
        trading_service.close_trade(
            db, 
            trade.user_id, 
            trade.scrip, 
            float(trade.entry_price), 
            final_exit_price, 
            pnl_amount
        )

        # Mark Trade as Closed
        trade.status = "closed"
        trade.exit_price = final_exit_price
        trade.exit_time = datetime.utcnow()
        trade.pnl_amount = pnl_amount
        trade.pnl_percent = pnl_percent
        
        # -----------------------------------------------------------
        # ✅ BUG-006 FIX: UPDATE USER DAILY P&L
        # -----------------------------------------------------------
        user = db.query(User).filter(User.id == trade.user_id).first()
        if user:
            # Check if we need to reset the counter (New Day)
            if user.last_trade_date.date() < datetime.utcnow().date():
                user.daily_pnl = 0.00
            
            user.daily_pnl = float(user.daily_pnl) + pnl_amount
            user.last_trade_date = datetime.utcnow()
            logger.info(f"📊 User {user.id} Daily P&L Updated: ${user.daily_pnl}")

        db.commit()

        # -----------------------------------------------------------
        # ✅ STEP 3: SEND EMAIL ALERT
        # -----------------------------------------------------------
        email_service.send_trade_alert(
            symbol=trade.scrip,
            action="SELL",
            price=final_exit_price,
            pnl=pnl_percent,
            reason=reason
        )

    # ---------------------------------------------------------------
    # ✅ BUG-001 FIX: FORCE CLOSE ALL POSITIONS
    # ---------------------------------------------------------------
    async def trigger_emergency_stop(self):
        """Stops the loop and LIQUIDATES all open positions immediately"""
        logger.critical("🚨 EMERGENCY STOP TRIGGERED! HALTING ENGINE & SELLING ALL.")
        
        # 1. Stop the loop
        self.running = False
        
        # 2. Open a DB session to find open trades
        db = SessionLocal()
        try:
            open_trades = db.query(Trade).filter(Trade.status == "open").all()
            
            if not open_trades:
                logger.info("ℹ️ No open trades to close.")
                return {"message": "Engine stopped. No open trades.", "final_pnl": 0}

            results = []
            total_loss_prevented = 0
            
            for trade in open_trades:
                logger.warning(f"🚨 FORCE CLOSING: {trade.scrip}")
                
                # Fetch current price for logging (we use Market Sell anyway)
                price_data = exchange_service.get_price(trade.scrip)
                exit_price = float(price_data['price']) if price_data.get('success') else 0.0
                
                # Execute Sell
                self.execute_sell(db, trade, exit_price, "EMERGENCY_STOP_BUTTON")
                results.append(f"Closed {trade.scrip}")
            
            return {"message": "Engine Halted. Force Closed: " + ", ".join(results), "final_pnl": "Calculated"}
            
        except Exception as e:
            logger.error(f"❌ Emergency Stop Failed: {e}")
            return {"error": str(e)}
        finally:
            db.close()

# Create one global instance
trading_engine = TradingEngine()