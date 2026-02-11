import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

# 1. We need your ADMIN credentials to change the lock
print("🔐 We are going to reset the 'smarttrade_user' password to 'Lokesh'")
admin_password = input("Enter your 'postgres' (Admin) password: ")

try:
    # 2. Connect as Admin
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password=admin_password,
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # 3. Force the Password Change
    print("⚙️  Updating database credentials...")
    cursor.execute("ALTER USER smarttrade_user WITH PASSWORD 'Lokesh';")
    
    print("✅ SUCCESS! The database password is now 'Lokesh'.")
    print("🚀 You can now restart your backend server.")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("Double-check your Admin password and try again.")

finally:
    if 'conn' in locals() and conn:
        conn.close()