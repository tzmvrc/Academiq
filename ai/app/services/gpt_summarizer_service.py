import os
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def summarize_content(content):
    if not content or (isinstance(content, list) and len(content) == 0):
        return {
            "summary": "No content provided.",
            "original_word_count": 0,
            "summary_word_count": 0
        }

    # Removing usernames
    if isinstance(content, list):
        combined_text = "\n".join(
            "- " + re.sub(r'^[^:]+:\s*', '', c).strip()
            for c in content
        )
    else:
        combined_text = content.strip()

    original_word_count = len(combined_text.split())

    prompt = f"""
You are an AI that summarizes a thread of user comments from an academic discussion forum.

YOUR GOALS:
- Produce a single, unified paragraph.
- Rewrite ideas in your own words.
- Capture the main agreements, disagreements, and concerns.
- Remove usernames and personal identifiers.
- Do NOT simply stitch the sentences together — transform them into a coherent summary.
- Tone must be neutral, objective, and academic.
- Avoid quoting the original text directly.

STRUCTURE RULES:
1. Start the summary with: "This thread discusses..."
2. Mention the main positive or supportive viewpoints first.
3. Then mention concerns, disagreements, or opposing perspectives.
4. End with a neutral concluding sentence.
5. Keep the output between 3–5 sentences.

STYLE RULES:
- No bullet points
- No quotes
- No usernames
- No personal opinions
- Use simple, clear language
- Use smooth transitions (e.g., "However", "On the other hand", "Meanwhile", "Overall")

Here are the comments to summarize:

{combined_text}
"""


    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You summarize discussions clearly and neutrally."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=200,
        temperature=0.4
    )

    summary_text = response.choices[0].message.content.strip()
    summary_word_count = len(summary_text.split())

    print_summary(summary_text)

   
    return {
        "summary": summary_text,
        "original_word_count": original_word_count,
        "summary_word_count": summary_word_count
    }



def print_summary(summary):
    print("\n--------------------------------------------------")
    print("summary:", summary)
    print("--------------------------------------------------\n")
