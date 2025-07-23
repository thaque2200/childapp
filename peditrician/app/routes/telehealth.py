from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
from app.services.peditrician_telehealth import (
    parse_symptom_with_llm,
    generate_guidance_with_llm,
    merge_symptom_update,
    get_required_fields_from_llm,
    generate_followup_questions_with_llm,
    is_primary_symptom_valid
)
from app.services.auth_dependency import verify_firebase_token

router = APIRouter()

BASE_REQUIRED_FIELDS = ["primary_symptom", "duration", "age", "severity", "associated_symptoms"]

class UserInput(BaseModel):
    message: str


class FollowupInput(BaseModel):
    primary_symptom_available: bool
    new_message: str
    existing_symptom: Dict[str, Any]
    required_fields: List[str]
    followups: Dict[str, Any]


@router.post("/pediatrician")
async def pediatrician_agent(input: UserInput, user=Depends(verify_firebase_token)):
    uid = user["uid"]

    # Step 1: Extract structured symptoms (run once)
    structured = await parse_symptom_with_llm(input.message)
    primary = structured.get("primary_symptom", "").strip().lower()

    if not primary or not is_primary_symptom_valid(primary):
            final_json = {
                    "status": "incomplete",
                    "missing_fields": [],
                    "followup_questions": {"primary_symptom": "Your question is vague, please provide more details starting with some symptoms"},
                    "parsed_symptom": {},
                    "required_fields": [],
                    "primary_symptom_available": False
                }
            print(f'Zero: {final_json}')
            return final_json

    else:
        extra_required = await get_required_fields_from_llm(primary)
        base_required = BASE_REQUIRED_FIELDS.copy()
        required_fields = list(set(base_required + extra_required))

        print(f'First Required Field Peditrician LLM Formulated: {required_fields}')

        # Step 3: Identify missing fields
        missing_fields = [field for field in required_fields if not structured.get(field)]

        if missing_fields:
            # Step 4: Generate follow-up questions once, only for the missing fields
            followups = await generate_followup_questions_with_llm(missing_fields, primary)
            final_json = {
                "status": "incomplete",
                "missing_fields": missing_fields,
                "followup_questions": followups,
                "parsed_symptom": structured,
                "required_fields": required_fields,  # optional: useful for frontend or logging
                "primary_symptom_available": True
            }
            print(f'First: {final_json}')
            return final_json
        
        else:
            # Step 5: Generate final guidance using full structured object
            guidance = await generate_guidance_with_llm(structured)
            final_json = {
                "status": "complete",
                "parsed_symptom": structured,
                "guidance": guidance
            }
            print(f'Second: {final_json}')
            return final_json
    


@router.post("/pediatrician/update")
async def pediatrician_update(input: FollowupInput, user=Depends(verify_firebase_token)):
    uid = user["uid"]

    primary_symptom_available = input.primary_symptom_available

    print(f'Input from frontEnd: {input}')

    if primary_symptom_available:

        required_fields = input.required_fields
        print(f'Required Field Peditrician Update EndPoint, Returned by FrontEnd: {required_fields}')

        # Step 1: Merge new message into structured symptom
        updated = await merge_symptom_update(input.existing_symptom, input.new_message, input.required_fields)

        print(f'Updated strctured symptoms, backend update (First): {updated}')

        # Step 2: Identify missing fields
        missing_fields = [f for f in required_fields if not updated.get(f)]

        print(f'Missing Fields, backend update (First): {updated}')

        if missing_fields:
            followup_questions = input.followups
            filtered_followups = {key: followup_questions[key] for key in missing_fields if key in followup_questions}
            final_json = {
                "status": "incomplete",
                "missing_fields": missing_fields,
                "followup_questions": filtered_followups,
                "parsed_symptom": updated,
                "required_fields": required_fields,
                "primary_symptom_available": True
            }
            print(f'Third: {final_json}')
            return final_json

        else:
            # Step 6: Final guidance
            guidance = await generate_guidance_with_llm(updated)
            final_json = {
                "status": "complete",
                "parsed_symptom": updated,
                "guidance": guidance
            }
            print(f'Fourth: {final_json}')
            return final_json
        
    else:
        structured = await parse_symptom_with_llm(input.new_message)
        primary = structured.get("primary_symptom", "").strip().lower()

        if not primary or not is_primary_symptom_valid(primary):
            final_json = {
                    "status": "incomplete",
                    "missing_fields": [],
                    "followup_questions": {"primary_symptom": "Your question is vague, please provide more details starting with some symptoms"},
                    "parsed_symptom": {},
                    "required_fields": [],
                    "primary_symptom_available": False
                }
            print(f'Fifth: {final_json}')
            return final_json

        else:
            extra_required = await get_required_fields_from_llm(primary)
            base_required = BASE_REQUIRED_FIELDS.copy()
            required_fields = list(set(base_required + extra_required))

            # Step 3: Identify missing fields
            missing_fields = [field for field in required_fields if not structured.get(field)]

            if missing_fields:
                # Step 4: Generate follow-up questions once, only for the missing fields
                followups = await generate_followup_questions_with_llm(missing_fields, primary)
                final_json = {
                    "status": "incomplete",
                    "missing_fields": missing_fields,
                    "followup_questions": followups,
                    "parsed_symptom": structured,
                    "required_fields": required_fields,  # optional: useful for frontend or logging
                    "primary_symptom_available": True
                }
                print(f'Sixth: {final_json}')
                return final_json
            
            else:
                # Step 5: Generate final guidance using full structured object
                guidance = await generate_guidance_with_llm(structured)
                final_json = {
                    "status": "complete",
                    "parsed_symptom": structured,
                    "guidance": guidance
                }
                print(f'Seventh: {final_json}')
                return final_json
            
