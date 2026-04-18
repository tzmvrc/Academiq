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
    
    # Check if this is the first comment
    is_first_comment = len(existing_comments) == 0
    
    prompt = f"""You are an expert academic comment evaluator. Score this comment on relevance, uniqueness, and helpfulness.

**Context:**
- Forum Title: {forum_title}
- Forum Content: {forum_content}
- Thread Summary: {summary_text}
- Recent Comments (for duplicate detection): 
{recent_text}
- Is First Comment: {is_first_comment}

**CRITICAL: DUPLICATE/PARAPHRASE DETECTION**
Check if the comment is essentially the same as recent comments:
- Same core message with different wording = PARAPHRASE
- Nearly identical sentences = DUPLICATE
- Same conclusion/answer = LIKELY DUPLICATE

**SCORING RULES:**
1. Relevance (0-10): How relevant to the forum topic?
2. Uniqueness (0-10): Original or duplicate/paraphrase?
3. Helpfulness (0-10): Does it add real value?

**NEW POINTS CALCULATION RULES:**
- If relevance == 0 OR answer is unrelated to question: awarded_points = 0
- If duplicate (nearly identical): awarded_points = 0
- If paraphrased (same core message, different wording): awarded_points = 1-3 (low points)
- If original answer:
  - For FIRST COMMENT: If answer is short (under 50 words) AND accurate: can receive 10 points
  - For FOLLOW-UP COMMENTS with same/similar answer as first: can receive 8-10 points if well-elaborated
  - Otherwise: awarded_points = round((relevance + uniqueness + helpfulness) / 3)

**FIRST COMMENT BONUS RULE:**
If this is the first comment and the answer is:
- Short (under 50 words)
- Accurate and directly answers the question
- Not a paraphrase or duplicate (obviously)
Then award 10 points regardless of other scores.

**FOLLOW-UP SAME ANSWER RULE:**
If this is NOT the first comment AND the answer is essentially the same core answer as a previous comment:
- Well-elaborated with more details/examples: 8-10 points
- Minimal elaboration: 5-7 points

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
  "is_first_comment": {is_first_comment},
  "is_short_accurate": <true/false if under 50 words AND highly accurate>,
  "has_same_core_answer": <true/false if same core answer as previous comment>,
  "elaboration_level": <"minimal"|"moderate"|"extensive">,
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
        is_related = result.get("is_related", relevance >= 4)
        is_first_comment = result.get("is_first_comment", is_first_comment)
        is_short_accurate = result.get("is_short_accurate", False)
        has_same_core_answer = result.get("has_same_core_answer", False)
        elaboration_level = result.get("elaboration_level", "minimal")
        
        # Calculate awarded points based on new rules
        awarded_points = 0
        
        # Rule 1: Unrelated or zero relevance = 0 points
        if not is_related or relevance == 0:
            awarded_points = 0
            
        # Rule 2: Duplicate = 0 points
        elif is_duplicate:
            awarded_points = 0
            
        # Rule 3: Paraphrased = 1-3 points (low points)
        elif is_paraphrased:
            # Award 1-3 points based on minor added value
            if helpfulness >= 7:
                awarded_points = 3
            elif helpfulness >= 4:
                awarded_points = 2
            else:
                awarded_points = 1
                
        # Rule 4: First comment with short accurate answer = 10 points
        elif is_first_comment and is_short_accurate:
            awarded_points = 10
            
        # Rule 5: Follow-up with same core answer = 8-10 points if well-elaborated
        elif not is_first_comment and has_same_core_answer:
            if elaboration_level == "extensive":
                awarded_points = 10
            elif elaboration_level == "moderate":
                awarded_points = 8
            else:  # minimal
                awarded_points = 5
                
        # Rule 6: Original answer - standard calculation
        else:
            awarded_points = round((relevance + uniqueness + helpfulness) / 3)
            awarded_points = max(0, min(10, awarded_points))
        
        # Final clamp to ensure 0-10 range
        awarded_points = max(0, min(10, awarded_points))
        
        return {
            "is_related": is_related,
            "is_duplicate": is_duplicate,
            "awarded_points": awarded_points,
            "reason": result.get("reason", ""),
            "relevance_score": relevance,
            "uniqueness_score": uniqueness,
            "helpfulness_score": helpfulness,
            "is_paraphrased": is_paraphrased,
            "is_first_comment": is_first_comment,
            "is_short_accurate": is_short_accurate,
            "has_same_core_answer": has_same_core_answer,
            "elaboration_level": elaboration_level
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
            "is_paraphrased": False,
            "is_first_comment": False,
            "is_short_accurate": False,
            "has_same_core_answer": False,
            "elaboration_level": "minimal"
        }