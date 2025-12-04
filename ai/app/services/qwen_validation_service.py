from app.models.qwen import generate_response
import json

def validate_post(subject: str, title: str, content: str, tags: list):
    """
    Sends a prompt to the Qwen model to validate a forum post.
    Returns a dictionary with:
      - is_academic: True/False
      - reason: explanation if not academic
      - is_consistent: True/False if title/content match
      - issues: list of problems
    """

    # Build the prompt
    prompt = f"""
You are an AI that validates academic forum posts.
ONLY OUTPUT VALID JSON. Do not add explanations.
Do not repeat the instructions. Do not add code blocks.

DEFINITIONS:
- "is_academic" = true if the post is about any field of knowledge, learning, education, or intellectual skill.
  This includes topics such as: programming, mathematics, science, English, literature, history, psychology,
  engineering, technology, research, academic writing, and other subject-based or skill-based learning questions.
  It does NOT need to mention school or classes to be considered academic.
  
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

Return ONLY the JSON.
"""


    # Call the Qwen model
    raw_response = generate_response(prompt)

    # Try to parse as JSON
    try:
        response = json.loads(raw_response)
    except json.JSONDecodeError:
        # fallback if AI output isn't valid JSON
        response = {
            "is_academic": False,
            "reason": "Failed to parse AI output",
            "is_consistent": False,
            "issues": [raw_response]
        }

    return response
