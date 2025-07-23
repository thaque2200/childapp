from app import firebase_config  # ensures SDK is initialized
from fastapi import Depends, HTTPException, Request
from firebase_admin import auth

async def verify_firebase_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    id_token = auth_header.split(" ")[1]

    try:
        decoded_token = auth.verify_id_token(id_token)
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email", "unknown"),
        }
    except Exception as e:
        print("Token verification failed:", e)
        raise HTTPException(status_code=401, detail="Token verification failed")