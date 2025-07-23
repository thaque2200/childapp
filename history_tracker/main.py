import json
from db_connection import getconn


def run_daily_timeline_etl():
    try:
        print("[DEBUG] Calling getconn()")
        import os, json
        print("[DEBUG] Reading DB_CONFIG")
        config = json.loads(os.environ["DB_CONFIG"])
        print(f"[DEBUG] Config loaded: {config.keys()}")
        conn = getconn()
        print("[DEBUG] getconn() succeeded")
        with conn.cursor() as cur:
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
                    print(f"[WARN] Skipping row {id} due to missing primary_symptom")
                    continue

                inserts.append((
                    uid,
                    ts,
                    intent,
                    symptom.get("primary_symptom"),
                    symptom.get("age"),
                    symptom.get("severity"),
                    symptom.get("duration"),
                    symptom.get("associated_symptoms", []),
                    response.split("1. ")[-1].split("2.")[0].strip()
                ))

                if ts > new_timestamp:
                    new_timestamp = ts

            print(f"[INFO] Inserting {len(inserts)} rows into child_symptom_timeline...")
            cur.executemany("""
                INSERT INTO child_symptom_timeline (
                    uid, timestamp, intent, symptom, age,
                    severity, duration, associated_symptoms, summary
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, inserts)

            print(f"[INFO] Updating chat_etl_status with last_run_at = {new_timestamp}")
            cur.execute("""
                UPDATE chat_etl_status
                SET last_run_at = %s
                WHERE job_name = 'timeline_etl'
            """, (new_timestamp,))

            conn.commit()
            print(f"[SUCCESS] Inserted {len(inserts)} rows. Updated last_run_at to {new_timestamp}")
            return {"status": "success", "rows_inserted": len(inserts)}

    except Exception as e:
        print(f"[ETL] ❌ Uncaught exception in ETL: {e}")
        return {"status": "error", "detail": str(e)}

    finally:
        conn.close()
        print("[INFO] Database connection closed")


def run_etl_http(request):
    try:
        print("[INFO] Cloud Function triggered via HTTP")
        result = run_daily_timeline_etl()
        print(f"[SUCCESS] Function completed with result: {result}")
        return json.dumps(result), 200
    except Exception as e:
        print(f"[ERROR] Function failed with exception: {e}")
        return {"status": "error", "detail": str(e)}, 500
