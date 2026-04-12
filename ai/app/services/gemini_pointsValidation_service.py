import json
import re
from typing import List, Optional
from app.models.gemini_client import gemini_client

def validate_points_gemini(
    forum_title: str,
    forum_content: str,
    comment_text: str,
    existing_comments: List[str],          # limited to last N (e.g., 20)
    comment_position: int,                 # 1‑indexed overall position
    thread_summary: Optional[str] = None,  # AI summary of full discussion (optional)
    first_comment: Optional[str] = None,   # very first comment in thread
    parent_comment: Optional[str] = None   # parent comment if nested
) -> dict:
    """
    Score a single comment using:
    - limited recent comments (for duplicate detection)
    - optional thread summary (for broader uniqueness)
    - position (timeliness)
    - first comment (penalty)
    - parent comment (nested relevance)
    """
    # Timeliness multiplier
    timeliness_bonus = 1.0
    if comment_position > 10:
        timeliness_bonus = max(0.5, 1.0 - (comment_position - 10) * 0.05)
    timeliness_bonus = round(timeliness_bonus, 2)

    # Build recent comments list
    recent_text = "\n".join(f"- {c}" for c in existing_comments) if existing_comments else "(no recent comments)"

    # Optional summary text
    summary_text = thread_summary if thread_summary else "No summary available."

    prompt = f"""
You are an expert academic comment evaluator. Score this forum comment on THREE independent dimensions: RELEVANCE, UNIQUENESS, and HELPFULNESS.

**Context:**
- Forum Title: {forum_title}
- Forum Content: {forum_content}
- Thread Summary: {summary_text}
- Recent Comments (for duplicate/paraphrase detection): 
{recent_text}
- Parent Comment (if reply): {parent_comment if parent_comment else "None (top-level comment)"}
- Comment Position: #{comment_position}

**CRITICAL: DUPLICATE/PARAPHRASE DETECTION**
This is the most important evaluation. Check if the comment is essentially the same as recent comments:
- Same core message with different wording = PARAPHRASE
- Nearly identical sentences = DUPLICATE
- Same conclusion/answer to the question = LIKELY DUPLICATE
- Even if worded differently, if core meaning is identical, flag as paraphrased

**STEP 1: RELEVANCE SCORE (0-10)**
Evaluate how relevant this comment is to the forum topic and parent comment.
- 10: Directly answers the question or engages deeply with the core topic
- 8-9: Highly relevant with strong connection to topic
- 6-7: Mostly relevant, adds context to discussion
- 4-5: Somewhat relevant but tangential or partially off-topic
- 2-3: Barely related or mostly off-topic
- 0-1: Completely unrelated, spam, or gibberish
- Penalize very short comments (<5 words) to max 3 pts

**STEP 2: UNIQUENESS SCORE (0-10) — MOST CRITICAL FOR DUPLICATES**
Evaluate if this comment is original or a duplicate/paraphrase of existing comments.
- 10: Completely new insight, perspective, or data not mentioned elsewhere
- 8-9: Novel point with substantial value beyond existing comments
- 6-7: Mostly original with slight overlap to existing discussions
- 4-5: Some original content mixed with repetition of known points
- 2-3: Largely reworded/paraphrased from existing comments (same core idea, different wording) ← VERY COMMON
- 0-1: Near-duplicate or verbatim copy of existing comments
- CRITICAL: Compare SEMANTIC MEANING, not just exact wording. If the core message is the same, score low (0-3).

**STEP 3: HELPFULNESS SCORE (0-10)**
Evaluate if this comment provides real value to readers and the academic discussion.
- 10: Extremely helpful - provides new insights, citations, data, or solutions
- 8-9: Very helpful - adds substantial value to the discussion
- 6-7: Moderately helpful - provides some useful information or perspective
- 4-5: Somewhat helpful - adds minor value
- 2-3: Minimally helpful - mostly filler or obvious points
- 0-1: Not helpful - no real value to the discussion

**STEP 4: RETURN JSON WITH ALL THREE SCORES**
Return a JSON object with:
- relevance_score: integer 0-10 (your relevance assessment from Step 1)
- uniqueness_score: integer 0-10 (your uniqueness assessment from Step 2) ← CRITICAL
- helpfulness_score: integer 0-10 (your helpfulness assessment from Step 3)
- is_related: true/false (true if relevance >= 4, false otherwise)
- is_duplicate: true/false (true if uniqueness <= 1, indicates verbatim copy)
- is_paraphrased: true/false (true if uniqueness is 2-5, indicates reworded duplicate)
- reason: brief explanation including whether it's a duplicate/paraphrase

**THE COMMENT TO EVALUATE:**
"{comment_text}"

**Return ONLY valid JSON (no markdown, no extra text):**
{{
  "relevance_score": <integer 0-10>,
  "uniqueness_score": <integer 0-10>,
  "helpfulness_score": <integer 0-10>,
  "is_related": <true/false>,
  "is_duplicate": <true/false>,
  "is_paraphrased": <true/false>,
  "reason": "<brief explanation>"
}}
"""
    try:
        raw = gemini_client.generate(prompt)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {"relevance_score": 0, "uniqueness_score": 0, "helpfulness_score": 0, "is_related": False, "is_duplicate": False, "is_paraphrased": False, "reason": "Parse error"}
    except Exception as e:
        result = {"relevance_score": 0, "uniqueness_score": 0, "helpfulness_score": 0, "is_related": False, "is_duplicate": False, "is_paraphrased": False, "reason": f"Gemini error: {str(e)[:150]}"}

    # Extract scores
    relevance = int(result.get("relevance_score", 0))
    uniqueness = int(result.get("uniqueness_score", 0))
    helpfulness = int(result.get("helpfulness_score", 0))
    
    # Extract flags
    is_duplicate = bool(result.get("is_duplicate", False))
    is_paraphrased = bool(result.get("is_paraphrased", False))
    
    # Clamp to 0-10
    relevance = max(0, min(10, relevance))
    uniqueness = max(0, min(10, uniqueness))
    helpfulness = max(0, min(10, helpfulness))
    
    # Calculate final points with aggressive duplicate detection
    if relevance == 0:
        # Off-topic: always 0 points
        awarded_points = 0
    elif is_duplicate:
        # Exact duplicate: 0 points, no exceptions
        awarded_points = 0
    elif is_paraphrased or uniqueness <= 3:
        # Paraphrased/low uniqueness: severely penalized (max 1 point)
        # Even if relevant and somewhat helpful, paraphrases add no value
        awarded_points = 0  # Paraphrases get 0 points, they're just rewording
    else:
        # Original comment: calculate based on all three metrics
        # BUT: only give high points if uniqueness is actually high
        
        # If uniqueness is 4-6 (some originality): max 3 points
        if uniqueness <= 6:
            raw_score = (relevance + helpfulness) / 2
            raw_score = min(3, raw_score)  # Cap at 3
        else:
            # If uniqueness is 7+ (good originality): full calculation
            raw_score = (relevance + uniqueness + helpfulness) / 3
        
        awarded_points = round(raw_score * timeliness_bonus)
        awarded_points = max(0, min(10, awarded_points))
    
    return {
        "is_related": bool(result.get("is_related", False)),
        "is_duplicate": is_duplicate,
        "awarded_points": awarded_points,
        "reason": result.get("reason", ""),
        "relevance_score": relevance,
        "uniqueness_score": uniqueness,
        "helpfulness_score": helpfulness,
        "is_paraphrased": is_paraphrased
    }