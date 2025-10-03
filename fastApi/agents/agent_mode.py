# agents/agent_mode.py
import logging
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.memory import ConversationBufferWindowMemory
from common.tools import create_common_tools
from services.llm import LLMService
from services.knowledge_base import KnowledgeService
from services.apigee_service import ApigeeService
import config

logger = logging.getLogger(__name__)

class AgentMode:
    """Agent mode - can create and deploy proxies autonomously"""
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService, apigee_service: ApigeeService):
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        self.apigee_service = apigee_service
        self.agent = None
        
        # Shared memory
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            k=config.MEMORY_WINDOW,
            return_messages=True
        )
        
        self._setup_agent()
    
    def _setup_agent(self):
        """Initialize the agent mode"""
        if not self.llm_service.is_ready():
            logger.warning("Cannot setup AgentMode - LLM not ready")
            return
        
        try:
            # Get common tools
            tools = create_common_tools(self.knowledge_service, self.apigee_service)
            
            # Add agent-specific tools
            agent_tools = [
                Tool(
                    name="Create_API_Proxy",
                    func=self.apigee_service.create_api_proxy,
                    description="Create API proxy in Apigee (requires confirmation)"
                ),
                Tool(
                    name="Deploy_Proxy",
                    func=lambda config: f"""
🚀 **Deployment Ready**

Configuration: {config}

**Steps:** Package → Upload → Deploy → Verify

Confirm by saying: "Yes, deploy the proxy"
                    """,
                    description="Deploy proxy to environment (requires confirmation)"
                )
            ]
            
            all_tools = tools + agent_tools
            
            system_prompt = """You are an autonomous Apigee AI agent that creates and configures API proxies.

WORKFLOW - ALWAYS follow this order:
1. FIRST: Search_Apigee_Documentation for requirements and best practices
2. THEN: Analyze_Proxy_Requirements to plan configuration
3. THEN: Generate_Proxy_Config to create XML
4. FINALLY: Offer Create_API_Proxy with user confirmation

You can autonomously create proxies but ALWAYS require user confirmation before making changes."""
            
            self.agent = initialize_agent(
                all_tools,
                self.llm_service.llm_precise,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                verbose=True,
                memory=self.memory,
                agent_kwargs={"system_message": system_prompt}
            )
            
            logger.info("AgentMode setup successfully")
            
        except Exception as e:
            logger.error(f"AgentMode setup error: {e}")
    
    def run(self, message: str) -> str:
        """Process user message in agent mode"""
        if not self.agent:
            return "Agent mode not available. Please check configuration."
        
        # Enhanced prompt for autonomous action
        enhanced_message = f"""
Create and configure Apigee resources based on this request:

{message}

Follow the workflow: Search docs → Analyze → Generate config → Offer to create (with confirmation)
        """
        
        try:
            return self.agent.run(
                input=enhanced_message,
                chat_history=self.memory.chat_memory.messages
            )
        except Exception as e:
            logger.error(f"AgentMode error: {e}")
            return f"Error processing request: {e}"
    
    def is_ready(self) -> bool:
        """Check if agent is ready"""
        return bool(self.agent and self.llm_service.is_ready())