import json
import re
import logging
from typing import List, Optional
from app.models.deepseek_client import deepseek_client

logger = logging.getLogger(__name__)

def validate_points_deepseek(
    forum_title: str,
    forum_content: str,
    comment_text: str,
    existing_comments: List[str] = [],
    thread_summary: Optional[str] = None
) -> dict:
    """Score a comment (0-10 points) using DeepSeek"""
    
    # Build recent comments list
    recent_text = "\n".join(f"- {c}" for c in existing_comments[-10:]) if existing_comments else "(no recent comments)"
    summary_text = thread_summary if thread_summary else "No summary available."
    
    prompt = f"""You are an expert academic comment evaluator. Score this comment on relevance, uniqueness, and helpfulness.

**Context:**
- Forum Title: {forum_title}
- Forum Content: {forum_content}
- Thread Summary: {summary_text}
- Recent Comments (for duplicate detection): 
{recent_text}

**CRITICAL: DUPLICATE/PARAPHRASE DETECTION**
Check if the comment is essentially the same as recent comments:
- Same core message with different wording = PARAPHRASE
- Nearly identical sentences = DUPLICATE
- Same conclusion/answer = LIKELY DUPLICATE

**SCORING RULES:**
1. Relevance (0-10): How relevant to the forum topic?
2. Uniqueness (0-10): Original or duplicate/paraphrase?
3. Helpfulness (0-10): Does it add real value?

**FINAL POINTS CALCULATION:**
- If relevance == 0: awarded_points = 0
- If duplicate: awarded_points = 0
- If paraphrased: awarded_points = 0
- If original: awarded_points = round((relevance + uniqueness + helpfulness) / 3)
- Final points are clamped to 0-10

**THE COMMENT TO EVALUATE:**
"{comment_text}"

Return ONLY valid JSON:
{{
  "relevance_score": <integer 0-10>,
  "uniqueness_score": <integer 0-10>,
  "helpfulness_score": <integer 0-10>,
  "is_related": <true/false if relevance >= 4>,
  "is_duplicate": <true/false>,
  "is_paraphrased": <true/false>,
  "awarded_points": <integer 0-10>,
  "reason": "<brief explanation>"
}}"""
    
    try:
        result = deepseek_client.generate_json(prompt)
        
        # Extract and validate scores
        relevance = max(0, min(10, result.get("relevance_score", 0)))
        uniqueness = max(0, min(10, result.get("uniqueness_score", 0)))
        helpfulness = max(0, min(10, result.get("helpfulness_score", 0)))
        is_duplicate = result.get("is_duplicate", False)
        is_paraphrased = result.get("is_paraphrased", False)
        
        # Calculate awarded points
        if relevance == 0 or is_duplicate or is_paraphrased:
            awarded_points = 0
        else:
            awarded_points = round((relevance + uniqueness + helpfulness) / 3)
            awarded_points = max(0, min(10, awarded_points))
        
        return {
            "is_related": result.get("is_related", relevance >= 4),
            "is_duplicate": is_duplicate,
            "awarded_points": awarded_points,
            "reason": result.get("reason", ""),
            "relevance_score": relevance,
            "uniqueness_score": uniqueness,
            "helpfulness_score": helpfulness,
            "is_paraphrased": is_paraphrased
        }
        
    except Exception as e:
        logger.error(f"DeepSeek points validation error: {str(e)}")
        return {
            "is_related": False,
            "is_duplicate": False,
            "awarded_points": 0,
            "reason": f"DeepSeek API error: {str(e)[:150]}",
            "relevance_score": 0,
            "uniqueness_score": 0,
            "helpfulness_score": 0,
            "is_paraphrased": False
        }