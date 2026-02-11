import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

print("--------------------------------------------------")
print("🛡️  FIXING DATABASE PERMISSIONS")
print("--------------------------------------------------")

# 1. Ask for Admin Password
try:
    admin_password = input("Enter your 'postgres' (Admin) password: ")
except KeyboardInterrupt:
    sys.exit()

try:
    # 2. Connect as Admin
    print("🔌 Connecting as Admin...")
    conn = psycopg2.connect(
        dbname="smarttrade_db",  # Connect to the specific DB
        user="postgres",
        password=admin_password,
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # 3. Grant Permissions
    print("🔓 Granting privileges to 'smarttrade_user'...")
    
    # Grant access to all tables
    cursor.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smarttrade_user;")
    
    # Grant access to all sequences (needed for ID auto-increment)
    cursor.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smarttrade_user;")
    
    # Ensure future tables are also accessible
    cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smarttrade_user;")
    
    print("✅ SUCCESS! 'smarttrade_user' can now access the tables.")
    print("--------------------------------------------------")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("💡 Hint: Check your admin password.")

finally:
    if 'conn' in locals() and conn:
        conn.close()