"""
Simplified agent mode - no duplicate logic, uses services
"""
import logging
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.memory import ConversationBufferWindowMemory
from services.llm import LLMService
from services.knowledge_base import KnowledgeService
from services.apigee_service import ApigeeService
from typing import Dict, Any
import config

logger = logging.getLogger(__name__)

class AgentMode:
    """Simplified autonomous agent for proxy creation"""
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService, apigee_service: ApigeeService):
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        self.apigee_service = apigee_service
        self.agent = None
        
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            k=config.MEMORY_WINDOW,
            return_messages=True
        )
        
        self._setup_agent()
    
    def _setup_agent(self):
        """Setup agent with simple tools"""
        if not self.llm_service.is_ready():
            logger.warning("Cannot setup AgentMode - LLM not ready")
            return
        
        try:
            tools = [
                Tool(
                    name="Search_Documentation",
                    func=self.knowledge_service.search_documentation,
                    description="Search Apigee documentation for information"
                ),
                Tool(
                    name="Generate_Proxy_Config", 
                    func=self.apigee_service.generate_configuration_preview,
                    description="Generate complete Apigee proxy configuration from user request"
                )
            ]
            
            self.agent = initialize_agent(
                tools,
                self.llm_service.llm_creative,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                memory=self.memory,
                verbose=True,
                max_iterations=3,
                early_stopping_method="generate"
            )
            
            logger.info("AgentMode setup successfully")
            
        except Exception as e:
            logger.error(f"AgentMode setup error: {e}")
    
    def run(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process user message"""
        if not self.agent:
            return {
                "response": "Agent not ready. Please check the configuration.",
                "mode": "agent",
                "success": False,
                "requires_confirmation": False
            }
        
        # Check if this is a creation request
        if self._is_creation_request(message):
            return self._handle_creation_request(message, context or {})
        
        # Regular agent interaction
        try:
            result = self.agent.run(message)
            return {
                "response": result,
                "mode": "agent", 
                "success": True,
                "requires_confirmation": False
            }
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return {
                "response": f"Error processing request: {str(e)}",
                "mode": "agent",
                "success": False,
                "requires_confirmation": False
            }
    
    def _is_creation_request(self, message: str) -> bool:
        """Simple check for creation requests"""
        creation_words = ["create", "build", "generate", "make"]
        resource_words = ["proxy", "api", "endpoint"]
        
        message_lower = message.lower()
        return (any(word in message_lower for word in creation_words) and 
                any(word in message_lower for word in resource_words))
    
    def _handle_creation_request(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle proxy creation requests using the service"""
        try:
            # Analyze the request using the service
            config = self.apigee_service.analyze_request(message)
            
            # Generate preview using the service
            preview = self.apigee_service.generate_configuration_preview(message)
            
            # Prepare action details for confirmation
            action_details = {
                **config,
                "organization": context.get("organization", self.apigee_service.org),
                "token": context.get("token")
            }
            
            return {
                "response": f"""
{preview}

✅ **Ready to Create Proxy**

To proceed with deployment to Apigee, respond with: **"Yes, create this proxy"**
""",
                "mode": "agent",
                "success": True,
                "requires_confirmation": True,
                "action": "create_proxy",
                "details": action_details
            }
            
        except Exception as e:
            logger.error(f"Creation request error: {e}")
            return {
                "response": f"Error processing creation request: {str(e)}",
                "mode": "agent", 
                "success": False,
                "requires_confirmation": False
            }
    
    def is_ready(self) -> bool:
        """Check if agent is ready"""
        return bool(self.agent and self.llm_service.is_ready())