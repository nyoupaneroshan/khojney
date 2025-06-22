# File: llm_server.py (The Final, Focused Version)
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import ollama
import json
import re

LLM_MODEL = 'llama3.1:latest'
app = FastAPI(title="Khojney Simple Extraction API")

class OcrInput(BaseModel):
    raw_text: str

def create_simple_extraction_prompt(text: str) -> str:
    """A much simpler, more direct prompt for basic extraction."""
    prompt = f"""
    You are a data extraction tool. Your only task is to analyze the following text and extract every multiple-choice question and its corresponding options.

    ### INSTRUCTIONS
    - Find every item that starts with a number like "512.".
    - Extract the full question text.
    - Extract all options associated with that question.
    - Format the output as a JSON array of objects.
    - Each object must have ONLY these keys: "sn", "question", "options".

    ### EXAMPLE
    Input Text:
    ---
    512. सम्राट अशोक कहिले नेपालआएका थिए ? (A) इ.पू. २५० (B) इ.पू. २५२
    513. अर्को प्रश्न? (A) विकल्प १ (B) विकल्प २
    ---
    Required JSON Output:
    ```json
    [
      {{
        "sn": "512",
        "question": "सम्राट अशोक कहिले नेपालआएका थिए ?",
        "options": "(A) इ.पू. २५० (B) इ.पू. २५२"
      }},
      {{
        "sn": "513",
        "question": "अर्को प्रश्न?",
        "options": "(A) विकल्प १ (B) विकल्प २"
      }}
    ]
    ```

    ### YOUR TASK
    Process this text and return ONLY the JSON array:
    ---
    {text}
    ---
    """
    return prompt

@app.post("/extract")
def extract_text_endpoint(ocr_input: OcrInput):
    """Receives raw text, uses the LLM for simple extraction, and returns basic JSON."""
    print("--- Received text. Sending to LLM for simple extraction... ---")
    prompt = create_simple_extraction_prompt(ocr_input.raw_text)
    
    try:
        response = ollama.chat(
            model=LLM_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            format='json',
            options={'temperature': 0.0}
        )
        llm_output = json.loads(response['message']['content'])
        print(f"--- LLM extraction successful. Found {len(llm_output)} items. ---")
        return {"extracted_data": llm_output}
    except Exception as e:
        print(f"!!! An error occurred during LLM extraction: {e} !!!")
        return {"error": "LLM extraction failed.", "details": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)