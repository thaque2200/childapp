from openai import AsyncOpenAI
from typing import List, Dict, Any
from app.services.read_secret import get_secret
import json

API_KEY = get_secret("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=API_KEY)

# Tool schema for structured symptom parsing
symptom_tool = {
    "type": "function",
    "function": {
        "name": "symptom_parser",
        "parameters": {
            "type": "object",
            "properties": {
                "primary_symptom": {"type": "string"},
                "duration": {"type": "string"},
                "age": {"type": "string"},
                "severity": {"type": "string"},
                "associated_symptoms": {"type": "array", "items": {"type": "string"}}
            },
            "required": []
        }
    }
}



# Symptom parser using LLM tool call
async def parse_symptom_with_llm(message: str) -> dict:
    res = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[
            {"role": "system", "content": "Extract structured symptom details."},
            {"role": "user", "content": message}
        ],
        tools=[symptom_tool],
        tool_choice={"type": "function", "function": {"name": "symptom_parser"}}
    )
    args = res.choices[0].message.tool_calls[0].function.arguments
    return json.loads(args)



async def is_primary_symptom_valid(symptom: str) -> bool:
    prompt = f"""
The term "{symptom}" was extracted as a primary symptom.

Is this a valid, specific pediatric symptom (like "fever", "rash", "vomiting")?
Vague terms like "not well", "feeling off", etc., are not valid primary symptom.
Reply with "yes" or "no". 
"""
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[{"role": "user", "content": prompt}]
    )

    return "yes" in response.choices[0].message.content.strip().lower()




# Get extra required fields for a given primary symptom
async def get_required_fields_from_llm(primary_symptom: str) -> List[str]:
    prompt = f"""
You are a pediatric triage assistant.

The primary symptom is: "{primary_symptom}".

In addition to these always-required clinically important fields:
["primary_symptom", "duration", "age", "associated_symptoms"]

Return a JSON array of at most **3 additional** clinically relevant and important fields to collect for this symptom.

Only return the array, no explanation or surrounding text.
Ensure the additional fields are distinct from the base 5.
"""

    response = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        result = json.loads(response.choices[0].message.content.strip())
        # Ensure result is a list and trimmed to max 3 elements
        if isinstance(result, list):
            return result[:3]
        return []
    except Exception:
        return []




async def generate_followup_questions_with_llm(missing_fields: List[str], primary_symptom: str) -> Dict[str, str]:
    prompt = f"""
You are a pediatric triage assistant.

The primary symptom is "{primary_symptom}".

For the following missing fields:
{json.dumps(missing_fields)}

Write one follow-up question per field in this JSON format:

{{
  "duration": "How long has it been going on?",
  "location": "Where is it located?"
}}

Be specific and clear. Only return a JSON object.
"""
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(response.choices[0].message.content.strip())
    except Exception:
        return {field: f"What is the value of '{field}'?" for field in missing_fields}
    




# Pediatric guidance generation
async def generate_guidance_with_llm(parsed: dict) -> str:
    prompt = f"""
You are a pediatrician. A parent has shared the following structured symptom information:

{json.dumps(parsed, indent=2)}

Using all of this information, please provide guidance that includes:
1. What the parent should do now
2. What symptoms or signs to monitor
3. When to seek urgent care

Be empathetic and concise.
"""

    response = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content





def build_dynamic_symptom_tool(required_fields: List[str]) -> Dict[str, Any]:
    # Predefined known fields with their types
    field_map = {
        "primary_symptom": {"type": "string"},
        "duration": {"type": "string"},
        "age": {"type": "string"},
        "severity": {"type": "string"},
        "location": {"type": "string"},
        "onset": {"type": "string"},
        "associated_symptoms": {"type": "array", "items": {"type": "string"}},
        "behavior_change": {"type": "string"},
        "frequency": {"type": "string"},
        "appearance": {"type": "string"},
        "immunization status": {"type": "string"},
        "hydration status": {"type": "string"},
        "temperature reading": {"type": "string"},
        "medication use": {"type": "string"},
        "recent travel history": {"type": "string"},
        "exposure to sick contacts": {"type": "string"},
    }

    dynamic_fields = {}

    for field in required_fields:
        if field in field_map:
            dynamic_fields[field] = field_map[field]
        else:
            # Default type for unknown fields
            dynamic_fields[field] = {"type": "string"}
            print(f"[INFO] Added missing field '{field}' with default type 'string'")

    return {
        "type": "function",
        "function": {
            "name": "symptom_parser",
            "parameters": {
                "type": "object",
                "properties": dynamic_fields,
                "required": []  # You may optionally add `required_fields` here
            }
        }
    }




# Merge follow-up message into symptom object using LLM
async def merge_symptom_update(existing: dict, new_message: str, required_fields: List[str]) -> dict:
    dynamic_tool = build_dynamic_symptom_tool(required_fields)

    print(f'dynamic tool: {dynamic_tool}')
    print(f'existing symptoms: {existing}')
    print(f'Required fields: {required_fields}')

    prompt = f"""
You are a pediatric triage assistant.

Here is the previously extracted structured symptom object:
{json.dumps(existing)}

The parent has now said: "{new_message}"

Please return an updated symptom object in JSON.

Rules:
- If the parent has said that there are *no other symptoms* (e.g., it contains phrases like "no other symptoms", "no associated symptoms", "none", "nothing else", "no symptoms"), then explicitly set:
  "associated_symptoms": ["none"]
- Otherwise, update or add any structured fields found in the message.
- Do not drop existing fields or override them.
"""

    res = await client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[{"role": "user", "content": prompt}],
        tools=[dynamic_tool],
        tool_choice={"type": "function", "function": {"name": "symptom_parser"}}
    )

    print(f'response from merge symptom update: {res}')

    return json.loads(res.choices[0].message.tool_calls[0].function.arguments)