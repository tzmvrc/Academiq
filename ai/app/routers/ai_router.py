from fastapi import APIRouter
from app.schemas.schemas import SummarizeRequest, ValidationRequest, SummaryRequest, CommentVerificationRequest, CommentVerificationResponse, PointsValidationRequest, PointsValidationResponse, PointsValidationGeminiRequest
from app.services.gpt_summarizer_service import summarize_content
from app.services.qwen_validation_service import validate_post
from app.services.qwen_summarizer_service import summarize_comments
from app.services.qwen_verifier_service import verify_comment
from app.services.qwen_commentValidation_service import validate_comment_topic
from app.services.qwen_pointsValidation_service import validate_points
from app.services.gemini_verifier_service import verify_comment_gemini
from app.services.gemini_validation_service import validate_post_gemini
from app.services.gemini_pointsValidation_service import validate_points_gemini

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
    result = validate_post(
        subject=req.subject,
        title=req.title,
        content=req.content,
        tags=req.tags
    )
    return result


@router.post("/validate-gemini")
async def validate_gemini_endpoint(req: ValidationRequest):
    result = validate_post_gemini(
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

    result = verify_comment(
        forum_title=req.forum_title,
        forum_content=req.forum_content,
        comment=req.comment_text
    )

    return CommentVerificationResponse(
        status=result["status"],
        source_url=result["source_url"],
        reason=result["reason"]
    )


@router.post("/verify-comment-gemini", response_model=CommentVerificationResponse)
async def verify_comment_gemini_endpoint(req: CommentVerificationRequest):
    result = verify_comment_gemini(
        forum_title=req.forum_title,
        forum_content=req.forum_content,
        comment=req.comment_text
    )
    return CommentVerificationResponse(
        status=result["status"],
        source_url=result["source_url"],
        reason=result["reason"]
    )

@router.post("/validate-comment-topic")
async def validate_comment_topic_endpoint(req: CommentVerificationRequest):
    result = validate_comment_topic(
        title=req.forum_title,
        content=req.forum_content,
        comment=req.comment_text
    )

    return result   

@router.post("/validate-points", response_model=PointsValidationResponse)
async def validate_points_endpoint(req: PointsValidationRequest):
    result = validate_points(
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
        reason=result["reason"]
    )


@router.post("/validate-points-gemini", response_model=PointsValidationResponse)
async def validate_points_gemini_endpoint(req: PointsValidationGeminiRequest):
    result = validate_points_gemini(
        forum_title=req.forum_title,
        forum_content=req.forum_content,
        comment_text=req.comment_text,
        existing_comments=req.existing_comments,
        comment_position=req.comment_position,
        thread_summary=req.thread_summary,
        first_comment=req.first_comment,
        parent_comment=req.parent_comment
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
