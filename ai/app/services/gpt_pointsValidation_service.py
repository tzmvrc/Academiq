import json
import re
from app.models.gpt import client


def extract_json(text: str):
    """
    Extracts the first valid JSON block from the model output.
    Prevents failure when the model returns text before/after JSON.
    """
    try:
        # Try direct JSON parse
        return json.loads(text)
    except:
        pass

    # Fallback → extract { ... } using regex
    json_match = re.search(r"\{[\s\S]*\}", text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except:
            return None

    return None


def validate_points(forum_title, forum_content, comment_text, existing_comments=None):

    if existing_comments is None:
        existing_comments = []

    prompt = f"""
You are an AI that evaluates academic forum comments.

==================== MAIN GOALS ====================
1. Determine if the new comment is related to the forum discussion.
2. Detect if the idea duplicates earlier comments.
3. Award points from 0–10.
4. Explain your reasoning.

==================== POINT RULES ====================
10 points → unique, insightful, well-explained  
7–9 points → relevant and useful  
4–6 points → relevant but basic or overlaps with others  
1–3 points → barely relevant or low-effort  
0 points → irrelevant, spam, or pure duplicate with no new value

==================== OUTPUT FORMAT ====================
Return ONLY a JSON object in this exact structure:
{{
  "is_related": true/false,
  "is_duplicate": true/false,
  "awarded_points": number,
  "reason": "explain decision briefly",
  "raw_output": "copy the pure reasoning you used"
}}

==================== DATA TO ANALYZE ====================
Forum Title: {forum_title}

Forum Content:
{forum_content}

Existing Comments:
{json.dumps(existing_comments, indent=2)}

New Comment:
{comment_text}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You evaluate comment relevance, duplication, and award points strictly in JSON format."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=400,
        temperature=0
    )

    raw = response.choices[0].message.content.strip()
    parsed = extract_json(raw)

    if parsed is None:
        return {
            "is_related": False,
            "is_duplicate": False,
            "awarded_points": 0,
            "reason": "Failed to parse AI JSON output.",
            "raw_output": raw
        }

    # Add raw output for debugging
    parsed["raw_output"] = raw
    return parsed
