print("✅ psychologist_route.py loaded")

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.langgraph.agent_graph import build_agent
from app.services.auth_dependency import verify_firebase_token, verify_firebase_token_wss

router = APIRouter()
graph = build_agent()

@router.websocket("/ws/child-psychologist")
async def websocket_endpoint(websocket: WebSocket):
    # 🔐 Step 1: Manual Firebase Auth check
    try:
        user = await verify_firebase_token_wss(websocket)
        print("🔐 Firebase auth successful")
    except Exception as e:
        print("❌ Firebase auth failed:", e)
        await websocket.close(code=4401)
        return
    
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