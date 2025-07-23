import os
import psycopg2
from google.cloud.sql.connector import Connector
import json

# Create connector instance
connector = Connector()

def getconn() -> psycopg2.extensions.connection:
    
    # ✅ Read the JSON string from environment variable (injected via --update-secrets)
    db_config_str = os.environ.get("DB_CONFIG")
    if not db_config_str:
        raise RuntimeError("DB_CONFIG env var not found")

    try:
        db_config = json.loads(db_config_str)
    except Exception as e:
        raise RuntimeError(f"Invalid DB_CONFIG format: {e}")

    # Extract values
    db_name = db_config["DB_NAME"]
    instance_name = db_config["INSTANCE_CONNECTION_NAME"]
    # db_user= db_config["DB_USER"]

    db_user = db_config["DB_USER"]  # e.g. "backend-access-all@axial-trail-460618-u6.iam"
    db_password = db_config["DB_PASSWORD"] 
    # Connect using IAM auth
    # conn = connector.connect(
    #     instance_name,
    #     "pg8000",  # or psycopg2
    #     db=db_name,
    #     user=db_user,
    #     enable_iam_auth=True
    # )

    conn = connector.connect(
    instance_name,
    driver="pg8000",
    db=db_name,
    user=db_user,
    password=db_password,
    ip_type="PRIVATE",  # 👈 required for private IP
    enable_iam_auth=False  # Disable IAM auth
    )

    return conn