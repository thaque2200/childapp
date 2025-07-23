from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.intent_classification import router as intent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
app.include_router(intent) 

@app.get("/")
def ping():
    return {"message": "Babycare backend is running"}