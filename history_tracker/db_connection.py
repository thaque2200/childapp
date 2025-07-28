import os
import psycopg2
from google.cloud.sql.connector import Connector
import json

# Declare connector globally, but don't initialize it yet
connector = None

def getconn() -> psycopg2.extensions.connection:
    global connector
    # Lazy-initialize the Connector instance only when getconn is first called
    if connector is None:
        print("[DEBUG] Initializing Cloud SQL Connector (lazy init of instance)")
        connector = Connector(refresh_strategy="lazy")

    print("[DEBUG] Reading DB_CONFIG from env")
    db_config_str = os.environ.get("DB_CONFIG")
    if not db_config_str:
        raise RuntimeError("DB_CONFIG env var not found")

    try:
        db_config = json.loads(db_config_str)
        print(f"[DEBUG] Parsed DB_CONFIG with keys: {list(db_config.keys())}")
    except Exception as e:
        raise RuntimeError(f"Invalid DB_CONFIG format: {e}")

    db_name = db_config["DB_NAME"]
    instance_name = db_config["INSTANCE_CONNECTION_NAME"]
    db_user = db_config["DB_USER"]
    db_password = db_config["DB_PASSWORD"]

    print("[DEBUG] Connecting to Cloud SQL...")
    try:
        conn = connector.connect(
            instance_name,
            driver="psycopg2",
            db=db_name,
            user=db_user,
            password=db_password,
            ip_type="PRIVATE",
            enable_iam_auth=False,
            timeout=60 # Keep this higher for initial debugging, then reduce if stable
        )
        print("[DEBUG] Connection established")
        return conn
    except psycopg2.OperationalError as e:
        print(f"[ERROR] Psycopg2 OperationalError during connection: {e}")
        raise
    except Exception as e:
        print(f"[ERROR] Unexpected error during connection: {e}")
        raise

# Your Cloud Function entry point
def run_etl_http(request):
    try:
        conn = getconn()
        # ... your ETL logic here ...
        conn.close()
        return "ETL process completed successfully!", 200
    except Exception as e:
        print(f"Error during ETL process: {e}")
        return f"Error: {e}", 500