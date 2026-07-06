import os
import sys
import logging
import re
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

# Import security features as required by Requirement 5
from orchestrator_agent.security import (
    detect_prompt_injection,
    redact_pii,
    BLOCK_RESPONSE_PROMPT_INJECTION,
    BLOCK_RESPONSE_PII_ONLY,
    FRIENDLY_PII_WARNING
)

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

# Conversation flow configuration (greetings, small talk, and domain keywords)
# Decision: Regex word boundaries (\b) are used to ensure we match whole words and prevent substring false-positives.

# Greetings patterns matching standard greetings (Requirement 1)
GREETINGS_PATTERNS = [
    r"\bhello\b", r"\bhi\b", r"\bhey\b", r"\bnamaste\b", r"\bgood\s+morning\b", r"\bgood\s+evening\b",
    r"\bnamaskar\b", r"\bpranam\b", r"\bshubh\s+prabhat\b", r"\bshubh\s+sandhya\b", r"\bram\s+ram\b",
    r"\bheyy\b"
]

# Small talk patterns matching conversational prompts (Requirement 2)
SMALL_TALK_PATTERNS = [
    r"\bthanks\b", r"\bthank\s+you\b", r"\bshukriya\b", r"\bdhanyawad\b", r"\bdhanyavaad\b",
    r"\bhow\s+are\s+you\b", r"\baap\s+kaise\s+ho\b", r"\bkya\s+haal\s+hai\b", r"\bkaise\s+ho\b", r"\bkaise\s+hain\b",
    r"\bwho\s+are\s+you\b", r"\btum\s+kaun\s+ho\b", r"\baap\s+kaun\s+hain\b", r"\bwhat\s+is\s+your\s+name\b", r"\bkaun\s+ho\b", r"\bkaun\s+hain\b",
    r"\bwhat\s+can\s+you\s+do\b", r"\btum\s+kya\s+kar\s+sakte\s+ho\b", r"\baap\s+kya\s+kar\s+sakte\s+hain\b", r"\bkya\s+madad\b", r"\bhelp\b"
]

# Agricultural keywords defining our domain boundary (Requirement 4)
# Decision: Only invoke the LLM agents if the user query touches on at least one of these relevant terms.
IN_DOMAIN_KEYWORDS = [
    # Crops & Fruits
    "tomato", "wheat", "mango", "sugarcane", "onion", "potato", "rice", "cotton", "maize",
    "tamatar", "gehun", "gehu", "aam", "ganna", "pyaaz", "pyaz", "aloo", "alu", "chawal", "dhan", "kapaas", "makka",
    "crop", "plant", "fasal", "fasle", "pauda", "paude", "paudhon", "vegetable", "vegetables", "fruit", "fruits",
    "grain", "grains", "seed", "seeds", "beej", "sapling", "saplings", "leaf", "leaves", "patti", "pattiyan", "pattiyon",
    
    # Diseases, pests & treatments
    "disease", "diseases", "pest", "pests", "blight", "rust", "mildew", "virus", "spot", "spots", "yellowing", 
    "wilt", "rot", "fungus", "fungal", "insect", "insects", "keeda", "keede", "keet", "bimari", "rog", "dhabbe",
    "spray", "spraying", "pesticide", "pesticides", "fungicide", "fungicides", "insecticide", "insecticides",
    "chemical", "dawai", "dawa", "keetnashak",
    
    # Soil, Fertilizer & Water
    "fertilizer", "fertilizers", "manure", "urea", "khad", "soil", "mitti", "moisture", "irrigate", "irrigation",
    "water", "watering", "sinchai", "paani", "pani", "npk", "potash", "nitrogen", "phosphorus",
    
    # Weather & Atmosphere
    "weather", "rain", "raining", "forecast", "temperature", "wind", "windy", "mausam", "baarish", "barish",
    "hawa", "taapman", "pawan",
    
    # Market, Mandi & Prices
    "mandi", "price", "prices", "rate", "rates", "market", "markets", "cost", "bhaav", "bhav", "daam", "dam",
    "bechna", "bikri", "sell", "selling", "buy", "buying", "bazaar", "bajar",
    
    # Farming General
    "farm", "farmer", "farmers", "farming", "sow", "sowing", "harvest", "harvesting", "yield", "cultivation",
    "kheti", "kisan", "krishi", "khet", "khetibadi", "kisani", "chasa", "chasi"
]

in_domain_regex = re.compile(r"\b(" + "|".join(re.escape(kw) for kw in IN_DOMAIN_KEYWORDS) + r")\b", re.IGNORECASE)

def classify_query(text: str) -> str:
    """Classifies the normalized user query into conversation routing buckets."""
    # Convert query to lowercase and strip whitespace for matching
    normalized = text.lower().strip()
    
    # 1. Check for greetings
    for pattern in GREETINGS_PATTERNS:
        if re.search(pattern, normalized):
            return "GREETING"
            
    # 2. Check for small talk
    for pattern in SMALL_TALK_PATTERNS:
        if re.search(pattern, normalized):
            return "SMALL_TALK"
            
    # 3. Check for agriculture domain keywords
    if in_domain_regex.search(normalized):
        return "IN_DOMAIN"
        
    # 4. Fallback is out of domain
    return "OUT_OF_DOMAIN"

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
        # Decision: First, execute prompt injection protection to defend the API endpoints (Requirement 5)
        if detect_prompt_injection(req.message):
            return {"response": BLOCK_RESPONSE_PROMPT_INJECTION}
            
        # Decision: Run PII Redaction/Checks before classifying the query so sensitive details are not leaked (Requirement 5)
        redacted_msg, pii_types = redact_pii(req.message)
        warning_prefix = ""
        
        if pii_types:
            warning_prefix = FRIENDLY_PII_WARNING
            # Block the query entirely if only redacted PII remains (less than 3 non-punctuation characters)
            clean_text = redacted_msg.replace("[REDACTED]", "").strip()
            clean_text_alpha = re.sub(r"[^\w\s]", "", clean_text).strip()
            if len(clean_text_alpha) < 3:
                return {"response": BLOCK_RESPONSE_PII_ONLY}
            message_to_process = redacted_msg
        else:
            message_to_process = req.message

        # Classify the redacted query to determine conversation routing flow
        classification = classify_query(message_to_process)
        
        # Decision: If the query is a greeting, return a friendly greeting instantly without invoking agents (Requirement 1)
        if classification == "GREETING":
            return {
                "response": warning_prefix + "Namaste! Hello! I am Kisan Sahayak, your AI farming assistant. How can I help you today with crop disease diagnosis, mandi market rates, or weather advice?"
            }
            
        # Decision: If small talk, respond with capabilities instantly to optimize quota usage (Requirement 2)
        elif classification == "SMALL_TALK":
            return {
                "response": warning_prefix + (
                    "I am Kisan Sahayak, your AI farming assistant. I am here to help you with:\n\n"
                    "🌱 **Crop Disease Diagnosis**: Upload a tomato or wheat leaf photo to identify diseases and get verified treatments.\n"
                    "📈 **Mandi Prices**: Query live market prices for crops (tomato/wheat) across different mandis.\n"
                    "🌦️ **Agri-Weather Advice**: Get alerts on weather conditions and recommendations for pesticide spraying or irrigation timing.\n\n"
                    "How can I help you with your kheti-baadi questions today?"
                )
            }
            
        # Decision: If out of domain, return a polite deflection detailing capabilities (Requirement 3)
        elif classification == "OUT_OF_DOMAIN":
            return {
                "response": warning_prefix + (
                    "I specialize in agriculture and farming-related guidance. I can assist you with:\n"
                    "- 🌱 Crop disease diagnosis (tomato & wheat leaf photos)\n"
                    "- 🌦️ Weather-driven spray/irrigation advice\n"
                    "- 📈 Live mandi prices\n"
                    "- 💊 Fertilizers and pesticide advice\n\n"
                    "Please ask me a question related to farming or agriculture!"
                )
            }
            
        # Decision: For in-domain queries, invoke the ADK agent/orchestrator (Requirement 4)
        # Note: We pass the original message to ADK so that it can run its own in-depth security callbacks and warning pipelines natively.
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
        
        # Decision: The presence of an image always overrides other routing intents and defaults to Crop Doctor analysis.
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
