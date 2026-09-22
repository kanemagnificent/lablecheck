import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)
try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Say hello"}],
        model="openai/gpt-oss-120b",
    )
    print("Success:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
