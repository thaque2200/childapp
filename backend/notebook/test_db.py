from app.services.db_connection import getconn
conn = getconn()
row = conn.cursor().execute("SELECT 1;").fetchone()
print("Connected, got:", row)
