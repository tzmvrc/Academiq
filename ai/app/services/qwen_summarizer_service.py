from app.models.qwen import generate_response
import re

def summarize_comments(comments: list[str]) -> str:
    """
    Summarizes a list of user comments into a concise, detailed paragraph of 2–4 sentences.
    """
    if not comments:
        return "No comments available to summarize."

    # Remove usernames (e.g., "John:", "Maria said:")
    cleaned_comments = [
        re.sub(r'^[^:]+:\s*', '', c).strip()
        for c in comments
    ]

    combined_text = "\n".join(f"- {c}" for c in cleaned_comments)

    prompt = f"""
You are an AI that summarizes a thread of user comments from an academic discussion forum.

**Requirements:**
- Produce **exactly 2 to 4 sentences**.
- Be **detailed**: capture key agreements, disagreements, questions, and insights.
- Write in a **neutral, objective, academic tone**.
- Do **not** use bullet points, quotes, usernames, or personal opinions.
- Paraphrase and synthesise, do not stitch comments together.

**Structure:**
1. Start with "This thread discusses ..."
2. Present the main supportive/positive viewpoints.
3. Then mention concerns, disagreements, or contrasting views.
4. End with a neutral conclusion or open question.

**Comments to summarise:**
{combined_text}

**Return only the summary paragraph (2–4 sentences).**
"""
    result = generate_response(prompt)
    return result.strip()