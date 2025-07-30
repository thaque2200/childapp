from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.agent_graph import build_agent
from app.services.auth_dependency import verify_firebase_token

router = APIRouter()
graph = build_agent()

@router.websocket("/ws/child-psychologist")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # 🔐 Step 1: Manual Firebase Auth check
    try:
        user = await verify_firebase_token(websocket)
    except Exception as e:
        await websocket.close(code=4401)
        return

    history = []

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            if not message:
                continue

            state = {
                "history": history,
                "new_message": message,
                "ready_to_answer": False,
                "followup_question": None,
                "final_guidance": None
            }

            result = await graph.ainvoke(state)
            history = result["history"]

            if result.get("ready_to_answer") and result.get("final_guidance"):
                await websocket.send_json({
                    "status": "complete",
                    "guidance": result["final_guidance"],
                    "history": history
                })
                await websocket.close()
                break
            else:
                await websocket.send_json({
                    "status": "incomplete",
                    "followup_question": result.get("followup_question"),
                    "history": history
                })

    except WebSocketDisconnect:
        print("WebSocket disconnected")