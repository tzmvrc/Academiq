# app/services/qwen_verifier_service.py
from app.models.qwen import generate_response
from app.services.search_service import search_web
import json
import re

def verify_comment(forum_title: str, forum_content: str, comment: str):
    """
    Verifies a user comment:
    1. Checks if it's relevant to the forum topic.
    2. Checks if it can be confirmed by top search results.
    Returns a JSON dict with:
      - status: "verified", "not_verified", "unrelated"
      - source_url: string if verified, else None
      - reason: explanation
    """

    # 🔹 Step 1: Search for relevant sources
    query = f"{forum_title} {forum_content} {comment}"
    sources = search_web(query)

    # Pick first source or None
    primary_source = sources[0] if sources else None

    # 🔹 Step 2: Build the prompt for Qwen
    prompt = f"""
You are an AI that verifies a forum comment.

RULES:
- Only return strict JSON
- Keys: status, source_url, reason
- status = "verified" if comment matches forum topic AND a source URL confirms it
- status = "not_verified" if comment matches forum topic but no source confirms
- status = "unrelated" if comment does not match topic
- source_url = URL if verified, else null
- reason = short explanation

FORUM TITLE:
{forum_title}

FORUM CONTENT:
{forum_content}

COMMENT:
{comment}

PRIMARY SOURCE:
{primary_source}

Return only JSON.
"""

    # 🔹 Step 3: Call Qwen
    raw = generate_response(prompt)

    # 🔹 Step 4: Try parsing AI response
    try:
        # Sometimes AI outputs extra text, extract the JSON part
        clean_raw = re.search(r'\{.*\}', raw, re.DOTALL).group()
        response = json.loads(clean_raw)

        # Ensure source_url is a string or None
        if isinstance(response.get("source_url"), list):
            response["source_url"] = response["source_url"][0] if response["source_url"] else None

    except Exception as e:
        response = {
            "status": "not_verified",
            "source_url": None,
            "reason": f"Failed to parse AI response: {str(e)} | raw: {raw}"
        }

    return response
