import json
from db_connection import getconn
import pg8000.dbapi


def run_daily_timeline_etl():
    conn = None
    cur = None
    try:
        print("[DEBUG] Calling getconn()")
        conn = getconn()
        print("[DEBUG] getconn() succeeded")
        cur = conn.cursor()
        print("[INFO] Fetching last_run_at from chat_etl_status...")
        cur.execute("""
            SELECT last_run_at FROM chat_etl_status
            WHERE job_name = 'timeline_etl'
        """)
        row = cur.fetchone()
        last_run_at = row[0] if row else '2025-01-01 00:00:00'
        print(f"[INFO] Last run timestamp: {last_run_at}")
        print("[INFO] Querying new rows from chat_history_detailed...")
        cur.execute("""
            SELECT id, uid, timestamp, intent, parsed_symptom, response
            FROM chat_history_detailed
            WHERE intent = 'Pediatrician' AND timestamp > %s
            ORDER BY timestamp
        """, (last_run_at,))
        rows = cur.fetchall()
        print(f"[INFO] Found {len(rows)} new rows")
        if not rows:
            print("[etl] No new rows found. ETL skipped.")
            return {"status": "no new data"}
        new_timestamp = last_run_at
        inserts = []
        for row in rows:
            id, uid, ts, intent, parsed_symptom, response = row
            try:
                symptom = json.loads(parsed_symptom or "{}")
            except Exception as e:
                print(f"[WARN] Failed to parse parsed_symptom: {parsed_symptom} | Error: {e}")
                continue
            if not symptom.get("primary_symptom"):
                print(f"[WARN] Skipping row {id} due to missing primary_symptom.")
                continue
    except pg8000.exceptions.DatabaseError as e:
        print(f"[ERROR] Database error during ETL: {e}")
        raise
    except Exception as e:
        print(f"[ERROR] Uncaught exception in ETL: {e}")
        raise
    finally:
        if cur:
            print("[DEBUG] Closing cursor.")
            cur.close()
        if conn:
            print("[DEBUG] Closing connection.")
            conn.close()
    print("[DEBUG] ETL process finished.")
    return {"status": "success"}



def run_etl_http(request):
    try:
        print("[INFO] Cloud Function triggered via HTTP")
        result = run_daily_timeline_etl()
        print(f"[SUCCESS] Function completed with result: {result}")
        return json.dumps(result), 200
    except Exception as e:
        print(f"[ERROR] Function failed with exception: {e}")
        return {"status": "error", "detail": str(e)}, 500




