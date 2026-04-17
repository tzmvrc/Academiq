import json
import re
import logging
from app.models.deepseek_client import deepseek_client
from app.services.search_service import search_web

logger = logging.getLogger(__name__)

def verify_comment_deepseek(forum_title: str, forum_content: str, comment: str) -> dict:
    """Verify comment credibility using DeepSeek with web search"""
    
    # Step 1: Check relevance
    relevance_prompt = f"""Determine if the comment is relevant to the forum topic.
Return ONLY JSON: {{"relevant": true/false, "reason": "short explanation"}}

Forum Title: {forum_title}
Forum Content: {forum_content}
Comment: {comment}"""
    
    try:
        relevance_result = deepseek_client.generate_json(relevance_prompt)
        is_relevant = relevance_result.get("relevant", False)
        
        if not is_relevant:
            return {
                "status": "unrelated",
                "source_url": None,
                "reason": relevance_result.get("reason", "Off-topic comment")
            }
    except Exception as e:
        logger.error(f"Relevance check error: {str(e)}")
        return {"status": "not_verified", "source_url": None, "reason": f"Relevance check failed: {str(e)[:150]}"}
    
    # Step 2: Search web for sources
    query = f"{forum_title} {comment[:200]}"
    sources = search_web(query, num_results=3)
    
    if not sources:
        return {
            "status": "not_verified",
            "source_url": None,
            "reason": "Comment is relevant but no supporting sources found."
        }
    
    # Step 3: Verify against sources
    sources_text = "\n".join(f"- {url}" for url in sources)
    verify_prompt = f"""Verify if the comment is supported by any of these sources.
Return ONLY JSON: {{"status": "verified" or "not_verified", "source_url": "exact URL from list", "reason": "brief explanation"}}

Comment: {comment}

Sources:
{sources_text}

Rules:
- "verified" only if a source explicitly supports the claim
- source_url must be exactly one of the URLs above (or null)
- Keep reason short (1 sentence)"""
    
    try:
        result = deepseek_client.generate_json(verify_prompt)
        
        if result.get("status") == "verified":
            source_url = result.get("source_url")
            if source_url in sources:
                return {
                    "status": "verified",
                    "source_url": source_url,
                    "reason": result.get("reason", "Source confirms the comment.")
                }
        
        return {
            "status": "not_verified",
            "source_url": None,
            "reason": result.get("reason", "No source confirms this comment.")
        }
        
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        return {
            "status": "not_verified",
            "source_url": None,
            "reason": f"Verification failed: {str(e)[:150]}"
        }