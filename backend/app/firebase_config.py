# app/firebase_config.py
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase using Application Default Credentials (ADC)
# This will work in Cloud Run with a proper service account
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)
