import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

raw_text = "Net Weight 500g. MRP Rs 50. Manufactured by Test Corp."
prompt = f"""
You are an expert Legal Metrology compliance assistant. Analyze the following OCR text from a packaged commodity label.
Extract the following fields and provide a feedback report.
Return ONLY a valid JSON object with the following structure:
{{
    "extracted_fields": {{
        "net_quantity": {{"value": "...", "confidence": 0.9}},
        "mrp": {{"value": "...", "confidence": 0.9}},
        "batch_details": {{"value": "...", "confidence": 0.9}},
        "manufacturer": {{"value": "...", "confidence": 0.9}},
        "mfg_date": {{"value": "...", "confidence": 0.9}},
        "consumer_care": {{"value": "...", "confidence": 0.9}},
        "common_name": {{"value": "...", "confidence": 0.9}}
    }},
    "ai_analysis": {{
        "executive_summary": "Brief summary of compliance based on extracted text.",
        "secondary_observations": ["observation 1", "observation 2"],
        "corrective_actions": ["action 1", "action 2"]
    }}
}}
If a field is missing, set its value to null. Provide confidence between 0.0 and 1.0.

OCR Text:
\"\"\"{raw_text}\"\"\"
"""
response = client.chat.completions.create(
    messages=[
        {"role": "system", "content": "You are a helpful assistant that outputs only valid JSON."},
        {"role": "user", "content": prompt}
    ],
    model="groq/compound",
    response_format={"type": "json_object"}
)
print(response.choices[0].message.content)
