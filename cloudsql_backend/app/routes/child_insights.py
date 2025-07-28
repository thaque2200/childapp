# timeline_api.py
from fastapi import APIRouter, Depends
from app.firebase_config import *
from app.services.db_connection import getconn
from typing import List, Dict
from app.services.auth_dependency import verify_firebase_token

router = APIRouter()

@router.get("/child-timeline", response_model=List[Dict])
def get_timeline_data(user = Depends(verify_firebase_token)):
    uid = user["uid"]
    conn = getconn()
    cur = conn.cursor()
    try:
        query = """
            SELECT timestamp, symptom, intent, age, severity, duration, associated_symptoms
            FROM child_symptom_timeline
            WHERE intent is NOT NULL 
            AND symptom is NOT NULL
            AND uid = %s
            ORDER BY timestamp
        """
        cur.execute(query, (uid))
        rows = cur.fetchall()
        return [
            {
                "timestamp": r[0],
                "symptom": r[1],
                "intent": r[2],
                "age": r[3],
                "severity": r[4],
                "duration": r[5],
                "associated_symptoms": r[6]
            }
            for r in rows
        ]
    finally:
        cur.close()
        conn.close()
