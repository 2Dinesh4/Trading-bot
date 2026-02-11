import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import threading
from datetime import datetime

# Load env vars
load_dotenv()

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        self.port = 465 
        self.username = os.getenv("MAIL_USERNAME")
        self.sender = os.getenv("MAIL_FROM", self.username)
        # Default admin recipient for trade alerts
        self.admin_recipient = os.getenv("MAIL_TO")
        
        raw_password = os.getenv("MAIL_PASSWORD", "")
        self.password = raw_password.replace(" ", "").strip()

    def _send_async(self, subject: str, body: str, to_email: str):
        """Internal method to send email in a separate thread"""
        if not self.username or not self.password:
            logger.warning("⚠️ Email credentials missing in .env file. Skipping email.")
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = f"Trading Bot <{self.sender}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "html"))

            with smtplib.SMTP_SSL(self.server, self.port) as server:
                server.login(self.username, self.password)
                server.sendmail(self.sender, to_email, msg.as_string())
            
            logger.info(f"📧 Email sent successfully to {to_email}: {subject}")

        except Exception as e:
            logger.error(f"❌ Failed to send email: {str(e)}")

    def send_trade_alert(self, symbol: str, action: str, price: float, pnl: float = None, reason: str = ""):
        """Sends trade alerts to the ADMIN"""
        if not self.admin_recipient:
            logger.warning("⚠️ No admin recipient (MAIL_TO) configured.")
            return

        color = "green" if pnl and pnl > 0 else "red" if pnl and pnl < 0 else "blue"
        pnl_text = f"<li><b>P&L:</b> <span style='color:{color}'>{pnl:.2f}%</span></li>" if pnl is not None else ""
        
        subject = f"🔔 {action}: {symbol} @ {price:.2f}"
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        body = f"""
        <html>
          <body>
            <h2>Trading Bot Alert 🤖</h2>
            <ul>
              <li><b>Symbol:</b> {symbol}</li>
              <li><b>Action:</b> {action}</li>
              <li><b>Price:</b> {price:.2f}</li>
              <li><b>Reason:</b> {reason}</li>
              {pnl_text}
            </ul>
            <p><i>Time: {current_time}</i></p>
          </body>
        </html>
        """
        
        threading.Thread(target=self._send_async, args=(subject, body, self.admin_recipient)).start()

    def send_otp_email(self, to_email: str, otp_code: str):
        """Sends OTP verification code to the USER"""
        subject = "🔐 Verify Your SmartTrade Account"
        
        body = f"""
        <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2c3e50;">Welcome to SmartTrade! 🚀</h2>
                <p>Thank you for registering. Please verify your email address to activate your account.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code:</p>
                    <h1 style="margin: 10px 0; color: #007bff; letter-spacing: 5px;">{otp_code}</h1>
                </div>

                <p>This code expires in <b>10 minutes</b>.</p>
                <p style="color: #999; font-size: 12px;">If you did not create an account, please ignore this email.</p>
            </div>
          </body>
        </html>
        """
        
        threading.Thread(target=self._send_async, args=(subject, body, to_email)).start()

# Global Instance
email_service = EmailService()