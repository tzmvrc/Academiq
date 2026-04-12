# app/schemas/validation_schemas.py

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# =====================================================
# POINT VALIDATION SCHEMAS
# =====================================================

class PointValidationRequest(BaseModel):
    """Request schema for point validation endpoint"""
    comment_id: str = Field(..., description="UUID of the comment")
    user_id: str = Field(..., description="UUID of the comment author")
    content: str = Field(..., description="Content of the comment")
    subject: str = Field(..., description="Academic subject/field")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comment_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "660e8400-e29b-41d4-a716-446655440001",
                "content": "Binary search is O(log n) complexity and works on sorted arrays...",
                "subject": "Computer Science"
            }
        }


class PointValidationResponse(BaseModel):
    """Response schema for point validation endpoint"""
    comment_id: str = Field(..., description="UUID of the comment")
    points: int = Field(..., ge=0, le=10, description="Points awarded (0-10)")
    reason: str = Field(..., description="Explanation of the grading decision")
    is_valid: bool = Field(..., description="Whether the comment is academically valid")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comment_id": "550e8400-e29b-41d4-a716-446655440000",
                "points": 8,
                "reason": "Clear, accurate, and directly answers the forum question. Adds educational value.",
                "is_valid": True
            }
        }


# =====================================================
# COMMENT VERIFICATION SCHEMAS
# =====================================================

class CommentVerificationRequest(BaseModel):
    """Request schema for comment verification endpoint"""
    comment_id: str = Field(..., description="UUID of the comment")
    content: str = Field(..., description="Content of the comment to verify")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comment_id": "550e8400-e29b-41d4-a716-446655440000",
                "content": "According to Einstein's theory of relativity, E=mc²."
            }
        }


class CommentVerificationResponse(BaseModel):
    """Response schema for comment verification endpoint"""
    comment_id: str = Field(..., description="UUID of the comment")
    is_verified: bool = Field(..., description="Whether the claim in the comment is verifiable")
    source_url: Optional[str] = Field(None, description="URL to a credible source (if verified), otherwise null")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0.0 to 1.0)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comment_id": "550e8400-e29b-41d4-a716-446655440000",
                "is_verified": True,
                "source_url": "https://en.wikipedia.org/wiki/Mass%E2%80%93energy_equivalence",
                "confidence": 0.95
            }
        }
