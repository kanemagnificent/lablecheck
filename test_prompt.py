import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

raw_text = """
Strawberry Blast FLAVORED ICE CREAM
NET QUANTITY: 550 g
MRP Rs 300
Batch: GC2628DKK1
Mfg Date: 28/MAR/26
Customer care: 18001234567
Manufactured by: Awesome Foods Ltd, Mumbai, Maharashtra
"""

prompt = f"""
You are an expert Legal Metrology compliance assistant. Analyze the following OCR text from a packaged commodity label.
Extract the following fields and provide a feedback report.
Return ONLY a valid JSON object with the following structure:
{{
    "extracted_fields": {{
        "net_quantity": {{"value": "extracted value or null", "confidence": 0.9}},
        "mrp": {{"value": "extracted value or null", "confidence": 0.9}},
        "batch_details": {{"value": "extracted value or null", "confidence": 0.9}},
        "manufacturer": {{"value": "extracted value or null", "confidence": 0.9}},
        "mfg_date": {{"value": "extracted value or null", "confidence": 0.9}},
        "consumer_care": {{"value": "extracted value or null", "confidence": 0.9}},
        "common_name": {{"value": "extracted product name or null", "confidence": 0.9}}
    }},
    "ai_analysis": {{
        "executive_summary": "Brief summary of compliance based on extracted text.",
        "secondary_observations": ["observation 1", "observation 2"],
        "corrective_actions": ["action 1", "action 2"]
    }}
}}
IMPORTANT: If a field is not found in the OCR text, set its "value" strictly to null. Do NOT output "..." or "extracted value or null". Populate with real data from the text. Provide confidence between 0.0 and 1.0.

OCR Text:
\"\"\"{raw_text}\"\"\"
"""

response = client.chat.completions.create(
    messages=[
        {"role": "system", "content": "You are a helpful assistant that outputs only valid JSON."},
        {"role": "user", "content": prompt}
    ],
    model="openai/gpt-oss-120b",
    response_format={"type": "json_object"}
)
print(response.choices[0].message.content)
