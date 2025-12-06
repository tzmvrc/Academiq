from app.models.qwen import generate_response
import json
import re

def clean_ai_output(text: str) -> str:
    """
    Removes ```json ``` and other code block markers
    and trims whitespace so JSON can be parsed.
    """
    # Remove ```json or ``` in any form
    text = re.sub(r"```json|```", "", text, flags=re.IGNORECASE)
    return text.strip()


def validate_comment_topic(title: str, content: str, comment: str):
    """
    Validates if a user's comment is related to the forum's topic.
    Returns:
    {
        "is_related": true/false,
        "reason": "text",
        "verdict": "approved/rejected"
    }
    """

    prompt = f"""
You are an AI that checks if a student's COMMENT is related to a forum's TOPIC.
ONLY OUTPUT RAW JSON. Do NOT use code blocks. Do NOT wrap JSON in backticks. No explanations.

DEFINITIONS:
- "is_related" = true if the comment logically connects to the forum's title & content.
- "is_related" = false if the comment is off-topic, irrelevant, random, or unrelated.

VERDICT RULE:
- verdict = "approved" ONLY if is_related is true.
- verdict = "rejected" if the comment is unrelated or off-topic.

Return ONLY this JSON:

{{
  "is_related": true/false,
  "reason": "Brief explanation",
  "verdict": "approved/rejected"
}}

ANALYZE:

Forum Title: {title}
Forum Content: {content}
User Comment: {comment}

Return ONLY JSON. No code blocks.
"""

    raw = generate_response(prompt)
    cleaned = clean_ai_output(raw)

    try:
        return json.loads(cleaned)
    except:
        return {
            "is_related": False,
            "reason": "Failed to parse AI output",
            "verdict": "rejected",
            "raw_output": raw  # Keep raw output for debugging
        }
