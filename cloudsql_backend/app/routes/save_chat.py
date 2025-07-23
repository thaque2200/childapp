# app/routes/save_chat.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from app.services.db_connection import getconn
from app.services.auth_dependency import verify_firebase_token
from typing import Dict, Any, List

router = APIRouter()

class SaveChatInput(BaseModel):
    question: str
    intent: str
    parsed_symptom: Dict[str, Any]
    response: str
    timestamp: str  # ISO 8601

@router.post("/save-chat")
async def save_chat(input: SaveChatInput, user = Depends(verify_firebase_token)):
    uid = user["uid"]

    # 3. Connect to Cloud SQL and insert
    try:
        conn = getconn()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chat_history_detailed (uid, question, intent, parsed_symptom, response, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            uid,
            input.question,
            input.intent,
            input.parsed_symptom,
            input.response,
            input.timestamp,
        ))

        conn.commit()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                if conn.closed == 0:
                    conn.close()
            except:
                pass

    return {"status": "success"}