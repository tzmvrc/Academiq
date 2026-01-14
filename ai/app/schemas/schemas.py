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
    status: str               # "verified", "not_verified", "unrelated"
    source_url: str | None
    reason: str


class PointsValidationRequest(BaseModel):
    forum_title: str
    forum_content: str
    comment_text: str
    existing_comments: List[str]


class PointsValidationResponse(BaseModel):
    is_related: bool
    is_duplicate: bool
    awarded_points: int
    reason: str
