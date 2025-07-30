from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.psychologist_route import router as psychologist_route

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(psychologist_route) 

@app.get("/")
def ping():
    return {"message": "Psychologist backend is running"}