import os
import json
from google.cloud import secretmanager
import google.auth
from google.auth.exceptions import DefaultCredentialsError

# Optional in-memory cache to avoid repeated secret fetches
_secret_cache = {}

try:
    client = secretmanager.SecretManagerServiceClient()
    _, project_id = google.auth.default()
except DefaultCredentialsError:
    client = None
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "unknown-project")

def get_secret(name: str) -> str | None:
    """
    Retrieves a secret either from an env var or GCP Secret Manager.
    Uses in-memory cache to avoid multiple API calls for the same secret.
    """
    # Return cached secret if available
    if name in _secret_cache:
        return _secret_cache[name]

    val = os.getenv(name)
    if val and val.startswith("projects/") and client:
        try:
            response = client.access_secret_version(request={"name": val})
            secret = response.payload.data.decode("utf-8")
            _secret_cache[name] = secret
            return secret
        except Exception as e:
            print(f"[read_secret] Failed to access secret {val}: {e}")
            return None

    # Return value directly (could be raw value or fallback)
    _secret_cache[name] = val
    return val

