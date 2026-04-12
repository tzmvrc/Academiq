import json
import re
from app.models.gemini_client import gemini_client

def validate_post_gemini(subject: str, title: str, content: str, tags: list) -> dict:
    prompt = f"""
You are an AI that validates academic forum posts.
ONLY OUTPUT VALID JSON. Do not add explanations.
Do not repeat the instructions. Do not add code blocks.

DEFINITIONS:
- "is_academic" = true if the post is about any field of knowledge, learning, education, or intellectual skill.
  This includes topics such as: programming, mathematics, science, English, literature, history, psychology,
  engineering, technology, research, academic writing, and other subject-based or skill-based learning questions.
  It does NOT need to mention school or classes to be considered academic.
  
  Mark is_academic = false ONLY if the post is about:
  - gossip, personal drama, reactions, entertainment, games, memes, politics not tied to learning,
    celebrity news, or any topic unrelated to learning or knowledge.

- "is_consistent" = true if Subject, Title, Tags, and Content all match the same topic without contradictions.

VERDICT RULE:
- verdict = "approved" ONLY if both is_academic and is_consistent are true.
- Otherwise, verdict = "rejected".

Respond ONLY in this exact JSON structure:

{{
  "is_academic": true/false,
  "reason": "Brief explanation.",
  "is_consistent": true/false,
  "issues": ["List issues if inconsistent or unclear."],
  "verdict": "approved/rejected"
}}

Now analyze the post:

Subject: {subject}
Title: {title}
Content: {content}
Tags: {tags}

Return ONLY the JSON.
"""
    try:
        raw = gemini_client.generate(prompt)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "is_academic": False,
                "reason": "Failed to parse JSON",
                "is_consistent": False,
                "issues": [raw[:200]],
                "verdict": "rejected"
            }
    except Exception as e:
        result = {
            "is_academic": False,
            "reason": f"Gemini error: {str(e)[:150]}",
            "is_consistent": False,
            "issues": ["API error"],
            "verdict": "rejected"
        }
    # Ensure all keys present
    for key in ["is_academic", "reason", "is_consistent", "issues", "verdict"]:
        if key not in result:
            result[key] = None if key != "issues" else []
    if result.get("verdict") not in ["approved", "rejected"]:
        result["verdict"] = "rejected"
    return result