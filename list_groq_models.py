import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")

req = urllib.request.Request("https://api.groq.com/openai/v1/models")
req.add_header("Authorization", f"Bearer {api_key}")

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for model in data.get("data", []):
            if "vision" in model["id"].lower():
                print(model["id"])
except Exception as e:
    print(e)
