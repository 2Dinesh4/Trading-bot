from sqlalchemy import text
from app.database import engine, Base
# Import all models to ensure they are registered for creation
from app.models import User, Trade, Strategy, Order, KYCDocument, UserAPIKey, WalletTransaction

print("🗑️  Force deleting all tables with CASCADE...")

with engine.connect() as connection:
    # We drop tables in a specific order with CASCADE to break links
    # The order doesn't strictly matter with CASCADE, but it's good practice
    connection.execute(text("DROP TABLE IF EXISTS orders CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS trades CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS strategies CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS wallet_transactions CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS user_api_keys CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS kyc_documents CASCADE;"))
    connection.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
    
    # Commit the changes
    connection.commit()

print("✅ All tables deleted successfully!")

print("✨ Re-creating tables from models...")
# This creates them again with the correct structure
Base.metadata.create_all(bind=engine)
print("✅ New tables created! You are ready to run.")