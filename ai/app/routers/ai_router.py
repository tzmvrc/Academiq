from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Union
from app.services.gpt_summarizer_service import summarize_content


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


