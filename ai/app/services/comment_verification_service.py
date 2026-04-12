# app/services/comment_verification_service.py

from app.models.qwen import generate_response
import json
import re
from typing import Optional

def verify_comment_claim(
    comment_id: str,
    content: str
) -> dict:
    """
    AI-powered verification of claims in a comment.
    
    Evaluates whether claims in the comment are:
    1. Verifiable / factual
    2. If verifiable, returns a credible source URL
    3. Provides confidence score
    
    IMPORTANT: Never hallucinate URLs. Only return real, verifiable sources.
    
    Args:
        comment_id: UUID of the comment
        content: Text content of the comment to verify
    
    Returns:
        Dict with keys: comment_id, is_verified, source_url, confidence
    """
    
    prompt = f"""
You are a fact-checking expert evaluating academic claims from forum comments.

**Comment Content:**
"{content}"

**Your Task:**
1. Identify any verifiable claims (factual statements, definitions, historical facts)
2. Determine if the claims are accurate and well-known enough to be verified
3. If claims are verifiable and true:
   - is_verified = true
   - Find and return a REAL, CREDIBLE source URL (Wikipedia, academic databases, official docs, etc.)
   - Provide a HIGH confidence score (0.7-1.0)
4. If claims are not verifiable or are questionable:
   - is_verified = false
   - source_url = null
   - Provide a LOWER confidence score (0.0-0.6)

**CRITICAL RULES:**
- NEVER fabricate, hallucinate, or make up URLs
- ONLY return URLs you are absolutely certain exist and are credible
- If uncertain about a URL, set is_verified = false and source_url = null
- Confidence = 0.0 if completely false, 0.0-0.3 if questionable, 0.7-1.0 if verified

**Valid Source Examples (if applicable):**
- https://en.wikipedia.org/wiki/[Topic]
- https://www.britannica.com/topic/[Topic]
- https://www.nobelprize.org/...
- Academic journal DOI links
- Official government/institutional websites

**Output ONLY valid JSON (no markdown, no explanation):**
{{
  "is_verified": <boolean>,
  "source_url": null or "<real URL>",
  "confidence": <float 0.0-1.0>
}}
"""
    
    try:
        raw_response = generate_response(prompt, max_new_tokens=300)
        
        # Clean markdown if present
        cleaned = re.sub(r"```json|```", "", raw_response).strip()
        
        # Parse JSON
        result = json.loads(cleaned)
        
        # Validate and ensure correct types
        is_verified = bool(result.get("is_verified", False))
        source_url = result.get("source_url")
        confidence = float(result.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))
        
        # Safety check: if is_verified is True but no URL, set to false
        if is_verified and not source_url:
            is_verified = False
        
        # Ensure source_url is None if is_verified is False or empty
        if not is_verified or not source_url:
            source_url = None
        
        return {
            "comment_id": comment_id,
            "is_verified": is_verified,
            "source_url": source_url,
            "confidence": confidence
        }
    
    except Exception as e:
        return {
            "comment_id": comment_id,
            "is_verified": False,
            "source_url": None,
            "confidence": 0.0
        }
