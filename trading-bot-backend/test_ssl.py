import smtplib
from email.mime.text import MIMEText

# 👇 CONFIGURATION
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465  # ✅ Using Port 465 (Direct SSL) instead of 587
SENDER_EMAIL = "streamezone33@gmail.com"
# 👇 PASTE YOUR 16-CHAR APP PASSWORD HERE:
APP_PASSWORD = "iwbzyfucponzotsp"

print(f"🕵️ Testing Direct SSL Connection (Port 465) to: {SENDER_EMAIL}")

try:
    msg = MIMEText("If you read this, the SSL connection worked via Port 465!")
    msg["Subject"] = "Bot SSL Test"
    msg["From"] = SENDER_EMAIL
    msg["To"] = SENDER_EMAIL

    # 1. Connect using SMTP_SSL (Critical Change)
    print("🔌 Connecting to Gmail via SSL...")
    server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
    server.ehlo()
    print("✅ Connected to Server!")
    
    # 2. Login
    print("🔑 Logging in...")
    clean_password = APP_PASSWORD.replace(" ", "")
    server.login(SENDER_EMAIL, clean_password)
    print("✅ Login Successful!")
    
    # 3. Send
    print("📧 Sending email...")
    server.sendmail(SENDER_EMAIL, SENDER_EMAIL, msg.as_string())
    server.quit()
    
    print("\n🎉 SUCCESS! It worked using SSL (Port 465).")
    print("👉 Now we know we must update email_service.py to use SSL.")

except Exception as e:
    print(f"\n❌ FAILURE. Details:\n{e}")