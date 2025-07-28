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

        # Step 1: Get last_run_at
        print("[INFO] Fetching last_run_at from chat_etl_status...")
        cur.execute("""
            SELECT last_run_at FROM chat_etl_status
            WHERE job_name = 'timeline_etl'
        """)
        row = cur.fetchone()
        last_run_at = row[0] if row else '2025-01-01 00:00:00'
        print(f"[INFO] Last run timestamp: {last_run_at}")

        # Step 2: Query all rows after last_run_at
        print("[INFO] Querying new rows from chat_history_detailed...")
        cur.execute("""
            SELECT id, uid, question, intent, parsed_symptom, response, timestamp
            FROM chat_history_detailed
            WHERE timestamp > %s
            ORDER BY timestamp
        """, (last_run_at,))
        rows = cur.fetchall()
        print(f"[INFO] Found {len(rows)} new rows")

        if not rows:
            print("[etl] No new rows found. ETL skipped.")
            return {"status": "no new data"}

        new_timestamp = last_run_at
        rows_inserted = 0

        for row in rows:
            id, uid, question, intent, parsed_symptom, response, ts = row

            # Default empty dict if None or empty
            if not parsed_symptom:
                symptom_data = {}
            elif isinstance(parsed_symptom, str):
                try:
                    symptom_data = json.loads(parsed_symptom)
                except Exception as e:
                    print(f"[WARN] Failed to parse parsed_symptom in row {id}: {parsed_symptom} | Error: {e}")
                    symptom_data = {}
            elif isinstance(parsed_symptom, dict):
                symptom_data = parsed_symptom
            else:
                print(f"[WARN] Unsupported parsed_symptom type for row {id}: {type(parsed_symptom)}")
                symptom_data = {}

            # Extract fields with fallback to None
            primary_symptom = symptom_data.get("primary_symptom")
            age = symptom_data.get("age")
            severity = symptom_data.get("severity")
            duration = symptom_data.get("duration")
            assoc = symptom_data.get("associated_symptoms")

            if isinstance(assoc, list):
                associated_symptoms = ", ".join(assoc) if assoc else None
            elif assoc:
                associated_symptoms = str(assoc)
            else:
                associated_symptoms = None

            try:
                cur.execute("""
                    INSERT INTO child_symptom_timeline (
                        uid, timestamp, intent,
                        symptom, age, severity, duration,
                        associated_symptoms, summary
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    uid, ts, intent,
                    primary_symptom, age, severity, duration,
                    associated_symptoms, response
                ))
                rows_inserted += 1
                new_timestamp = ts
            except Exception as e:
                print(f"[ERROR] Failed to insert row {id} into child_symptom_timeline: {e}")
                continue

        print(f"[INFO] Inserted {rows_inserted} rows into child_symptom_timeline.")

        # Step 3: Update ETL status
        if rows_inserted > 0:
            print("[INFO] Updating last_run_at in chat_etl_status...")
            cur.execute("""
                INSERT INTO chat_etl_status (job_name, last_run_at)
                VALUES ('timeline_etl', %s)
                ON CONFLICT (job_name) DO UPDATE SET last_run_at = EXCLUDED.last_run_at
            """, (new_timestamp,))
            conn.commit()

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
    return {"status": "success", "rows_processed": rows_inserted}


def run_etl_http(request):
    try:
        print("[INFO] Cloud Function triggered via HTTP")
        result = run_daily_timeline_etl()
        print(f"[SUCCESS] Function completed with result: {result}")
        return json.dumps(result), 200
    except Exception as e:
        print(f"[ERROR] Function failed with exception: {e}")
        return json.dumps({"status": "error", "detail": str(e)}), 500