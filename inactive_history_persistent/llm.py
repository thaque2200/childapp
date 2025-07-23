from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import torch

# Local model directory (downloaded beforehand)
model_dir = "models/flan-t5-small"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForSeq2SeqLM.from_pretrained(model_dir)

# Build summarization pipeline
summarizer = pipeline("text2text-generation", model=model, tokenizer=tokenizer, device=-1)

def ask_llm(messages: list[dict]) -> str:
    print("Using flan-t5-small for summarization")

    # Compose a single string prompt from the messages
    prompt = ""
    for msg in messages:
        if msg["role"] == "system":
            prompt += f"Instruction: {msg['content']}\n\n"
        elif msg["role"] == "user":
            prompt += f"Input: {msg['content']}\n\n"
    prompt = prompt.strip()

    # Generate response
    outputs = summarizer(
        prompt,
        max_new_tokens=512,
        do_sample=False,
        temperature=0.3,
        return_full_text=False,
    )
    return outputs[0]["generated_text"].strip()
