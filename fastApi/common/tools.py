from typing import List, Dict, Any
from langchain.agents import Tool
import re
import json
import os

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
        tools = PolicyTools()
        req = requirements.lower()
        suggested = []
        
        for policy_name, policy_info in tools.policy_catalog.get("policies", {}).items():
            keywords = policy_info.get("keywords", [])
            
            # Check if any keyword matches
            if any(keyword in req for keyword in keywords):
                suggested.append(policy_name)
        
        return list(set(suggested))
    
    @staticmethod
    def explain_policies(policies: List[str]) -> str:
        """Explain policies - will use scraped documentation from knowledge base"""
        result = ""
        for policy in policies:
            result += f"• **{policy}**: Policy information will be retrieved from scraped Apigee documentation\n"
        result += "\n💡 **Detailed policy information available from official Apigee docs in knowledge base**"
        return result
    
    @staticmethod
    def generate_policy_xml(policies: List[str]) -> str:
        """Generate XML - will use templates from scraped documentation"""
        result = f"\n🔧 **Policy XML Configuration:**\n\n"
        for policy in policies:
            result += f"📄 **{policy}.xml**\n"
            result += f"```xml\n<!-- {policy} configuration will be generated from official Apigee documentation -->\n```\n\n"
        
        result += "💡 **Complete XML templates available from scraped Apigee documentation**\n"
        return result
    
    @staticmethod
    def extract_target_url(requirements: str) -> str:
        """Extract target URL from requirements"""
        # Look for URLs in the text
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, requirements)
        return urls[0] if urls else "https://api.example.com"
    
    @staticmethod
    def extract_base_path(requirements: str) -> str:
        """Extract base path from requirements - purely dynamic based on user input"""
        req = requirements.lower()
        
        # Look for explicit base path mentions first
        if "base path" in req or "basepath" in req:
            # Try to extract path after "base path"
            path_match = re.search(r'base\s*path[:\s]+([/\w\-_/.]+)', req)
            if path_match:
                path = path_match.group(1)
                # Ensure it starts with /
                return path if path.startswith('/') else f'/{path}'
        
        # Look for any path patterns in the text (starting with /)
        path_match = re.search(r'(/[/\w\-_.]+)', requirements)
        if path_match:
            return path_match.group(1)
        
        # If no specific path found, generate generic versioned path
        return "/v1/api"
    
    @staticmethod
    def extract_proxy_name(text: str) -> str:
        """Extract proxy name from text with better pattern matching"""
        import re
        
        # Pattern 1: "named [name]" or "called [name]"
        name_patterns = [
            r"named\s+([a-zA-Z0-9\-_]+)",
            r"called\s+([a-zA-Z0-9\-_]+)",
            r"proxy\s+([a-zA-Z0-9\-_]+)",
            r"API\s+proxy\s+([a-zA-Z0-9\-_]+)",
            r"create.*?([a-zA-Z0-9\-_]+)\s+with",
            r"create.*?proxy.*?([a-zA-Z0-9\-_]+)"
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                name = matches[0].strip()
                # Filter out common words that aren't proxy names
                if name.lower() not in ['api', 'proxy', 'with', 'and', 'the', 'a', 'an']:
                    return name
        
        # Pattern 2: Look for hyphenated names (like portal-test-js)
        hyphen_pattern = r"\b([a-zA-Z]+(?:-[a-zA-Z]+)+)\b"
        matches = re.findall(hyphen_pattern, text)
        for match in matches:
            if match.lower() not in ['cross-origin', 'base-path']:
                return match
        
        return None
    
    @staticmethod
    def generate_policy_steps(policies: List[str]) -> str:
        """Generate XML policy steps"""
        steps = ""
        for policy in policies:
            steps += f"                <Step><Name>{policy}</Name></Step>\n"
        return steps.rstrip()

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