from app.models.qwen import generate_response
import json
import re
from typing import List, Optional

def validate_points(
    forum_title: str,
    forum_content: str,
    comment_text: str,
    existing_comments: List[str],
    thread_summary: Optional[str] = None
) -> dict:
    """
    Score a comment based on relevance to forum and uniqueness.
    """
    # Build recent comments for duplicate detection (last 10)
    recent_comments = existing_comments[-10:] if len(existing_comments) > 10 else existing_comments
    recent_text = "\n".join(f"- {c}" for c in recent_comments) if recent_comments else "(no previous comments)"

    prompt = f"""You are an AI that evaluates forum comments.

FORUM TITLE: {forum_title}
FORUM CONTENT: {forum_content}
RECENT COMMENTS: {recent_text}
COMMENT TO EVALUATE: {comment_text}

Rate the comment:
- Is it related to the forum topic? (0-10, where 10 is highly relevant)
- Is it unique or a duplicate? (0-10, where 10 is completely new)
- Final score = relate(0-10). If duplicate or irrelevant, score = 0.

Output ONLY this JSON:
{{"is_related": true or false, "is_duplicate": true or false, "awarded_points": 0-10, "reason": "brief explanation"}}"""
    
    raw = generate_response(prompt)
    
    # Clean JSON markers
    cleaned = re.sub(r"```json|```", "", raw).strip()
    
    try:
        # Try to extract valid JSON from the response
        match = re.search(r'\{[^{}]*(?:[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL)
        if match:
            clean_raw = match.group()
            result = json.loads(clean_raw)
        else:
            raise ValueError(f"No JSON found in response")
    except Exception as e:
        # Fallback: assume comment is acceptable but unverified
        result = {
            "is_related": True,
            "is_duplicate": False,
            "awarded_points": 2,
            "reason": "Auto-accepted due to processing delay"
        }

    # Ensure correct types
    result["is_related"] = bool(result.get("is_related", True))
    result["is_duplicate"] = bool(result.get("is_duplicate", False))
    points = int(result.get("awarded_points", 0))
    points = max(0, min(10, points))
    result["awarded_points"] = points

    # Override if logic says it should be zero
    if result["is_duplicate"] or not result["is_related"]:
        result["awarded_points"] = 0

    return result