from openai import AsyncOpenAI
from app.services.read_secret import get_secret
import json

API_KEY = get_secret("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=API_KEY)

async def check_context_completeness(history, new_message):
    prompt = f"""
You are a child psychologist assistant. A parent is seeking guidance about their child's mental health.

Here is the full conversation history:
{json.dumps(history, indent=2)}

Here is the latest message from the parent:
"{new_message}"

Based on all the above, do you have enough information to give helpful psychological guidance?

If yes, respond:
{{
  "ready_to_answer": true,
  "followup_question": null
}}

If no, respond:
{{
  "ready_to_answer": false,
  "followup_question": "Ask ONE clear, empathetic follow-up that will help you gather what's missing."
}}

Respond only with the JSON.
"""

    response = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.choices[0].message.content.strip())

async def generate_psychological_guidance(history, new_message):
    prompt = f"""
You are a child psychologist. A parent has shared the following concern about their child.

Here is the conversation history:
{json.dumps(history, indent=2)}

Here is the latest message from the parent:
"{new_message}"

Provide empathetic, professional, and concise guidance. Include:
1. Suggested actions for the parent
2. What signs to monitor
3. When to seek professional help

Respond in natural language only.
"""

    response = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()
