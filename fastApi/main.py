# main.py
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import uvicorn
import config

# Import our modules
from models import ChatMessage, ConfirmationRequest, HealthResponse, ChatMode
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

@app.post("/chat")
async def chat_with_bot(chat_message: ChatMessage):
    """Main chat endpoint"""
    
    if not config.GROQ_API_KEY:
        return {
            "response": "⚠️ **Setup Required**: Set GROQ_API_KEY environment variable\n\n🆓 Get key: https://console.groq.com/",
            "mode": chat_message.mode,
            "success": True,
            "requires_confirmation": False
        }
    
    try:
        logger.info(f"Chat request: {chat_message.message[:100]}...")
        
        # Route to appropriate agent with timeout
        if chat_message.mode == ChatMode.ASK:
            if not ask_agent.is_ready():
                return {
                    "response": "Ask agent not ready. Using fallback response.",
                    "mode": chat_message.mode,
                    "success": True,
                    "requires_confirmation": False
                }
            
            # Add timeout to prevent hanging
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(ask_agent.run, chat_message.message),
                    timeout=30.0  # 30 second timeout
                )
            except asyncio.TimeoutError:
                response = "Response timeout. Please try a simpler question or check your connection."
            
            return {
                "response": response,
                "mode": chat_message.mode,
                "success": True,
                "requires_confirmation": False
            }

        else:  # AGENT mode
            if not agent_mode.is_ready():
                return {
                    "response": "Agent mode not ready",
                    "mode": chat_message.mode,
                    "success": False,
                    "requires_confirmation": False
                }
            
            # Create context from chat message
            context = {
                "organization": chat_message.organization,
                "token": chat_message.token,
                **(chat_message.user_context or {})
            }
            
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(agent_mode.run, chat_message.message, context),
                    timeout=45.0  # 45 second timeout for agent mode
                )
            except asyncio.TimeoutError:
                response = {
                    "response": "Agent response timeout. Please try again with a simpler request.",
                    "mode": chat_message.mode,
                    "success": False,
                    "requires_confirmation": False
                }
            
            # Response is already a dict from agent_mode.run()
            return response
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {
            "response": f"Error: {e}",
            "mode": chat_message.mode,
            "success": False,
            "requires_confirmation": False
        }

@app.post("/confirm-action")
async def confirm_action(confirmation: ConfirmationRequest):
    """Handle confirmations"""
    if not confirmation.user_confirmation:
        return {
            "response": "❌ Action cancelled by user",
            "success": True
        }
    
    try:
        if confirmation.action == "create_proxy":
            result = await apigee_service.execute_proxy_creation(confirmation.details)
            return result
        else:
            return {
                "response": f"❌ Unknown action: {confirmation.action}",
                "success": False
            }
    except Exception as e:
        logger.error(f"Confirmation error: {e}")
        return {
            "response": f"❌ Error executing action: {str(e)}",
            "success": False
        }

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
    uvicorn.run(app, host="0.0.0.0", port=8001)