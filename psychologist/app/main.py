from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from app.langgraph.agent_graph import build_agent
from app.services.auth_dependency import verify_firebase_token_wss

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/child-psychologist")
async def websocket_endpoint(websocket: WebSocket):
    # 🔐 Step 1: Manual Firebase Auth check    
    try:
        user = await verify_firebase_token_wss(websocket)
        print("🔐 Firebase auth successful")
    except Exception as e:
        print("❌ Firebase auth failed:", e)
        await websocket.close(code=4401)
        return
    
    graph = build_agent()
    print("⚡️ Connection accepting")
    await websocket.accept()
    print("⚡️ Connection accepted")

    history = []

    try:
        while True:
            print("⏳ Waiting for message from frontend...")
            data = await websocket.receive_json()
            print("📨 Received message from frontend:", data)
            message = data.get("message", "")
            if not message:
                print("⚠️ No message in payload")
                continue

            state = {
                "history": history,
                "new_message": message,
                "ready_to_answer": False,
                "followup_question": None,
                "final_guidance": None
            }
            print("🧠 Calling agent with state:", state)
            result = await graph.ainvoke(state)
            print("🧠 Agent result:", result)
            history = result["history"]

            if result.get("ready_to_answer") and result.get("final_guidance"):
                print("🎯 Sending final guidance and closing")
                await websocket.send_json({
                    "status": "complete",
                    "guidance": result["final_guidance"],
                    "history": history
                })
                await websocket.close()
                break
            else:
                print("🤖 Sending follow-up question")
                await websocket.send_json({
                    "status": "incomplete",
                    "followup_question": result.get("followup_question"),
                    "history": history
                })

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print("❗ Unexpected error:", e)
        await websocket.close()


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