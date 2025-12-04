from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Union
from app.services.gpt_summarizer_service import summarize_content
from app.services.qwen_validation_service import validate_post

router = APIRouter()

@router.get("/test")
async def test_ai():
    return {"message": "AI router working"}

# Request model that accepts either single text or a list of comments
class SummarizeRequest(BaseModel):
    content: Union[str, List[str]]

@router.post("/summarize")
async def summarize_endpoint(req: SummarizeRequest):
    result = summarize_content(req.content)
    return result


# Request model that validate user posts
class ValidationRequest(BaseModel):
    subject: str
    title: str
    content: str
    tags: List[str] = []

@router.post("/validate")
async def validate_endpoint(req: ValidationRequest):
    result = validate_post(
        subject=req.subject,
        title=req.title,
        content=req.content,
        tags=req.tags
    )
    return result




