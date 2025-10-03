# main.py
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import our modules
import config
from models import ChatMessage, ChatResponse, ConfirmationRequest, HealthResponse, ChatMode
from services.llm import LLMService
from services.knowledge_base import KnowledgeService
from services.apigee_service import ApigeeService
from agents.ask_mode import AskAgent
from agents.agent_mode import AgentMode

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="Apigee AI Assistant", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
llm_service = LLMService()
knowledge_service = KnowledgeService(llm_service)
apigee_service = ApigeeService()

# Initialize agents
ask_agent = AskAgent(llm_service, knowledge_service, apigee_service)
agent_mode = AgentMode(llm_service, knowledge_service, apigee_service)

@app.post("/chat", response_model=ChatResponse)
async def chat_with_bot(chat_message: ChatMessage):
    """Main chat endpoint"""
    
    if not config.GROQ_API_KEY:
        return ChatResponse(
            response="⚠️ **Setup Required**: Set GROQ_API_KEY environment variable\n\n🆓 Get key: https://console.groq.com/",
            mode=chat_message.mode,
            success=True,
            requires_confirmation=False
        )
    
    try:
        # Route to appropriate agent
        if chat_message.mode == ChatMode.ASK:
            if not ask_agent.is_ready():
                raise Exception("Ask agent not ready")
            response = ask_agent.run(chat_message.message)
        else:
            if not agent_mode.is_ready():
                raise Exception("Agent mode not ready")
            response = agent_mode.run(chat_message.message)
        
        return ChatResponse(
            response=response,
            mode=chat_message.mode,
            success=True,
            requires_confirmation="confirm" in response.lower()
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response=f"Error: {e}",
            mode=chat_message.mode,
            success=False,
            requires_confirmation=False
        )

@app.post("/confirm-action")
async def confirm_action(confirmation: ConfirmationRequest):
    """Handle confirmations"""
    if not confirmation.user_confirmation:
        return {"response": "Action cancelled", "success": True}
    
    try:
        if confirmation.action == "create_proxy":
            result = await apigee_service.execute_proxy_creation(confirmation.details)
            return {
                "response": f"✅ Proxy created successfully! {result}",
                "success": True,
                "action_completed": True
            }
        else:
            return {"response": "Unknown action", "success": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check"""
    return HealthResponse(
        status="healthy",
        llm_provider="Groq (Free)",
        api_key_configured=bool(config.GROQ_API_KEY),
        vector_store="available" if knowledge_service.is_ready() else "not_available",
        agents="ready" if ask_agent.is_ready() and agent_mode.is_ready() else "not_ready",
        embeddings="HuggingFace (Free)"
    )

@app.get("/")
async def root():
    """API information"""
    return {
        "message": "Apigee AI Assistant - Powered by Groq",
        "version": "2.0.0",
        "endpoints": {
            "chat": "/chat",
            "confirm": "/confirm-action", 
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)