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

    # 🔹 Step 2: Build the prompt for Qwen (simplified to ensure valid JSON)
    prompt = f"""You are an AI that verifies a forum comment.

FORUM TITLE: {forum_title}
FORUM CONTENT: {forum_content}
COMMENT: {comment}
PRIMARY SOURCE: {primary_source}

Output ONLY this JSON format with no other text:
{{"status": "verified" or "not_verified" or "unrelated", "source_url": null or "url_string", "reason": "brief explanation"}}"""

    # 🔹 Step 3: Call Qwen
    raw = generate_response(prompt)

    # 🔹 Step 4: Try parsing AI response
    try:
        # Extract JSON from response (handle cases where AI adds extra text)
        match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw, re.DOTALL)
        if match:
            clean_raw = match.group()
            response = json.loads(clean_raw)
        else:
            raise ValueError(f"No JSON found in response: {raw[:100]}")

        # Validate and normalize response
        response["status"] = response.get("status", "not_verified").lower()
        if response["status"] not in ["verified", "not_verified", "unrelated"]:
            response["status"] = "not_verified"
        
        response["source_url"] = response.get("source_url") or None
        if isinstance(response.get("source_url"), list):
            response["source_url"] = response["source_url"][0] if response["source_url"] else None
        
        response["reason"] = response.get("reason", "Comment verification completed")

    except Exception as e:
        # Fallback response when parsing fails
        response = {
            "status": "not_verified",
            "source_url": None,
            "reason": "Unable to verify. Please ensure your comment contains verifiable claims."
        }

    return response
