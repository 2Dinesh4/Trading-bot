from dotenv import load_dotenv
load_dotenv()

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"))
    cols = [r[0] for r in result]
    for c in cols:
        print(c)
