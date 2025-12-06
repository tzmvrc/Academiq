from app.models.qwen import generate_response
import re

def summarize_comments(comments: list[str]) -> str:
    """
    Summarizes a list of user comments into a single academic-style paragraph.
    """

    if not comments or len(comments) == 0:
        return "No comments available to summarize."

    # Remove usernames like "John:", "Maria said:", "user123:"
    cleaned_comments = [
        re.sub(r'^[^:]+:\s*', '', c).strip()
        for c in comments
    ]

    combined_text = "\n".join(f"- {c}" for c in cleaned_comments)

    prompt = f"""
You are an AI that summarizes a thread of user comments from an academic discussion forum.

YOUR GOALS:
- Produce a single, unified paragraph.
- Rewrite ideas in your own words.
- Capture the main agreements, disagreements, and concerns.
- Remove usernames and personal identifiers.
- Do NOT simply stitch the sentences together — transform them into a coherent summary.
- Tone must be neutral, objective, and academic.
- Avoid quoting the original text directly.

STRUCTURE RULES:
1. Start the summary with: "This thread discusses..."
2. Mention the main positive or supportive viewpoints first.
3. Then mention concerns, disagreements, or opposing perspectives.
4. End with a neutral concluding sentence.
5. Keep the output between 3–5 sentences.

STYLE RULES:
- No bullet points
- No quotes
- No usernames
- No personal opinions
- Use simple, clear language
- Use smooth transitions (e.g., "However", "On the other hand", "Meanwhile", "Overall")

Here are the comments to summarize:

{combined_text}

Summarize now:
"""

    result = generate_response(prompt)
    return result.strip()
