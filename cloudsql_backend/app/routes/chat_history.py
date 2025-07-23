from fastapi import APIRouter, Depends
from app.firebase_config import *
from app.services.db_connection import getconn
from app.services.auth_dependency import verify_firebase_token


router = APIRouter()

@router.get("/history")
async def get_chat_history(user = Depends(verify_firebase_token)):
    uid = user["uid"]
    conn = getconn()
    try:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT question, response, timestamp
                FROM chat_history_detailed
                WHERE uid = %s
                ORDER BY timestamp DESC
                LIMIT 5
            """, (uid,))
            rows = cur.fetchall()
            history = [
                {"question": r[0], "response": r[1], "timestamp": r[2]} for r in rows
            ]
        finally:
            cur.close()
        return { "history": history }
    finally:
        conn.close()