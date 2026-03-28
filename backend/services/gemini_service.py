import asyncio
from groq import Groq
from backend.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are Popeye, a concise fitness AI coach. Rules:
- Keep all responses short and to the point (max 150 words)
- When giving workout plans, list ONLY the exercises in this format:
  Day 1:
  • Exercise — sets x reps
  • Exercise — sets x reps
- No long explanations, no filler text, no markdown headers
- For nutrition, give bullet points only
- For general questions, answer in 2-3 sentences max"""


async def generate_response(history: list[dict], user_message: str) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [
        {"role": msg["role"] if msg["role"] != "model" else "assistant", "content": msg["parts"][0]}
        for msg in history
    ]
    messages.append({"role": "user", "content": user_message})

    response = await asyncio.wait_for(
        asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=messages,
        ),
        timeout=30.0,
    )
    return response.choices[0].message.content
