from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import os
import json
import requests
import logging
from dotenv import load_dotenv

# Langchain imports for Groq
from langchain_groq import ChatGroq
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.agents import initialize_agent, Tool, AgentType
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import Document
from langchain_community.embeddings import HuggingFaceEmbeddings

# Load environment
load_dotenv()

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
        # Initialize Groq client (Free API)
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY not found. Get free API key from: https://console.groq.com/")
        
        # Use free HuggingFace embeddings (no API key required)
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            logger.info("HuggingFace embeddings initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing embeddings: {str(e)}")
            self.embeddings = None
        
        self.vectorstore = None
        self.qa_chain = None
        self.agent = None
        self.ask_agent = None
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            k=10,
            return_messages=True
        )
        
        # Initialize Groq LLMs only if API key is available
        if self.groq_api_key:
            try:
                # Updated to use the free llama-3.3-70b-versatile model
                self.llm_creative = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name="llama-3.3-70b-versatile",  # Updated free model
                    temperature=0.7,
                    max_tokens=2048
                )
                self.llm_precise = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name="llama-3.3-70b-versatile",  # Updated free model
                    temperature=0.1,
                    max_tokens=2048
                )
                logger.info("Groq LLMs initialized successfully with llama-3.3-70b-versatile")
            except Exception as e:
                logger.error(f"Error initializing Groq LLMs: {str(e)}")
                self.llm_creative = None
                self.llm_precise = None
        else:
            self.llm_creative = None
            self.llm_precise = None
        
        # Initialize knowledge base and agents
        self.setup_knowledge_base()
        if self.vectorstore and self.groq_api_key:
            self.setup_agents()
    
    def setup_knowledge_base(self):
        """Load processed documents and create vector store"""
        if not self.embeddings:
            logger.warning("Cannot setup knowledge base without embeddings")
            return
            
        try:
            # Try to load from existing vector store first
            if os.path.exists("./chroma_db"):
                logger.info("Loading existing vector database...")
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
                
                if documents:
                    # Create vector store with free embeddings
                    self.vectorstore = Chroma.from_documents(
                        documents,
                        self.embeddings,
                        persist_directory="./chroma_db"
                    )
                    logger.info(f"Created vector store with {len(documents)} documents")
                    self._setup_qa_chain()
                else:
                    logger.warning("No documents to process")
            else:
                logger.warning(f"No processed docs found at {processed_docs_path}")
                logger.info("Please run: python data_ingestion.py first")
                
        except Exception as e:
            logger.error(f"Error setting up knowledge base: {str(e)}")
    
    def _setup_qa_chain(self):
        """Setup the QA chain with Groq"""
        try:
            if self.llm_precise and self.vectorstore:
                self.qa_chain = RetrievalQA.from_chain_type(
                    llm=self.llm_precise,
                    chain_type="stuff",
                    retriever=self.vectorstore.as_retriever(search_kwargs={"k": 5})
                )
                logger.info("QA chain setup successfully with Groq")
            else:
                logger.warning("Cannot setup QA chain - missing LLM or vectorstore")
        except Exception as e:
            logger.error(f"Error setting up QA chain: {str(e)}")
    
    def setup_agents(self):
        """Setup both Ask and Agent mode agents with Groq"""
        if not self.vectorstore or not self.groq_api_key:
            logger.warning("Cannot setup agents without vector store or API key")
            return
            
        try:
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
                self.llm_creative,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                verbose=True,
                memory=self.memory
            )
            
            # Agent Mode (Autonomous)
            self.agent = initialize_agent(
                agent_tools,
                self.llm_precise,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                verbose=True,
                memory=self.memory
            )
            
            logger.info("Agents setup successfully with Groq")
            
        except Exception as e:
            logger.error(f"Error setting up agents: {str(e)}")
    
    def search_documentation(self, query: str) -> str:
        """Search documentation using RAG"""
        if not self.qa_chain:
            return "Documentation search not available. Please check Groq API key and vector store."
        
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

**Best Practices from Documentation:**
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
    
    # Helper methods (keep all your existing helper methods)
    def _extract_target_suggestion(self, requirements: str) -> str:
        if "http" in requirements.lower():
            words = requirements.split()
            for word in words:
                if word.startswith(('http://', 'https://')):
                    return word
        return "https://api.example.com"
    
    def _extract_basepath_suggestion(self, requirements: str) -> str:
        if "path" in requirements.lower() or "endpoint" in requirements.lower():
            return "/v1/api"
        elif "weather" in requirements.lower():
            return "/v1/weather"
        elif "user" in requirements.lower():
            return "/v1/users"
        else:
            return "/v1/api"
    
    def _suggest_policies(self, requirements: str) -> List[str]:
        policies = []
        req_lower = requirements.lower()
        
        if any(word in req_lower for word in ["secure", "auth", "key", "token"]):
            policies.append("API Key Verification")
        if "oauth" in req_lower:
            policies.append("OAuth v2.0")
        if "cors" in req_lower or "browser" in req_lower:
            policies.append("CORS")
        if any(word in req_lower for word in ["rate", "limit", "throttle"]):
            policies.append("Spike Arrest")
            policies.append("Rate Limiting")
        if "quota" in req_lower:
            policies.append("Quota")
        if "transform" in req_lower or "convert" in req_lower:
            policies.append("JSON to XML Transform")
        if "validate" in req_lower:
            policies.append("JSON Schema Validation")
        
        if not policies:
            policies = ["API Key Verification", "CORS", "Spike Arrest"]
            
        return policies
    
    def _explain_policies(self, policies: List[str]) -> str:
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
        steps = ""
        for policy in policies:
            policy_name = policy.replace(" ", "-").lower()
            steps += f'                <Step><Name>{policy_name}</Name></Step>\n'
        return steps
    
    def _generate_policy_xml(self, policies: List[str]) -> str:
        policy_xmls = ""
        for policy in policies:
            policy_name = policy.replace(" ", "-").lower()
            policy_xmls += f"\n📄 **{policy_name}.xml**\n"
            policy_xmls += self._get_policy_xml_template(policy)
            policy_xmls += "\n"
        return policy_xmls
    
    def _get_policy_xml_template(self, policy: str) -> str:
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
        if not assistant.groq_api_key:
            return {
                "response": "⚠️ **Setup Required**: Please set GROQ_API_KEY environment variable.\n\n🆓 **Get free API key**: https://console.groq.com/\n\n💡 **Alternative**: I can still help with static analysis and configuration suggestions!",
                "mode": chat_message.mode,
                "success": True,
                "requires_confirmation": False
            }
        
        if chat_message.mode == ChatMode.ASK:
            response = assistant.ask_agent.run(
                input=chat_message.message,
                chat_history=assistant.memory.chat_memory.messages
            )
        else:
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
        logger.error(f"Chat error: {str(e)}")
        return {
            "response": f"I encountered an error: {str(e)}\n\nPlease check your Groq API key and try again.",
            "mode": chat_message.mode,
            "success": False,
            "requires_confirmation": False
        }

@app.post("/confirm-action")
async def confirm_action(confirmation: ConfirmationRequest):
    """Handle user confirmations for agent actions"""
    if not confirmation.user_confirmation:
        return {"response": "Action cancelled.", "success": True}
    
    try:
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
    backend_url = "http://localhost:5000/api"
    
    proxy_data = {
        "name": details.get("name"),
        "targetUrl": details.get("target_url"),
        "basePath": details.get("base_path"),
        "organization": details.get("organization"),
        "token": details.get("token"),
        "policies": details.get("policies", [])
    }
    
    response = requests.post(f"{backend_url}/proxies/create", json=proxy_data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to create proxy: {response.text}")

@app.get("/")
async def root():
    return {
        "message": "Apigee AI Assistant API - Powered by Groq (Free)",
        "version": "2.0.0",
        "endpoints": {
            "chat": "/chat",
            "confirm": "/confirm-action",
            "health": "/health"
        },
        "setup": {
            "groq_api_key": "Set GROQ_API_KEY environment variable",
            "get_key": "https://console.groq.com/ (Free)"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "llm_provider": "Groq (Free)",
        "api_key_configured": bool(assistant.groq_api_key),
        "vector_store": "available" if assistant.vectorstore else "not_available",
        "agents": "ready" if assistant.ask_agent and assistant.agent else "not_ready",
        "embeddings": "HuggingFace (Free)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)