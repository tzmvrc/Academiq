from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.ai_router import router as ai_router

app = FastAPI()

# Allow backend (Express.js) to call this AI service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Later we will restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check route
@app.get("/health")
async def health():
    return {"status": "AI service running"}

# Register Routers
app.include_router(ai_router, prefix="/ai")
