from fastapi import APIRouter
from app.schemas.schemas import SummarizeRequest, ValidationRequest, SummaryRequest, CommentVerificationRequest, CommentVerificationResponse
from app.services.gpt_summarizer_service import summarize_content
from app.services.qwen_validation_service import validate_post
from app.services.qwen_summarizer_service import summarize_comments
from app.services.qwen_verifier_service import verify_comment
from app.services.qwen_commentValidation_service import validate_comment_topic

router = APIRouter()

@router.get("/test")
async def test_ai():
    return {"message": "AI router working"}


@router.post("/summarize-gpt")
async def summarize_endpoint(req: SummarizeRequest):
    result = summarize_content(req.content)
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


@router.post("/validate-comment-topic")
async def validate_comment_topic_endpoint(req: CommentVerificationRequest):
    result = validate_comment_topic(
        title=req.forum_title,
        content=req.forum_content,
        comment=req.comment_text
    )

    return result   