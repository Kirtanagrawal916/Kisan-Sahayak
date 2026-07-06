import os
import sys
import logging
from typing import Optional
from dotenv import load_dotenv

# Add project root to path to ensure orchestrator_agent and other local modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Startup logging sequence (Requirement 5)
print("Starting Kisan Sahayak API...", flush=True)
print("Loading orchestrator...", flush=True)

# Load environment variables
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from google.adk import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.auth.credential_service.in_memory_credential_service import InMemoryCredentialService
from google.genai import types

# Import the root orchestrator agent
from orchestrator_agent.agent import root_agent

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("kisan_sahayak_api")

# Initialize FastAPI application
app = FastAPI(
    title="Kisan Sahayak API",
    description="Production deployment layer for Kisan Sahayak multi-agent system",
    version="1.0.0"
)

# CORS middleware (Requirement 4)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize standard ADK services globally to persist sessions in-memory
session_service = InMemorySessionService()
artifact_service = InMemoryArtifactService()
memory_service = InMemoryMemoryService()
credential_service = InMemoryCredentialService()

# Initialize the ADK runner
runner = Runner(
    agent=root_agent,
    app_name="kisan_sahayak",
    session_service=session_service,
    artifact_service=artifact_service,
    memory_service=memory_service,
    credential_service=credential_service,
    auto_create_session=True
)

print("API Ready.", flush=True)

# Helper to check for Gemini API rate limits
def is_rate_limit_exception(e: Exception) -> bool:
    err_str = str(e).lower()
    class_name = e.__class__.__name__.lower()
    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
        return True
    if "rate" in err_str and "limit" in err_str:
        return True
    if "resource_exhausted" in class_name or "quota" in class_name:
        return True
    if getattr(e, "status_code", None) == 429:
        return True
    if e.__cause__ and is_rate_limit_exception(e.__cause__):
        return True
    return False

# Pydantic schemas
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"
    user_id: Optional[str] = "default_user"

# Endpoint: GET / (Requirement 1)
@app.get("/")
async def get_metadata():
    return {
        "name": "Kisan Sahayak",
        "status": "running",
        "version": "1.0.0"
    }

# Endpoint: GET /health (Requirement 1)
@app.get("/health")
async def get_health():
    return {
        "status": "healthy"
    }

# Endpoint: POST /chat (Requirement 1)
@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        content = types.Content(role="user", parts=[types.Part.from_text(text=req.message)])
        response_text = ""
        
        async for event in runner.run_async(
            user_id=req.user_id,
            session_id=req.session_id,
            new_message=content
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text
        
        if not response_text:
            response_text = "Mujhe khed hai, main aapki baat samajh nahi paaya. Kripya dobara poochhein."
            
        return {
            "response": response_text
        }
        
    except HTTPException as he:
        raise he
    except (ValueError, ValidationError) as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        if is_rate_limit_exception(e):
            raise HTTPException(
                status_code=429, 
                detail="Gemini API rate limit exceeded. Please try again in a few moments."
            )
        logger.error(f"Error in /chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your request."
        )

# Endpoint: POST /analyze-image (Requirement 2)
@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    message: Optional[str] = None,
    session_id: str = "default_session",
    user_id: str = "default_user"
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
        
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
            
        parts = [types.Part.from_bytes(data=file_bytes, mime_type=file.content_type)]
        if message and message.strip():
            parts.append(types.Part.from_text(text=message))
            
        content = types.Content(role="user", parts=parts)
        response_text = ""
        
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text
        
        if not response_text:
            response_text = "Mujhe khed hai, main photo ko analyze nahi kar paaya."
            
        return {
            "response": response_text
        }
        
    except HTTPException as he:
        raise he
    except (ValueError, ValidationError) as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        if is_rate_limit_exception(e):
            raise HTTPException(
                status_code=429, 
                detail="Gemini API rate limit exceeded. Please try again in a few moments."
            )
        logger.error(f"Error in /analyze-image: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while analyzing the image."
        )

# Main entry point (Requirement 6)
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
