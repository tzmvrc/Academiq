# app/routers/validation_router.py

from fastapi import APIRouter, HTTPException
from app.schemas.validation_schemas import (
    PointValidationRequest,
    PointValidationResponse,
    CommentVerificationRequest,
    CommentVerificationResponse
)
from app.services.point_validation_service import validate_points_ai
from app.services.comment_verification_service import verify_comment_claim

router = APIRouter(prefix="/ai", tags=["validation"])

# =====================================================
# POINT VALIDATION ENDPOINT
# =====================================================

@router.post("/validate-points", response_model=PointValidationResponse)
async def validate_points_endpoint(req: PointValidationRequest):
    """
    Validate and score a comment for point allocation.
    
    This endpoint evaluates:
    - Academic relevance to the subject
    - Clarity and helpfulness of the response
    - Originality and unique value
    
    Returns a score (0-10) and whether the comment is valid.
    
    **Request body:**
    - comment_id: UUID of the comment
    - user_id: UUID of the comment author
    - content: Text of the comment
    - subject: Academic subject/field
    
    **Response:**
    - comment_id: UUID of the comment
    - points: Score 0-10
    - reason: Explanation of the scoring decision
    - is_valid: boolean indicating acceptable quality
    """
    try:
        result = validate_points_ai(
            comment_id=req.comment_id,
            content=req.content,
            subject=req.subject
        )
        
        return PointValidationResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Point validation failed: {str(e)}")


# =====================================================
# COMMENT VERIFICATION ENDPOINT
# =====================================================

@router.post("/verify-comment", response_model=CommentVerificationResponse)
async def verify_comment_endpoint(req: CommentVerificationRequest):
    """
    Verify claims in a comment and provide source information.
    
    This endpoint:
    - Evaluates whether claims in the comment are verifiable
    - Returns a credible source URL if the claim is verified
    - Provides a confidence score (0.0-1.0)
    
    **Request body:**
    - comment_id: UUID of the comment
    - content: Text of the comment to verify
    
    **Response:**
    - comment_id: UUID of the comment
    - is_verified: boolean indicating if claims are verified
    - source_url: URL to credible source (null if not verified)
    - confidence: Confidence score (0.0-1.0)
    """
    try:
        result = verify_comment_claim(
            comment_id=req.comment_id,
            content=req.content
        )
        
        return CommentVerificationResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comment verification failed: {str(e)}")
