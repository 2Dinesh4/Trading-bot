from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

# Get encryption key from environment or generate one
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a new key (only for development)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"⚠️ Generated new encryption key: {ENCRYPTION_KEY}")
    print("⚠️ Add this to your .env file: ENCRYPTION_KEY={ENCRYPTION_KEY}")

# Create cipher instance
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def encrypt_string(plain_text: str) -> str:
    """Encrypt a string"""
    if not plain_text:
        return ""
    
    encrypted = cipher_suite.encrypt(plain_text.encode())
    return encrypted.decode()


def decrypt_string(encrypted_text: str) -> str:
    """Decrypt a string"""
    if not encrypted_text:
        return ""
    
    decrypted = cipher_suite.decrypt(encrypted_text.encode())
    return decrypted.decode()
