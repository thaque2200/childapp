from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.save_chat import router as save_chat_router
from app.routes.chat_history import router as chat_history


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
app.include_router(save_chat_router)  
app.include_router(chat_history)  


@app.get("/")
def ping():
    return {"message": "Babycare backend is running"}