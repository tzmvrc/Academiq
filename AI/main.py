from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Academiq AI service running ✅"}

#1 activate - venv\scripts\activate
#2 run server - python -m uvicorn main:app --reload --port 8000