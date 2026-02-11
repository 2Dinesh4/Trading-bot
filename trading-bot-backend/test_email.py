from app.services.email_service import email_service
import time

print("⏳ Sending test email FROM someshwardinesh24 TO streamezone33...")

try:
    email_service.send_trade_alert(
        symbol="TEST-BTC", 
        action="NEW SENDER CHECK", 
        price=50000.00, 
        pnl=10.5, 
        reason="Testing New Account"
    )
    
    time.sleep(3)
    print("✅ Logic executed. Check the inbox of 'streamezone33@gmail.com'.")

except Exception as e:
    print(f"❌ Script Error: {e}")