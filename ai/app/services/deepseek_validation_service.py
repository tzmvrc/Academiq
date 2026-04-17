import json
import re
import logging
from app.models.deepseek_client import deepseek_client

logger = logging.getLogger(__name__)

def validate_post_deepseek(subject: str, title: str, content: str, tags: list) -> dict:
    """Validate forum post using DeepSeek"""
    
    prompt = f"""You are an AI that validates academic forum posts.
ONLY OUTPUT VALID JSON. Do not add explanations. Do not repeat the instructions.

DEFINITIONS:
- "is_academic" = true if the post is about any field of knowledge, learning, education, or intellectual skill.
  This includes: programming, mathematics, science, English, literature, history, psychology,
  engineering, technology, research, academic writing, and other subject-based or skill-based learning.
  
  Mark is_academic = false ONLY if the post is about:
  - gossip, personal drama, reactions, entertainment, games, memes, politics not tied to learning,
    celebrity news, or any topic unrelated to learning or knowledge.

- "is_consistent" = true if Subject, Title, Tags, and Content all match the same topic without contradictions.

VERDICT RULE:
- verdict = "approved" ONLY if both is_academic and is_consistent are true.
- Otherwise, verdict = "rejected".

Respond ONLY in this exact JSON structure:
{{
  "is_academic": true/false,
  "reason": "Brief explanation.",
  "is_consistent": true/false,
  "issues": ["List issues if inconsistent or unclear."],
  "verdict": "approved/rejected"
}}

Now analyze the post:

Subject: {subject}
Title: {title}
Content: {content}
Tags: {tags}

Return ONLY the JSON."""
    
    try:
        result = deepseek_client.generate_json(prompt)
        
        # Validate required fields
        required_fields = ["is_academic", "reason", "is_consistent", "issues", "verdict"]
        for field in required_fields:
            if field not in result:
                result[field] = None if field != "issues" else []
        
        if result.get("verdict") not in ["approved", "rejected"]:
            result["verdict"] = "rejected"
            
        return result
        
    except Exception as e:
        logger.error(f"DeepSeek validation error: {str(e)}")
        return {
            "is_academic": False,
            "reason": f"DeepSeek API error: {str(e)[:150]}",
            "is_consistent": False,
            "issues": ["API error"],
            "verdict": "rejected"
        }