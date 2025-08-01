from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
print("🧪 trying to import psychologist_route...")
from app.routes.psychologist_route import router as psychologist_route
print("✅ psychologist_route imported successfully")

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