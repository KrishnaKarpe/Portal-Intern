# agents/agent_mode.py
import logging
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.memory import ConversationBufferWindowMemory
from common.tools import create_common_tools, PolicyTools  
from services.llm import LLMService
from services.knowledge_base import KnowledgeService
from services.apigee_service import ApigeeService
from typing import Dict, Any, List
import config
import re

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
    
    def run(self, message: str, context: Dict[str, Any] = None) -> str:
        """Process user message in agent mode"""
        if not self.agent:
            return "Agent mode not available. Please check configuration."
        
        # Check if this is a proxy creation request
        if context and self._is_creation_request(message):
            # Use structured response for proxy creation
            return self.handle_agent_request(message, context)
        
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
    
    def _is_creation_request(self, message: str) -> bool:
        """Check if message is requesting proxy/resource creation"""
        creation_keywords = ["create", "build", "generate", "make", "setup", "configure"]
        resource_keywords = ["proxy", "api", "endpoint", "service"]
        
        message_lower = message.lower()
        
        has_creation = any(keyword in message_lower for keyword in creation_keywords)
        has_resource = any(keyword in message_lower for keyword in resource_keywords)
        
        return has_creation and has_resource
    
    def _extract_custom_logic(self, message: str) -> Dict[str, Any]:
        """Extract custom logic requirements from message (generalized)"""
        custom_logic = {}
        message_lower = message.lower()
        
        # Check for JavaScript requirements
        if any(word in message_lower for word in ["javascript", "js", "script", "custom logic"]):
            custom_logic["javascript"] = {
                "required": True,
                "purpose": self._extract_javascript_purpose(message),
                "code": self._generate_javascript_code(message)
            }
        
        # Check for transformation requirements
        if any(word in message_lower for word in ["transform", "convert", "modify", "change"]):
            custom_logic["transformation"] = {
                "required": True,
                "type": self._extract_transformation_type(message),
                "details": self._extract_transformation_details(message)
            }
        
        return custom_logic
    
    def _extract_javascript_purpose(self, message: str) -> str:
        """Extract what the JavaScript should do"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["combine", "merge", "fullname"]):
            return "data_combination"
        elif any(word in message_lower for word in ["validate", "validation", "check"]):
            return "validation"
        elif any(word in message_lower for word in ["transform", "modify", "change"]):
            return "transformation"
        elif any(word in message_lower for word in ["route", "routing", "redirect"]):
            return "routing"
        else:
            return "custom_processing"
    
    def _generate_javascript_code(self, message: str) -> str:
        """Generate JavaScript code based on requirements"""
        purpose = self._extract_javascript_purpose(message)
        
        code_templates = {
            "data_combination": """// Combine fields in response
var response = context.getVariable('response.content');
var data = JSON.parse(response);

// Add your field combination logic here
// Example: data.fullname = data.firstname + ' ' + data.lastname;

context.setVariable('response.content', JSON.stringify(data));""",
            
            "validation": """// Custom validation logic
var requestBody = context.getVariable('request.content');
var data = JSON.parse(requestBody);

// Add your validation logic here
// Example: if (!data.email || !data.email.includes('@')) { throw new Error('Invalid email'); }

// Continue processing if validation passes""",
            
            "transformation": """// Transform request/response data
var content = context.getVariable('request.content');
var data = JSON.parse(content);

// Add your transformation logic here
// Example: data.timestamp = new Date().toISOString();

context.setVariable('request.content', JSON.stringify(data));""",
            
            "routing": """// Dynamic routing logic
var requestPath = context.getVariable('request.uri');
var userType = context.getVariable('request.header.user-type');

// Add your routing logic here
// Example: context.setVariable('target.url', 'https://api.example.com');""",
            
            "custom_processing": """// Custom processing logic
// Add your custom JavaScript code here
var requestData = context.getVariable('request.content');
var responseData = context.getVariable('response.content');

// Process as needed"""
        }
        
        return code_templates.get(purpose, code_templates["custom_processing"])
    
    def _extract_transformation_type(self, message: str) -> str:
        """Extract transformation type from message"""
        message_lower = message.lower()
        
        if "json to xml" in message_lower or "json2xml" in message_lower:
            return "json_to_xml"
        elif "xml to json" in message_lower or "xml2json" in message_lower:
            return "xml_to_json"
        elif any(word in message_lower for word in ["xslt", "xsl"]):
            return "xsl_transform"
        else:
            return "custom_transform"
    
    def _extract_transformation_details(self, message: str) -> str:
        """Extract transformation details"""
        transformation_type = self._extract_transformation_type(message)
        return f"Transform data using {transformation_type.replace('_', ' ').title()}"
    
    def is_ready(self) -> bool:
        """Check if agent is ready"""
        return bool(self.agent and self.llm_service.is_ready())
    
    def handle_agent_request(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle agent mode requests with generalized action structure"""
        try:
            # Extract requirements using generalized methods
            requirements = self.apigee_service.analyze_requirements(message)
            
            # If it's a creation request, return action structure
            if self._is_creation_request(message):
                
                # Extract basic proxy details (generalized)
                name = PolicyTools.extract_proxy_name(message) or "default-proxy"
                target_url = PolicyTools.extract_target_url(message) or "https://httpbin.org/anything"
                base_path = PolicyTools.extract_base_path(message) or f"/{name.replace('_', '-')}"
                
                # Suggest policies (generalized - works for any policies)
                suggested_policies = PolicyTools.suggest_policies(message)
                
                # Extract custom logic (generalized)
                custom_logic = self._extract_custom_logic(message)
                
                # Build response description dynamically
                policy_descriptions = []
                for policy in suggested_policies:
                    policy_descriptions.append(f"  - {policy}: Auto-configured based on requirements")
                
                custom_logic_desc = []
                for logic_type, logic_info in custom_logic.items():
                    if logic_info.get("required"):
                        custom_logic_desc.append(f"  - {logic_type.title()}: {logic_info.get('purpose', 'Custom logic')}")
                
                response_text = f"I will create an Apigee proxy named '{name}' with the following configuration:\n\n"
                response_text += f"• **Name**: {name}\n"
                response_text += f"• **Base Path**: {base_path}\n"
                response_text += f"• **Target URL**: {target_url}\n"
                
                if suggested_policies:
                    response_text += f"• **Policies**: {', '.join(suggested_policies)}\n"
                    response_text += f"**Policy Configuration:**\n{''.join([f'{desc}\n' for desc in policy_descriptions])}"
                
                if custom_logic_desc:
                    response_text += f"• **Custom Logic**:\n{''.join([f'{desc}\n' for desc in custom_logic_desc])}"
                
                response_text += f"\nUse the /confirm-action endpoint to proceed with creation."
                
                # Build details object (generalized)
                details = {
                    "name": name,
                    "target_url": target_url,
                    "base_path": base_path,
                    "organization": context.get("organization", "apigee-non-prod-crjb"),
                    "token": context.get("token", ""),
                    "environment": context.get("environment", "apim-dev"),
                    "policies": suggested_policies,
                    "description": f"AI-generated proxy: {name}",
                    "requirements": message,  # Store original requirements
                    "custom_logic": custom_logic  # Store all custom logic
                }
                
                # Return generalized action structure
                return {
                    "response": response_text,
                    "mode": "agent",
                    "success": True,
                    "requires_confirmation": True,
                    "action": {
                        "action": "create_proxy",
                        "details": details
                    }
                }
            
            # Handle other types of requests...
            else:
                return {
                    "response": "I can help you create Apigee proxies and configure policies. Please specify what you'd like to create.",
                    "mode": "agent", 
                    "success": True,
                    "requires_confirmation": False
                }
                
        except Exception as e:
            logger.error(f"Agent request error: {str(e)}")
            return {
                "response": f"Error processing request: {str(e)}",
                "mode": "agent",
                "success": False,
                "requires_confirmation": False
            }