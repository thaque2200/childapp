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



@app.websocket("/debug")
async def debug_ws(websocket: WebSocket):
    print("🧪 Debug handler activated")
    await websocket.accept()
    await websocket.send_text("connected - type 'close' to exit")

    try:
        while True:
            message = await websocket.receive_text()
            print(f"🗣️ Received message: {message}")

            if "close" in message.lower():
                await websocket.send_text("👋 Closing connection as requested.")
                await websocket.close()
                print("🔒 WebSocket connection closed by user request")
                break
            else:
                await websocket.send_text(f"Echo: {message}")

    except WebSocketDisconnect:
        print("❌ Client disconnected unexpectedly.")