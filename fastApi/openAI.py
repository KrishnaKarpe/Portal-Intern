from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import openai
import os
import json
import requests
import logging

# Updated imports for better compatibility
try:
    from langchain_openai import OpenAIEmbeddings, OpenAI
except ImportError:
    from langchain.embeddings.openai import OpenAIEmbeddings
    from langchain.llms import OpenAI

from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.agents import initialize_agent, Tool, AgentType
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Apigee AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMode(str, Enum):
    ASK = "ask"
    AGENT = "agent"

class ChatMessage(BaseModel):
    message: str
    mode: ChatMode = ChatMode.ASK
    user_context: Optional[Dict[str, Any]] = None
    organization: Optional[str] = None
    token: Optional[str] = None

class ProxyCreationRequest(BaseModel):
    name: str
    target_url: str
    base_path: str
    organization: str
    environment: str
    token: str
    description: Optional[str] = ""
    policies: Optional[List[str]] = []
    
class ConfirmationRequest(BaseModel):
    action: str
    details: Dict[str, Any]
    user_confirmation: bool

class ApigeeAIAssistant:
    def __init__(self):
        # Set OpenAI API key from environment
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            logger.warning("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.embeddings = OpenAIEmbeddings() if openai.api_key else None
        self.vectorstore = None
        self.qa_chain = None
        self.agent = None
        self.ask_agent = None
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            k=10,
            return_messages=True
        )
        
        # Initialize knowledge base and agents
        self.setup_knowledge_base()
        if self.vectorstore:
            self.setup_agents()
    
    def setup_knowledge_base(self):
        """Load processed documents and create vector store"""
        try:
            # Try to load from existing vector store first
            if os.path.exists("./chroma_db"):
                logger.info("Loading existing vector database...")
                if self.embeddings:
                    self.vectorstore = Chroma(
                        persist_directory="./chroma_db",
                        embedding_function=self.embeddings
                    )
                    logger.info("Vector database loaded successfully!")
                    self._setup_qa_chain()
                    return
            
            # Load processed documents
            processed_docs_path = "./processed_docs/processed_docs.json"
            if os.path.exists(processed_docs_path):
                logger.info("Loading processed documentation...")
                with open(processed_docs_path, 'r', encoding='utf-8') as f:
                    doc_data = json.load(f)
                
                # Convert to LangChain documents
                documents = []
                for item in doc_data:
                    doc = Document(
                        page_content=item['content'],
                        metadata=item['metadata']
                    )
                    documents.append(doc)
                
                if self.embeddings and documents:
                    # Create vector store
                    self.vectorstore = Chroma.from_documents(
                        documents,
                        self.embeddings,
                        persist_directory="./chroma_db"
                    )
                    logger.info(f"Created vector store with {len(documents)} documents")
                    self._setup_qa_chain()
                else:
                    logger.warning("No embeddings available or no documents to process")
            else:
                logger.warning(f"No processed docs found at {processed_docs_path}")
                logger.info("Please run the documentation ingestion script first:")
                logger.info("python scripts/ingest_docs.py")
                
        except Exception as e:
            logger.error(f"Error setting up knowledge base: {str(e)}")
    
    def _setup_qa_chain(self):
        """Setup the QA chain"""
        try:
            llm = OpenAI(temperature=0.1)
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(search_kwargs={"k": 5})
            )
            logger.info("QA chain setup successfully")
        except Exception as e:
            logger.error(f"Error setting up QA chain: {str(e)}")
    
    def setup_agents(self):
        """Setup both Ask and Agent mode agents"""
        if not self.vectorstore:
            logger.warning("Cannot setup agents without vector store")
            return
            
        try:
            llm_creative = OpenAI(temperature=0.7)
            llm_precise = OpenAI(temperature=0.1)
            
            # Common tools
            common_tools = [
                Tool(
                    name="Search_Apigee_Documentation",
                    func=self.search_documentation,
                    description="Search Apigee documentation and best practices from knowledge base"
                ),
                Tool(
                    name="Analyze_Proxy_Requirements",
                    func=self.analyze_requirements,
                    description="Analyze user requirements and suggest proxy configuration"
                ),
                Tool(
                    name="Generate_Proxy_Config",
                    func=self.generate_proxy_config,
                    description="Generate XML configuration for Apigee proxy"
                ),
                Tool(
                    name="Suggest_Policies",
                    func=self.suggest_policies,
                    description="Suggest appropriate policies based on requirements"
                )
            ]
            
            # Agent mode specific tools
            agent_tools = common_tools + [
                Tool(
                    name="Create_API_Proxy",
                    func=self.create_api_proxy,
                    description="Create an API proxy in Apigee (requires confirmation)"
                ),
                Tool(
                    name="Deploy_Proxy",
                    func=self.deploy_proxy,
                    description="Deploy proxy to environment (requires confirmation)"
                )
            ]
            
            # Ask Mode Agent (Copilot-like)
            self.ask_agent = initialize_agent(
                common_tools,
                llm_creative,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                verbose=True,
                memory=self.memory
            )
            
            # Agent Mode (Autonomous)
            self.agent = initialize_agent(
                agent_tools,
                llm_precise,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                verbose=True,
                memory=self.memory
            )
            
            logger.info("Agents setup successfully")
            
        except Exception as e:
            logger.error(f"Error setting up agents: {str(e)}")
    
    def search_documentation(self, query: str) -> str:
        """Search documentation using RAG"""
        if not self.qa_chain:
            return "Documentation search not available. Please check OpenAI API key and vector store."
        
        try:
            result = self.qa_chain.run(query)
            return f"📚 **Documentation Search Result:**\n{result}"
        except Exception as e:
            return f"Error searching documentation: {str(e)}"
    
    def analyze_requirements(self, requirements: str) -> str:
        """Analyze user requirements and suggest configuration"""
        doc_context = self.search_documentation(f"proxy creation best practices {requirements}")
        
        # Extract suggestions
        target_url = self._extract_target_suggestion(requirements)
        base_path = self._extract_basepath_suggestion(requirements)
        policies = self._suggest_policies(requirements)
        
        return f"""
🔍 **Requirement Analysis:**

**Recommended Configuration:**
- Target Endpoint: `{target_url}`
- Base Path: `{base_path}`
- Recommended Policies: {', '.join(policies)}

**Policy Explanations:**
{self._explain_policies(policies)}

**Best Practices:**
{doc_context}

💡 **Next Steps:**
1. Review the suggested configuration
2. Modify as needed for your specific use case
3. In Agent mode, I can create this proxy for you
"""
    
    def generate_proxy_config(self, requirements: str) -> str:
        """Generate XML configuration for proxy"""
        target_url = self._extract_target_suggestion(requirements)
        base_path = self._extract_basepath_suggestion(requirements)
        policies = self._suggest_policies(requirements)
        
        proxy_xml = f'''
🔧 **Proxy Endpoint Configuration:**

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
    <Description>Generated proxy for {requirements[:50]}...</Description>
    <HTTPProxyConnection>
        <BasePath>{base_path}</BasePath>
        <VirtualHost>default</VirtualHost>
        <VirtualHost>secure</VirtualHost>
    </HTTPProxyConnection>
    <Flows>
        <Flow name="Main Flow">
            <Request>
                {self._generate_policy_steps(policies, 'request')}
            </Request>
            <Response>
                {self._generate_policy_steps(policies, 'response')}
            </Response>
        </Flow>
    </Flows>
    <RouteRule name="default">
        <TargetEndpoint>default</TargetEndpoint>
    </RouteRule>
</ProxyEndpoint>
```

🎯 **Target Endpoint Configuration:**

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
    <Description>Target for {requirements[:50]}...</Description>
    <HTTPTargetConnection>
        <URL>{target_url}</URL>
    </HTTPTargetConnection>
</TargetEndpoint>
```

📋 **Required Policy Files:**
{self._generate_policy_xml(policies)}
        '''
        
        return proxy_xml
    
    def suggest_policies(self, requirements: str) -> str:
        """Suggest appropriate policies"""
        policies = self._suggest_policies(requirements)
        
        suggestion = "🛡️ **Recommended Policies:**\n\n"
        for policy in policies:
            suggestion += f"**{policy}:**\n{self._get_policy_description(policy)}\n\n"
        
        return suggestion
    
    def create_api_proxy(self, proxy_config: str) -> str:
        """Create API proxy (requires confirmation)"""
        return f"""
🤖 **Proxy Creation Ready**

I can create an API proxy with this configuration:
{proxy_config}

**What I'll do:**
1. ✅ Create the proxy bundle with XML configurations
2. ✅ Apply the recommended policies  
3. ✅ Deploy to your specified environment
4. ✅ Verify the deployment

⚠️ **Confirmation Required:**
To proceed, please confirm by saying: **"Yes, create the proxy"**

Or provide any modifications you'd like me to make first.
        """
    
    def deploy_proxy(self, deployment_config: str) -> str:
        """Deploy proxy to environment"""
        return f"""
🚀 **Deployment Ready**

Configuration: {deployment_config}

**Deployment Steps:**
1. Package proxy bundle
2. Upload to Apigee
3. Deploy to target environment
4. Run health checks

Please confirm deployment by saying: **"Yes, deploy the proxy"**
        """
    
    # Helper methods
    def _extract_target_suggestion(self, requirements: str) -> str:
        """Extract or suggest target URL"""
        if "http" in requirements.lower():
            # Try to extract URL from requirements
            words = requirements.split()
            for word in words:
                if word.startswith(('http://', 'https://')):
                    return word
        return "https://api.example.com"
    
    def _extract_basepath_suggestion(self, requirements: str) -> str:
        """Suggest base path"""
        if "path" in requirements.lower() or "endpoint" in requirements.lower():
            return "/v1/api"
        elif "weather" in requirements.lower():
            return "/v1/weather"
        elif "user" in requirements.lower():
            return "/v1/users"
        else:
            return "/v1/api"
    
    def _suggest_policies(self, requirements: str) -> List[str]:
        """Suggest policies based on requirements"""
        policies = []
        req_lower = requirements.lower()
        
        # Security policies
        if any(word in req_lower for word in ["secure", "auth", "key", "token"]):
            policies.append("API Key Verification")
        if "oauth" in req_lower:
            policies.append("OAuth v2.0")
        if "cors" in req_lower or "browser" in req_lower:
            policies.append("CORS")
            
        # Traffic management
        if any(word in req_lower for word in ["rate", "limit", "throttle"]):
            policies.append("Spike Arrest")
            policies.append("Rate Limiting")
        if "quota" in req_lower:
            policies.append("Quota")
            
        # Transformation
        if "transform" in req_lower or "convert" in req_lower:
            policies.append("JSON to XML Transform")
        if "validate" in req_lower:
            policies.append("JSON Schema Validation")
            
        # Default policies if none specified
        if not policies:
            policies = ["API Key Verification", "CORS", "Spike Arrest"]
            
        return policies
    
    def _explain_policies(self, policies: List[str]) -> str:
        """Explain what each policy does"""
        explanations = {
            "API Key Verification": "Validates API keys sent by client applications",
            "OAuth v2.0": "Provides OAuth 2.0 authentication and authorization",
            "CORS": "Handles Cross-Origin Resource Sharing for browser requests",
            "Spike Arrest": "Protects against sudden traffic spikes",
            "Rate Limiting": "Controls the rate of requests per time period",
            "Quota": "Enforces usage limits over longer time periods",
            "JSON to XML Transform": "Converts request/response between JSON and XML",
            "JSON Schema Validation": "Validates JSON payloads against schemas"
        }
        
        result = ""
        for policy in policies:
            desc = explanations.get(policy, "Policy for enhanced API functionality")
            result += f"  • **{policy}**: {desc}\n"
        
        return result
    
    def _generate_policy_steps(self, policies: List[str], flow_type: str) -> str:
        """Generate XML for policy steps"""
        steps = ""
        for policy in policies:
            policy_name = policy.replace(" ", "-").lower()
            steps += f'                <Step><Name>{policy_name}</Name></Step>\n'
        return steps
    
    def _generate_policy_xml(self, policies: List[str]) -> str:
        """Generate sample policy XML files"""
        policy_xmls = ""
        for policy in policies:
            policy_name = policy.replace(" ", "-").lower()
            policy_xmls += f"\n📄 **{policy_name}.xml**\n"
            policy_xmls += self._get_policy_xml_template(policy)
            policy_xmls += "\n"
        return policy_xmls
    
    def _get_policy_xml_template(self, policy: str) -> str:
        """Get XML template for specific policy"""
        templates = {
            "API Key Verification": '''```xml
<VerifyAPIKey name="verify-api-key">
    <APIKey ref="request.queryparam.apikey"/>
</VerifyAPIKey>
```''',
            "CORS": '''```xml
<CORS name="cors-policy">
    <AllowOrigins>*</AllowOrigins>
    <AllowMethods>GET,POST,PUT,DELETE</AllowMethods>
    <AllowHeaders>Content-Type,Authorization</AllowHeaders>
</CORS>
```''',
            "Spike Arrest": '''```xml
<SpikeArrest name="spike-arrest">
    <Rate>10ps</Rate>
</SpikeArrest>
```'''
        }
        return templates.get(policy, "<!-- Policy XML template -->")
    
    def _get_policy_description(self, policy: str) -> str:
        """Get detailed policy description"""
        descriptions = {
            "API Key Verification": "Validates API keys and can extract developer/app information",
            "OAuth v2.0": "Implements OAuth 2.0 flows for secure API access",
            "CORS": "Enables cross-origin requests from web browsers",
            "Spike Arrest": "Smooths traffic spikes to protect backend systems",
            "Rate Limiting": "Enforces request rate limits per developer/app",
            "Quota": "Manages API usage quotas over time periods"
        }
        return descriptions.get(policy, "Enhances API functionality and security")

# Initialize the assistant
assistant = ApigeeAIAssistant()

@app.post("/chat")
async def chat_with_bot(chat_message: ChatMessage):
    try:
        if chat_message.mode == ChatMode.ASK:
            # Ask mode - provide guidance and suggestions
            response = assistant.ask_agent.run(
                input=chat_message.message,
                chat_history=assistant.memory.chat_memory.messages
            )
        else:
            # Agent mode - can take actions
            response = assistant.agent.run(
                input=chat_message.message,
                chat_history=assistant.memory.chat_memory.messages
            )
        
        return {
            "response": response,
            "mode": chat_message.mode,
            "success": True,
            "requires_confirmation": "confirm" in response.lower() or "proceed" in response.lower()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/confirm-action")
async def confirm_action(confirmation: ConfirmationRequest):
    """Handle user confirmations for agent actions"""
    if not confirmation.user_confirmation:
        return {"response": "Action cancelled.", "success": True}
    
    try:
        # Execute the confirmed action
        if confirmation.action == "create_proxy":
            result = await execute_proxy_creation(confirmation.details)
            return {
                "response": f"✅ Proxy created successfully! {result}",
                "success": True,
                "action_completed": True
            }
        else:
            return {"response": "Unknown action type.", "success": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def execute_proxy_creation(details: Dict[str, Any]):
    """Actually create the proxy using your existing backend API"""
    # This integrates with your existing backend
    backend_url = "http://localhost:5000/api"
    
    proxy_data = {
        "name": details.get("name"),
        "targetUrl": details.get("target_url"),
        "basePath": details.get("base_path"),
        "organization": details.get("organization"),
        "token": details.get("token"),
        "policies": details.get("policies", [])
    }
    
    # Call your existing backend API (you'll need to create this endpoint)
    response = requests.post(f"{backend_url}/proxies/create", json=proxy_data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to create proxy: {response.text}")

@app.post("/upload-docs")
async def upload_documentation(files: List[str]):
    """Endpoint to refresh knowledge base with new PDFs"""
    try:
        assistant.setup_knowledge_base()
        return {"message": "Documentation updated successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Apigee AI Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/chat",
            "confirm": "/confirm-action",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "vector_store": "available" if assistant.vectorstore else "not_available",
        "agents": "ready" if assistant.ask_agent and assistant.agent else "not_ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)