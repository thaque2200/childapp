from langgraph.graph import StateGraph, END, START
from typing import Dict, List, Union, TypedDict
from app.langgraph.tools import check_context_completeness, generate_psychological_guidance


class AgentState(TypedDict):
    history: List[Dict[str, str]]
    new_message: str
    ready_to_answer: bool
    followup_question: Union[str, None]
    final_guidance: Union[str, None]


async def check_completeness_node(state: AgentState) -> AgentState:
    """Asks tools whether we have enough context to answer, or need follow-ups."""
    result = await check_context_completeness(state["history"], state["new_message"])
    return {
        **state,
        "ready_to_answer": result["ready_to_answer"],
        "followup_question": result.get("followup_question"),
    }


async def check_completeness_decision_node(state: AgentState) -> AgentState:
    if state['ready_to_answer']:
        return "generate_guidance"
    else:
        return END


async def generate_guidance_node(state: AgentState) -> AgentState:
    """Generates final psychological guidance when ready."""
    final = await generate_psychological_guidance(state["history"], state["new_message"])
    return {
        **state,
        "final_guidance": final,
    }


def build_agent():
    """Builds a stateless LangGraph agent that relies on external history management."""
    builder = StateGraph(AgentState)

    builder.add_node("check_completeness", check_completeness_node)
    builder.add_node("generate_guidance", generate_guidance_node)
    builder.add_edge(START, "check_completeness")
    builder.add_conditional_edges("check_completeness", check_completeness_decision_node, {"generate_guidance": "generate_guidance", END: END})
    builder.add_edge("generate_guidance", END)

    return builder.compile()