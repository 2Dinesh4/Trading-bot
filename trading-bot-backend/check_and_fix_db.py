from dotenv import load_dotenv
load_dotenv()

from app.database import engine
from sqlalchemy import text
import traceback

with engine.connect() as conn:
    # Step 1: Show current columns
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"))
    cols = [r[0] for r in result]
    print("CURRENT COLUMNS:", cols)
    
    # Step 2: Try adding full_name
    if 'full_name' not in cols:
        try:
            print("ADDING full_name...")
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            conn.commit()
            print("SUCCESS: full_name added")
        except Exception as e:
            print(f"ERROR adding full_name: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            conn.rollback()
    else:
        print("full_name already exists")
    
    # Step 3: Try adding phone_number
    if 'phone_number' not in cols:
        try:
            print("ADDING phone_number...")
            conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
            conn.commit()
            print("SUCCESS: phone_number added")
        except Exception as e:
            print(f"ERROR adding phone_number: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            conn.rollback()
    else:
        print("phone_number already exists")
    
    # Step 4: Verify
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"))
    cols = [r[0] for r in result]
    print("FINAL COLUMNS:", cols)
