import json
import re
from app.models.gemini_client import gemini_client
from app.services.search_service import search_web

def verify_comment_gemini(forum_title: str, forum_content: str, comment: str) -> dict:
    # Step 1: relevance
    relevance_prompt = f"""
You are a strict classifier. Determine if the comment is **relevant** to the forum topic.
Return ONLY a JSON object: {{"relevant": true/false, "reason": "short explanation"}}
No extra text, no markdown.

Forum Title: {forum_title}
Forum Content: {forum_content}
Comment: {comment}
"""
    try:
        raw = gemini_client.generate(relevance_prompt)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            relevance_data = json.loads(json_match.group())
        else:
            relevance_data = {"relevant": False, "reason": "Failed to parse relevance"}
    except Exception as e:
        return {"status": "not_verified", "source_url": None, "reason": f"Relevance check failed: {str(e)[:150]}"}

    if not relevance_data.get("relevant", False):
        return {"status": "unrelated", "source_url": None, "reason": relevance_data.get("reason", "Off-topic")}

    # Step 2: search
    query = f"{forum_title} {forum_content} {comment}"
    sources = search_web(query, num_results=3)
    if not sources:
        return {"status": "not_verified", "source_url": None, "reason": "Relevant but no sources found."}

    # Step 3: verification
    sources_text = "\n".join(f"- {url}" for url in sources)
    verify_prompt = f"""
You are a fact-checking AI. Determine if the comment is **confirmed** by any of the provided sources.
Return ONLY a JSON object: {{"status": "verified" or "not_verified", "source_url": "exact URL from list that supports the comment", "reason": "brief explanation"}}
If no source confirms the comment, status = "not_verified", source_url = null.

Forum Title: {forum_title}
Forum Content: {forum_content}
Comment: {comment}

Available sources (URLs only):
{sources_text}

Rules:
- "verified" only if a source explicitly supports the factual claim.
- source_url must be one of the URLs above (or null).
- Keep reason short (1 sentence).

Example: {{"status": "verified", "source_url": "https://example.com/page", "reason": "The source confirms the comment."}}
"""
    try:
        raw = gemini_client.generate(verify_prompt)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {"status": "not_verified", "source_url": None, "reason": "Failed to parse verification"}
    except Exception as e:
        result = {"status": "not_verified", "source_url": None, "reason": f"Verification error: {str(e)[:150]}"}

    if result.get("status") != "verified":
        result["source_url"] = None
    elif result.get("source_url") not in sources:
        result["status"] = "not_verified"
        result["source_url"] = None
        result["reason"] = "Claimed source URL not in list."
    return result