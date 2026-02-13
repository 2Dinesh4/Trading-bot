"""
Database migration: Add missing columns to users table
This fixes the schema mismatch causing Google authentication to fail
"""
from dotenv import load_dotenv
load_dotenv()

from app.database import engine
from sqlalchemy import text

def add_missing_columns():
    with engine.connect() as conn:
        # Check existing columns
        print("Checking existing columns in users table...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """))
        existing_columns = [row[0] for row in result]
        print(f"Existing columns: {', '.join(existing_columns)}")
        
        # Add full_name column if it doesn't exist
        if 'full_name' not in existing_columns:
            try:
                print("\nAdding full_name column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
                conn.commit()
                print("✅ full_name column added successfully")
            except Exception as e:
                print(f"❌ Error adding full_name: {e}")
                conn.rollback()
        else:
            print("✅ full_name column already exists")
        
        # Add phone_number column if it doesn't exist
        if 'phone_number' not in existing_columns:
            try:
                print("\nAdding phone_number column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
                conn.commit()
                print("✅ phone_number column added successfully")
            except Exception as e:
                print(f"❌ Error adding phone_number: {e}")
                conn.rollback()
        else:
            print("✅ phone_number column already exists")
        
        # Verify final schema
        print("\n📋 Final users table schema:")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """))
        for row in result:
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            print(f"  - {row[0]}: {row[1]} ({nullable})")

if __name__ == "__main__":
    try:
        add_missing_columns()
        print("\n🎉 Migration complete!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
