# from langgraph.graph import StateGraph, END
# from typing import Annotated, Dict, List, Literal, Union, TypedDict
# from app.langgraph.tools import check_context_completeness, generate_psychological_guidance
# from langchain_core.runnables import RunnableLambda


# class AgentState(TypedDict):
#     history: List[Dict[str, str]]
#     new_message: str
#     ready_to_answer: bool
#     followup_question: Union[str, None]
#     final_guidance: Union[str, None]

# def add_user_message(state: AgentState) -> AgentState:
#     state["history"].append({"role": "user", "content": state["new_message"]})
#     return state

# def planner(state: AgentState) -> str:
#     if state.get("ready_to_answer"):
#         return "generate_guidance"
#     return "check_completeness"

# async def check_completeness_node(state: AgentState) -> AgentState:
#     result = await check_context_completeness(state["history"], state["new_message"])
#     return {
#         **state,
#         "ready_to_answer": result["ready_to_answer"],
#         "followup_question": result.get("followup_question"),
#     }

# async def generate_guidance_node(state: AgentState) -> AgentState:
#     final = await generate_psychological_guidance(state["history"], state["new_message"])
#     return {
#         **state,
#         "final_guidance": final,
#     }


# def build_agent():
#     builder = StateGraph(AgentState)

#     builder.add_node("add_user_message", add_user_message)
#     builder.add_node("planner", planner)  # ✅ plain function
#     builder.add_node("check_completeness", check_completeness_node)
#     builder.add_node("generate_guidance", generate_guidance_node)

#     builder.set_entry_point("add_user_message")
#     builder.add_edge("add_user_message", "planner")
#     builder.add_conditional_edges("planner", {
#         "check_completeness": "check_completeness",
#         "generate_guidance": "generate_guidance"
#     })

#     builder.add_edge("check_completeness", END)
#     builder.add_edge("generate_guidance", END)

#     return builder.compile()


from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Union

class AgentState(TypedDict):
    history: List[Dict[str, str]]
    new_message: str
    ready_to_answer: bool
    followup_question: Union[str, None]
    final_guidance: Union[str, None]

def add_user_message(state: AgentState) -> AgentState:
    state["history"].append({"role": "user", "content": state["new_message"]})
    return state

def planner(state: AgentState) -> str:
    return "generate_guidance" if state.get("ready_to_answer") else "check_completeness"

async def check_completeness_node(state: AgentState) -> AgentState:
    return {
        **state,
        "ready_to_answer": False,
        "followup_question": "Can you clarify the child’s behavior?"
    }

async def generate_guidance_node(state: AgentState) -> AgentState:
    return {
        **state,
        "final_guidance": "Here is some guidance."
    }

def build_agent():
    builder = StateGraph(AgentState)

    builder.add_node("add_user_message", add_user_message)
    builder.add_node("planner", planner)  # ✅ plain function
    builder.add_node("check_completeness", check_completeness_node)
    builder.add_node("generate_guidance", generate_guidance_node)

    builder.set_entry_point("add_user_message")
    builder.add_edge("add_user_message", "planner")

    # ✅ Use function objects here
    builder.add_conditional_edges("planner", {
        "check_completeness": check_completeness_node,
        "generate_guidance": generate_guidance_node
    })

    builder.add_edge("check_completeness", END)
    builder.add_edge("generate_guidance", END)

    return builder.compile()
