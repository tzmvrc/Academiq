# app/services/point_validation_service.py

from app.models.qwen import generate_response
import json
import re
from typing import Optional

def validate_points_ai(
    comment_id: str,
    content: str,
    subject: str
) -> dict:
    """
    AI-powered point validation for a comment.
    
    Evaluates the comment on:
    1. Academic Relevance (0-10)
    2. Clarity and Helpfulness (0-10)
    3. Original Contribution (0-10)
    
    Final Score = (Relevance + Clarity + Originality) / 3, rounded to integer (0-10)
    
    Args:
        comment_id: UUID of the comment
        content: Text content of the comment
        subject: Academic subject/field
    
    Returns:
        Dict with keys: comment_id, points, reason, is_valid
    """
    
    prompt = f"""
You are an expert academic moderator evaluating forum comments for quality and relevance.

**Academic Subject:** {subject}

**Comment to Evaluate:**
"{content}"

**Evaluation Criteria:**

1. **Academic Relevance (0-10)**
   - 10: Directly addresses the topic with accurate, valuable information
   - 8-9: Clearly related, helpful contribution
   - 6-7: Somewhat relevant but could be more focused
   - 4-5: Loosely related, minimal connection
   - 1-3: Barely addresses the topic
   - 0: Completely off-topic

2. **Clarity and Helpfulness (0-10)**
   - 10: Exceptionally clear, well-structured, highly educational
   - 8-9: Clear explanation, easy to understand
   - 6-7: Generally clear but could be improved
   - 4-5: Somewhat unclear or vague
   - 1-3: Confusing or poorly written
   - 0: Incomprehensible

3. **Original Contribution (0-10)**
   - 10: Novel insight or unique perspective
   - 8-9: Mostly original, some new information
   - 6-7: Some original thoughts mixed with common knowledge
   - 4-5: Mostly repetitive with minimal new content
   - 1-3: Nearly all common/obvious statements
   - 0: Identical to expected textbook answers (no value)

**Final Score Calculation:**
- Average of the three scores, rounded to nearest integer (0-10)
- If Relevance <= 2 OR Clarity <= 2 → Score = 0 (invalid comment)
- Final score determines is_valid: true if score >= 4, else false

**Output ONLY valid JSON (no markdown, no explanation):**
{{
  "points": <integer 0-10>,
  "reason": "<Brief explanation of the scoring decision>",
  "is_valid": <boolean>
}}
"""
    
    try:
        raw_response = generate_response(prompt, max_new_tokens=500)
        
        # Clean markdown if present
        cleaned = re.sub(r"```json|```", "", raw_response).strip()
        
        # Parse JSON
        result = json.loads(cleaned)
        
        # Validate and ensure correct types
        points = int(result.get("points", 0))
        points = max(0, min(10, points))
        
        return {
            "comment_id": comment_id,
            "points": points,
            "reason": str(result.get("reason", "Unable to provide reason")),
            "is_valid": bool(result.get("is_valid", False))
        }
    
    except Exception as e:
        return {
            "comment_id": comment_id,
            "points": 0,
            "reason": f"Evaluation failed: {str(e)}",
            "is_valid": False
        }
