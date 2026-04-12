from app.models.qwen import generate_response
import json
import re

def validate_post(subject: str, title: str, content: str, tags: list):
    """
    Validates only the academic nature of a forum post.
    Returns:
      - is_academic: bool
      - reason: str
      - verdict: "approved" if academic else "rejected"
    """
    input_data = {
        "subject": subject,
        "title": title,
        "content": content,
        "tags": tags
    }

    instruction = """You are an AI that determines if a forum post is academic.
ONLY OUTPUT VALID JSON with these keys: is_academic, reason, verdict.

DEFINITIONS:
- "is_academic" = true if the post is about any field of knowledge, learning, education, or intellectual skill.
  (programming, math, science, literature, history, psychology, engineering, research, etc.)
  Mark false ONLY for gossip, personal drama, entertainment, games, memes, politics not tied to learning, celebrity news.

- "verdict" = "approved" if is_academic is true, otherwise "rejected".

Return ONLY this JSON, no extra text:
{
  "is_academic": true/false,
  "reason": "brief explanation",
  "verdict": "approved/rejected"
}"""

    prompt = f"{instruction}\n\nInput: {json.dumps(input_data)}"

    raw = generate_response(prompt, max_new_tokens=200)

    # Extract JSON
    def extract_json(text):
        text = re.sub(r'```json\s*|\s*```', '', text, flags=re.IGNORECASE)
        start = text.find('{')
        if start == -1:
            return None
        brace_count = 0
        for i in range(start, len(text)):
            if text[i] == '{':
                brace_count += 1
            elif text[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    try:
                        return json.loads(text[start:i+1])
                    except:
                        return None
        return None

    result = extract_json(raw)
    if result is None:
        return {
            "is_academic": False,
            "reason": f"Failed to parse AI output. Raw: {raw[:200]}",
            "verdict": "rejected"
        }

    # Ensure required keys
    if "is_academic" not in result:
        result["is_academic"] = False
    if "reason" not in result:
        result["reason"] = "No reason provided"
    if "verdict" not in result:
        result["verdict"] = "rejected" if not result["is_academic"] else "approved"

    # Normalize
    result["verdict"] = "approved" if result["is_academic"] else "rejected"
    return result