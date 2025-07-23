# app/routes/intent.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.auth_dependency import verify_firebase_token
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer

router = APIRouter()

class ChatInput(BaseModel):
    message: str

@router.post("/intent")
async def intent_classify(input: ChatInput, user = Depends(verify_firebase_token)):
    question = input.message
    
    model = AutoModelForSequenceClassification.from_pretrained(
        "app/models/parenting_roberta_best", local_files_only=True
    )
    tokenizer = AutoTokenizer.from_pretrained(
        "app/models/parenting_roberta_tokenizer", local_files_only=True
    )

    clf = pipeline("text-classification", model=model, tokenizer=tokenizer)

    intent = clf(question)
    return {"response": intent}