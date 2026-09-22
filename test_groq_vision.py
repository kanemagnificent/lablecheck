import os
import json
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

image_path = "uploads/f787cc6b-82c3-43bc-b257-e96ae63c4cf1_05a6e125-f975-4043-aa19-a1a933a49ad8.jpg"
base64_image = encode_image(image_path)

try:
    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all the text you can read from this label."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        model="openai/gpt-oss-120b",
    )
    print("VISION SUCCESS!")
    print(response.choices[0].message.content)
except Exception as e:
    print("VISION FAILED:", e)
