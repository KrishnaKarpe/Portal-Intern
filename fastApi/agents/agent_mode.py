# agents/agent_mode.py
import logging
import re
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.memory import ConversationBufferWindowMemory
from common.tools import create_common_tools, PolicyTools  
from services.llm import LLMService
from services.knowledge_base import KnowledgeService
from services.apigee_service import ApigeeService
from typing import Dict, Any, List
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

            # Initialize agent
            self.agent = initialize_agent(
                tools=all_tools,
                llm=self.llm_service.llm_creative,
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
        """Process user message in agent mode"""
        if not self.agent:
            return {
                "response": "Agent not ready. Please check the configuration.",
                "mode": "agent",
                "success": False,
                "requires_confirmation": False
            }
        
        # Check if this is a proxy creation request
        if self._is_creation_request(message):
            return self.handle_agent_request(message, context or {})
        
        # Enhanced prompt for autonomous action
        enhanced_message = f"""
Create and configure Apigee resources based on this request:

{message}

Follow the workflow: Search docs → Analyze → Generate config → Show configuration → Offer to create (with confirmation)

IMPORTANT: Always show the complete configuration before offering to create.
        """
        
        try:
            result = self.agent.run(
                input=enhanced_message,
                chat_history=self.memory.chat_memory.messages
            )
            
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
        """Check if message is requesting proxy/resource creation"""
        creation_keywords = ["create", "build", "generate", "make", "setup", "configure"]
        resource_keywords = ["proxy", "api", "endpoint", "service"]
        
        message_lower = message.lower()
        
        has_creation = any(keyword in message_lower for keyword in creation_keywords)
        has_resource = any(keyword in message_lower for keyword in resource_keywords)
        
        return has_creation and has_resource
    
    def _extract_custom_logic(self, message: str) -> Dict[str, Any]:
        """Extract custom logic requirements from message using AI"""
        custom_logic = {}
        message_lower = message.lower()
        
        # Check for JavaScript/transformation requirements
        if any(word in message_lower for word in ["javascript", "js", "script", "custom logic", "transform", "modify", "add", "combine", "convert"]):
            # Use AI to extract transformation description
            transformation_description = self._ai_extract_transformation_description(message)
            
            custom_logic["javascript"] = {
                "required": True,
                "description": transformation_description,
                "code": self._generate_dynamic_javascript_code(message, transformation_description)
            }
        
        # Use AI to suggest policies
        custom_logic["suggested_policies"] = self._ai_suggest_policies(message)
        
        return custom_logic

    def _ai_extract_transformation_description(self, message: str) -> str:
        """Use AI to extract transformation description"""
        try:
            extraction_prompt = f"""
Analyze this API proxy request and extract the main transformation requirement:

User Request: "{message}"

Extract ONLY the transformation/modification requirement in 1-2 sentences. Focus on:
- What data should be transformed/modified
- How it should be changed
- What the end result should be

Examples:
- "Combine firstName and lastName fields into a single fullName field"
- "Add a timestamp field to all API responses"
- "Remove sensitive fields from the response data"
- "Convert user_name field to userName format"

Output: Only the transformation description, no other text.
"""
        
            if self.llm_service and self.llm_service.llm_precise:
                result = self.llm_service.llm_precise.invoke(extraction_prompt).content.strip()
                return result if len(result) > 10 else "custom data transformation"
            else:
                return "custom data transformation"
            
        except Exception as e:
            logger.error(f"Error extracting transformation description: {e}")
            return "custom data transformation"

    def _ai_suggest_policies(self, message: str) -> List[str]:
        """Use AI to suggest appropriate Apigee policies"""
        try:
            policy_prompt = f"""
Based on this API proxy request, suggest appropriate Apigee policies:

User Request: "{message}"

Available Apigee Policies:
- VerifyAPIKey: API key authentication
- CORS: Cross-origin resource sharing
- Quota: Rate limiting by time period
- SpikeArrest: Burst traffic protection
- JavaScript: Custom logic and transformations
- AssignMessage: Set variables and headers
- OAuth: OAuth 2.0 authentication
- LDAP: LDAP authentication
- XMLToJSON: Convert XML to JSON
- JSONToXML: Convert JSON to XML

Output: Only a comma-separated list of policy names that are relevant, no explanations.
Example: JavaScript, AssignMessage, CORS
"""
        
            if self.llm_service and self.llm_service.llm_precise:
                result = self.llm_service.llm_precise.invoke(policy_prompt).content.strip()
                # Parse the comma-separated response
                policies = [p.strip() for p in result.split(',') if p.strip()]
                return policies
            else:
                # Fallback to basic keyword matching
                return PolicyTools.suggest_policies(message)
            
        except Exception as e:
            logger.error(f"Error suggesting policies: {e}")
            return PolicyTools.suggest_policies(message)
    
    def is_ready(self) -> bool:
        """Check if agent is ready"""
        return bool(self.agent and self.llm_service.is_ready())
    
    def handle_agent_request(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle agent mode requests with generalized action structure"""
        try:
            # Extract details from the message using the improved parsing
            proxy_name = self.apigee_service._extract_proxy_name_from_requirements(message)
            target_url = self.apigee_service._extract_target_url_from_requirements(message)
            base_path = self.apigee_service._extract_base_path_from_requirements(message, proxy_name)
            
            # Extract policies from message
            suggested_policies = PolicyTools.suggest_policies(message)
            custom_logic = self._extract_custom_logic(message)
            
            # Add policies based on message content
            if "javascript" in message.lower() or "transform" in message.lower():
                if "JavaScript" not in suggested_policies:
                    suggested_policies.append("JavaScript")
            
            if "assign message" in message.lower() or "assignmessage" in message.lower():
                if "AssignMessage" not in suggested_policies:
                    suggested_policies.append("AssignMessage")
            
            # Generate configuration using the service
            config_response = self.apigee_service.generate_proxy_config(message)
            
            # Get the transformation description for display
            transformation_desc = custom_logic.get('javascript', {}).get('description', 'No transformation specified')
            js_code = custom_logic.get('javascript', {}).get('code', '// No custom JavaScript specified')
            
            # Create action details for confirmation
            action_details = {
                "name": proxy_name,
                "base_path": base_path,
                "target_url": target_url,
                "policies": suggested_policies,
                "custom_logic": custom_logic,
                "organization": context.get("organization", self.apigee_service.org),
                "token": context.get("token"),
                "description": f"Auto-generated proxy: {proxy_name}"
            }
            
            return {
                "response": f"""
🚀 **API Proxy Configuration Generated**

**Proxy Details:**
- **Name**: {proxy_name}
- **Base Path**: {base_path}
- **Target URL**: {target_url}  
- **Policies**: {', '.join(suggested_policies)}

{config_response}

**JavaScript Transformation Details:**
- **Purpose**: {transformation_desc}

```javascript
{js_code}
```

**AssignMessage Policy Configuration:**
```xml
<AssignMessage name="AssignMessage">
    <AssignVariable>
        <Name>client_ip</Name>
        <Ref>client.ip</Ref>
    </AssignVariable>
    <AssignVariable>
        <Name>request_timestamp</Name>
        <Value>{{system.timestamp}}</Value>
    </AssignVariable>
</AssignMessage>
```

✅ **Ready to Create!**

To proceed with creation in Apigee, respond with: **"Yes, create this proxy"**
                """,
                "mode": "agent",
                "success": True,
                "requires_confirmation": True,
                "action": "create_proxy",
                "details": action_details
            }
                
        except Exception as e:
            logger.error(f"Error handling agent request: {str(e)}")
            return {
                "response": f"Error processing proxy creation request: {str(e)}",
                "mode": "agent",
                "success": False,
                "requires_confirmation": False
            }
    
    def _generate_dynamic_javascript_code(self, message: str, description: str) -> str:
        """Generate JavaScript code using AI based on the actual request - FULLY DYNAMIC"""
        
        # Use the LLM to generate JavaScript code based on the transformation request
        try:
            # Create a prompt for JavaScript code generation
            js_generation_prompt = f"""
Generate Apigee JavaScript policy code for the following transformation requirement:

**User Request:** {message}
**Transformation Description:** {description}

**Requirements:**
1. Use Apigee JavaScript context variables (context.getVariable, context.setVariable)
2. Handle both request and response transformations appropriately  
3. Include error handling where necessary
4. Add helpful comments explaining the logic
5. Use proper JSON parsing/stringifying for data manipulation

**Common Apigee JavaScript Patterns:**
- Request data: context.getVariable('request.content')
- Response data: context.getVariable('response.content') 
- Set variables: context.setVariable('variable.name', value)
- Headers: context.getVariable('request.header.name')
- Query params: context.getVariable('request.queryparam.name')

**Output:** Only return the JavaScript code, no explanations or markdown.
"""
            
            # Generate code using the LLM
            if self.llm_service and self.llm_service.llm_creative:
                generated_code = self.llm_service.llm_creative.invoke(js_generation_prompt).content
                
                # Clean up the generated code (remove markdown formatting if present)
                generated_code = self._clean_generated_code(generated_code)
                
                return generated_code
            else:
                # Fallback to generic template if LLM not available
                return self._get_generic_javascript_template(description)
                
        except Exception as e:
            logger.error(f"Error generating JavaScript code: {e}")
            return self._get_generic_javascript_template(description)

    def _clean_generated_code(self, code: str) -> str:
        """Clean up generated code by removing markdown formatting"""
        # Remove code block markers
        code = re.sub(r'```javascript\n?', '', code)
        code = re.sub(r'```\n?', '', code)
        
        # Remove any leading/trailing whitespace
        code = code.strip()
        
        # Ensure it starts with a comment if it doesn't already
        if not code.startswith('//'):
            code = f"// Generated JavaScript transformation\n{code}"
        
        return code

    def _get_generic_javascript_template(self, description: str) -> str:
        """Fallback generic template when AI generation fails"""
        return f"""// Custom transformation: {description}
var response = context.getVariable('response.content');
var data = JSON.parse(response);

// TODO: Implement your specific transformation logic here
// Based on requirement: {description}
// 
// Common patterns:
// - Combine fields: data.newField = data.field1 + ' ' + data.field2;
// - Transform values: data.transformedValue = someTransformation(data.originalValue);
// - Add metadata: data.metadata = {{ processedAt: new Date().toISOString() }};
// - Filter data: data.items = data.items.filter(item => item.active);
// - Validate: if (!data.required) throw new Error('Missing required field');

context.setVariable('response.content', JSON.stringify(data));"""