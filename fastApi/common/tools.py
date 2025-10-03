import os
import json
import re
from typing import List, Dict, Any
from langchain.agents import Tool

class PolicyTools:
    """Policy tools using minimal catalog + scraped documentation"""
    
    def __init__(self):
        self.policy_catalog = self._load_policy_catalog()
    
    def _load_policy_catalog(self) -> Dict[str, Any]:
        """Load minimal policy catalog"""
        policy_docs_path = "./processed_docs/policy_docs.json"
        if os.path.exists(policy_docs_path):
            with open(policy_docs_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"policies": {}}
    
    @staticmethod
    def suggest_policies(requirements: str) -> List[str]:
        """Suggest policies based on keywords from minimal catalog"""
        req = requirements.lower()
        suggested = []
        
        if any(word in req for word in ["security", "api key", "apikey", "auth"]):
            suggested.append("VerifyAPIKey")
        
        if any(word in req for word in ["cors", "cross", "browser"]):
            suggested.append("CORS")
            
        if any(word in req for word in ["rate", "limit", "quota", "throttle"]):
            suggested.append("Quota")
            
        if any(word in req for word in ["spike", "burst", "arrest"]):
            suggested.append("SpikeArrest")
            
        if any(word in req for word in ["javascript", "js", "script", "transform"]):
            suggested.append("JavaScript")
        
        return list(set(suggested))
    
    @staticmethod
    def explain_policies(policies: List[str]) -> str:
        """Explain policies - will use scraped documentation from knowledge base"""
        if not policies:
            return "No specific policies identified from requirements."
            
        explanations = {
            "VerifyAPIKey": "API Key verification for authentication and security",
            "CORS": "Cross-Origin Resource Sharing for browser-based clients", 
            "Quota": "Rate limiting to control API usage and prevent abuse",
            "SpikeArrest": "Protects against traffic spikes and bursts",
            "JavaScript": "Custom JavaScript logic for data transformation"
        }
        
        result = "**Suggested Policies:**\n"
        for policy in policies:
            desc = explanations.get(policy, f"{policy} policy")
            result += f"• **{policy}**: {desc}\n"
        
        result += "\n💡 **Detailed policy information available from official Apigee docs in knowledge base**"
        return result
    
    @staticmethod
    def generate_policy_xml(policies: List[str]) -> str:
        """Generate XML - will use templates from scraped documentation"""
        if not policies:
            return "No policies to generate XML for."
            
        result = f"\n🔧 **Policy XML Configuration:**\n\n"
        for policy in policies:
            result += f"**{policy}.xml** - Standard template available\n"
        
        result += "💡 **Complete XML templates available from scraped Apigee documentation**\n"
        return result
    
    @staticmethod
    def extract_target_url(requirements: str) -> str:
        """Extract target URL from requirements"""
        # Look for URLs in the text - improved pattern
        url_patterns = [
            r'pointing to\s+(https?://[^\s,;]+)',  # "pointing to https://..."
            r'target\s+(?:url\s+)?(?:is\s+)?(https?://[^\s,;]+)',  # "target url is https://..."
            r'backend\s+(?:url\s+)?(?:is\s+)?(https?://[^\s,;]+)',  # "backend url is https://..."
            r'(https?://[^\s<>"{}|\\^`\[\],.;]+)'  # General URL pattern
        ]
        
        for pattern in url_patterns:
            matches = re.findall(pattern, requirements, re.IGNORECASE)
            if matches:
                url = matches[0].rstrip('.,;')  # Remove trailing punctuation
                return url
        
        return "https://api.example.com"
    
    @staticmethod
    def extract_base_path(requirements: str) -> str:
        """Extract base path from requirements"""
        # Look for base path patterns - improved logic
        base_path_patterns = [
            r'base path\s+([a-zA-Z0-9\-_/]+)',  # "base path portal-test-js-bot"
            r'path\s+([a-zA-Z0-9\-_/]+)',       # "path portal-test-js-bot"
            r'named\s+([a-zA-Z0-9\-_]+)',       # "named portal-test-js-bot" - use as base path
            r'proxy\s+([a-zA-Z0-9\-_]+)'        # "proxy portal-test-js-bot" - use as base path
        ]
        
        for pattern in base_path_patterns:
            matches = re.findall(pattern, requirements, re.IGNORECASE)
            if matches:
                path = matches[0]
                # Ensure it starts with /
                if not path.startswith('/'):
                    path = f"/{path}"
                return path
        
        return "/v1/api"
    
    @staticmethod
    def extract_proxy_name(text: str) -> str:
        """Extract proxy name from text - improved extraction"""
        # Look for patterns like "named xyz", "called xyz", "proxy xyz"
        name_patterns = [
            r'named\s+([a-zA-Z0-9\-_]+)',       # "named portal-test-js-bot"
            r'called\s+([a-zA-Z0-9\-_]+)',      # "called portal-test-js-bot"
            r'proxy\s+named\s+([a-zA-Z0-9\-_]+)',  # "proxy named portal-test-js-bot"
            r'create.*?proxy\s+([a-zA-Z0-9\-_]+)',  # "create ... proxy portal-test-js-bot"
            r'API\s+proxy\s+([a-zA-Z0-9\-_]+)'   # "API proxy portal-test-js-bot"
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].replace(' ', '-')
        
        return "generated-proxy"
    
    @staticmethod
    def generate_policy_steps(policies: List[str]) -> str:
        """Generate policy execution steps"""
        if not policies:
            return "No policies configured."
            
        result = "**Policy Execution Flow:**\n"
        request_policies = [p for p in policies if p in ["VerifyAPIKey", "CORS", "SpikeArrest", "AssignMessage"]]
        response_policies = [p for p in policies if p in ["JavaScript", "Quota"]]
        
        if request_policies:
            result += f"**Request Flow:** {' → '.join(request_policies)}\n"
        if response_policies:
            result += f"**Response Flow:** {' → '.join(response_policies)}\n"
            
        return result

def create_common_tools(knowledge_service, apigee_service):
    """Create tools shared by both agents"""
    return [
        Tool(
            name="Search_Apigee_Documentation",
            func=knowledge_service.search_documentation,
            description="ALWAYS search documentation first for accurate responses"
        ),
        Tool(
            name="Analyze_Proxy_Requirements", 
            func=lambda req: apigee_service.analyze_requirements(
                req, knowledge_service.search_documentation(f"proxy best practices {req}")
            ),
            description="Analyze requirements and suggest configuration based on EXACT user request"
        ),
        Tool(
            name="Generate_Proxy_Config",
            func=apigee_service.generate_proxy_config,
            description="Generate complete XML proxy configuration with ONLY requested policies"
        ),
        Tool(
            name="Suggest_Policies",
            func=lambda req: f"🛡️ **Policies:** {PolicyTools.explain_policies(PolicyTools.suggest_policies(req))}",
            description="Suggest appropriate Apigee policies based on EXPLICIT user requirements only"
        )
    ]