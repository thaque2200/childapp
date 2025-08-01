from app.langgraph.agent_graph import build_agent

graph = build_agent()

async def run_agent_loop():
    history = []
    while True:
        # 1️⃣ Get user input
        message = input("👤 You: ").strip()
        if not message:
            continue

        # 2️⃣ Prepare agent state (history doesn't include new user yet)
        state = {
            "history": history,
            "new_message": message,
            "ready_to_answer": False,
            "followup_question": None,
            "final_guidance": None
        }

        # 3️⃣ Call agent
        result = await graph.ainvoke(state)

        # 4️⃣ Append user to history
        history.append({"role": "user", "content": message})

        # 5️⃣ Handle assistant response
        if result.get("ready_to_answer") and result.get("final_guidance"):
            reply = result["final_guidance"]
            history.append({"role": "assistant", "content": reply})
            print(f"🤖 Assistant (Final): {reply}")
            break
        else:
            followup = result.get("followup_question")
            if followup:
                history.append({"role": "assistant", "content": followup})
                print(f"🤖 Assistant (Follow-up): {followup}")