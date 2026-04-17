from fastapi import APIRouter
from app.schemas.schemas import (
    SummaryRequest,
    ValidationRequest,
    CommentVerificationRequest,
    CommentVerificationResponse,
    PointsValidationRequest,
    PointsValidationResponse
)
from app.services.gpt_summarizer_service import summarize_content
from app.services.qwen_summarizer_service import summarize_comments
from app.services.deepseek_validation_service import validate_post_deepseek
from app.services.deepseek_pointsValidation_service import validate_points_deepseek
from app.services.deepseek_verifier_service import verify_comment_deepseek

router = APIRouter()


@router.get("/test")
async def test_ai():
    return {"message": "AI router working"}


@router.post("/summarize-gpt")
async def summarize_endpoint(req: SummaryRequest):
    result = summarize_content(req.comments)
    return result


@router.post("/validate")
async def validate_endpoint(req: ValidationRequest):
    """Validate post using DeepSeek"""
    result = validate_post_deepseek(
        subject=req.subject,
        title=req.title,
        content=req.content,
        tags=req.tags
    )
    return result


@router.post("/summarize")
def summarize_endpoint(req: SummaryRequest):
    summary = summarize_comments(req.comments)
    return {"summary": summary}


@router.post("/verify-comment", response_model=CommentVerificationResponse)
async def verify_comment_endpoint(req: CommentVerificationRequest):
    """Verify comment using DeepSeek"""
    result = verify_comment_deepseek(
        forum_title=req.forum_title,
        forum_content=req.forum_content,
        comment=req.comment_text
    )
    return CommentVerificationResponse(
        status=result["status"],
        source_url=result["source_url"],
        reason=result["reason"]
    )


@router.post("/validate-points", response_model=PointsValidationResponse)
async def validate_points_endpoint(req: PointsValidationRequest):
    """Validate comment points using DeepSeek"""
    result = validate_points_deepseek(
        forum_title=req.forum_title,
        forum_content=req.forum_content,
        comment_text=req.comment_text,
        existing_comments=req.existing_comments,
        thread_summary=req.thread_summary
    )
    return PointsValidationResponse(
        is_related=result["is_related"],
        is_duplicate=result["is_duplicate"],
        awarded_points=result["awarded_points"],
        reason=result["reason"],
        is_paraphrased=result.get("is_paraphrased", False),
        helpfulness_score=result.get("helpfulness_score", 0),
        relevance_score=result.get("relevance_score", 0),
        uniqueness_score=result.get("uniqueness_score", 0)
    )