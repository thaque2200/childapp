from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.auth_dependency import verify_firebase_token, verify_firebase_token_wss
from app.langgraph.agent_graph import build_agent
    

router = APIRouter()
graph = build_agent()


@router.websocket("/ws/child-psychologist")
async def websocket_endpoint(websocket: WebSocket):
    try:
        user = await verify_firebase_token_wss(websocket)
        print(f"🔐 Firebase auth successful for user: {user.get('uid', 'unknown')}")
    except Exception as e:
        print("❌ Firebase auth failed:", e)
        await websocket.close(code=4401)
        return

    await websocket.accept()
    print("⚡️ WebSocket connection accepted")

    history = []

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                print("🔌 Client disconnected")
                break

            message = data.get("message")
            if not message:
                continue

            # 1️⃣ Prepare agent state
            state = {
                "history": history,
                "new_message": message,
                "ready_to_answer": False,
                "followup_question": None,
                "final_guidance": None
            }

            # 2️⃣ Invoke agent
            result = await graph.ainvoke(state)

            # 3️⃣ Append user turn
            history.append({"role": "user", "content": message})

            # 4️⃣ Handle response
            if result.get("ready_to_answer") and result.get("final_guidance"):
                reply = result["final_guidance"]
                history.append({"role": "assistant", "content": reply})
                await websocket.send_json({
                    "status": "complete",
                    "guidance": reply,
                    "history": history,
                })
                # 🔹 Do not close; frontend will close after complete
            else:
                reply = result.get("followup_question")
                if reply:
                    history.append({"role": "assistant", "content": reply})
                await websocket.send_json({
                    "status": "incomplete",
                    "followup_question": reply,
                    "history": history,
                })

    except Exception as e:
        print(f"❗ Unexpected server error: {e}")
        try:
            await websocket.send_json({"status": "error", "message": str(e)})
        finally:
            await websocket.close()