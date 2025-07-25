import os
import psycopg2
from google.cloud.sql.connector import Connector
import json

# Create connector instance
connector = Connector()

def getconn() -> psycopg2.extensions.connection:
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
    conn = connector.connect(
        instance_name,
        driver="psycopg2",
        db=db_name,
        user=db_user,
        password=db_password,
        ip_type="PRIVATE",  # required
        enable_iam_auth=False,
        timeout=30
    )

    # conn = connector.connect(
    # instance_name,
    # driver="pg8000",
    # db=db_name,
    # user=db_user,
    # password=db_password,
    # ip_type="PRIVATE",  # 👈 required for private IP
    # enable_iam_auth=False  # Disable IAM auth
    # )

    print("[DEBUG] Connection established")
    return conn