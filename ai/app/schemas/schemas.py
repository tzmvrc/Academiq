from pydantic import BaseModel
from typing import List, Union, Optional

class SummaryRequest(BaseModel):
    comments: List[str]

class SummarizeRequest(BaseModel):
    content: Union[str, List[str]]

class ValidationRequest(BaseModel):
    subject: str
    title: str
    content: str
    tags: List[str] = []

class CommentVerificationRequest(BaseModel):
    forum_title: str
    forum_content: str
    comment_text: str

class CommentVerificationResponse(BaseModel):
    status: str
    source_url: str | None
    reason: str

# ✅ Only one PointsValidationRequest (with extended fields)
class PointsValidationRequest(BaseModel):
    forum_title: str
    forum_content: str
    comment_text: str
    existing_comments: List[str] = []
    thread_summary: Optional[str] = None

class PointsValidationResponse(BaseModel):
    is_related: bool
    is_duplicate: bool
    awarded_points: int
    reason: str
    is_paraphrased: bool = False
    helpfulness_score: int = 0
    relevance_score: int = 0
    uniqueness_score: int = 0

class PointsValidationGeminiRequest(BaseModel):
    forum_title: str
    forum_content: str
    comment_text: str
    existing_comments: List[str]
    comment_position: int
    thread_summary: Optional[str] = None
    first_comment: Optional[str] = None
    parent_comment: Optional[str] = None