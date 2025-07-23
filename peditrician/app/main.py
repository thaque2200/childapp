from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.telehealth import router as telehealth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telehealth_router) 

@app.get("/")
def ping():
    return {"message": "Peditrician backend is running"}