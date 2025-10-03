from typing import List
from langchain.agents import Tool
import re

class PolicyTools:
    """Shared policy and configuration tools"""
    
    @staticmethod
    def suggest_policies(requirements: str) -> List[str]:
        """Suggest policies based ONLY on what user explicitly asked for"""
        policies = []
        req = requirements.lower()
        
        # Security - ONLY if explicitly mentioned
        if any(word in req for word in ["api key", "apikey", "key auth", "verify key"]):
            policies.append("VerifyAPIKey")
        if any(word in req for word in ["oauth", "oauth2", "oauth 2.0"]):
            policies.append("OAuthV2")
        if any(word in req for word in ["jwt", "json web token", "jwt validation"]):
            policies.append("VerifyJWT")
            
        # CORS - ONLY if explicitly mentioned
        if any(word in req for word in ["cors", "cross origin", "browser", "frontend"]):
            policies.append("CORS")
            
        # Rate Limiting - ONLY if explicitly mentioned
        if any(word in req for word in ["rate limit", "throttle", "requests per"]):
            policies.append("Quota")
        if any(word in req for word in ["spike", "traffic spike", "spike arrest"]):
            policies.append("SpikeArrest")
            
        # Transformation - ONLY if explicitly mentioned
        if any(word in req for word in ["json to xml", "xml transform", "transform"]):
            policies.append("JSONToXML")
        if any(word in req for word in ["validate json", "json validation", "schema"]):
            policies.append("JSONThreatProtection")
            
        # Caching - ONLY if explicitly mentioned
        if any(word in req for word in ["cache", "caching", "response cache"]):
            policies.append("ResponseCache")
            
        return policies
    
    @staticmethod
    def explain_policies(policies: List[str]) -> str:
        """Explain what each policy does"""
        explanations = {
            "VerifyAPIKey": "Validates API keys sent by client applications",
            "OAuthV2": "Provides OAuth 2.0 authentication and authorization", 
            "VerifyJWT": "Validates JSON Web Tokens for authentication",
            "CORS": "Handles Cross-Origin Resource Sharing for browser requests",
            "SpikeArrest": "Protects against sudden traffic spikes",
            "Quota": "Enforces usage limits over time periods",
            "JSONToXML": "Converts request/response between JSON and XML",
            "JSONThreatProtection": "Validates JSON payloads against threats",
            "ResponseCache": "Caches API responses to improve performance"
        }
        
        result = ""
        for policy in policies:
            desc = explanations.get(policy, "Policy for enhanced API functionality")
            result += f"• **{policy}**: {desc}\n"
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
    def extract_proxy_name(requirements: str) -> str:
        """Extract proxy name from requirements"""
        req = requirements.lower()
        
        # Look for explicit proxy name mentions
        name_patterns = [
            r'proxy\s+(?:name|called)\s+([a-zA-Z0-9\-_]+)',
            r'(?:name|called)\s+([a-zA-Z0-9\-_]+)',
            r'create\s+(?:a\s+)?([a-zA-Z0-9\-_]+)(?:\s+proxy)?'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, req)
            if match:
                name = match.group(1)
                # Clean up common words that aren't actual names
                if name not in ['proxy', 'api', 'service', 'endpoint']:
                    return name
        
        # If no specific name found, return generic
        return "api-proxy"
    
    @staticmethod
    def generate_policy_steps(policies: List[str]) -> str:
        """Generate XML policy steps"""
        steps = ""
        for policy in policies:
            steps += f"                <Step><Name>{policy}</Name></Step>\n"
        return steps.rstrip()
    
    @staticmethod
    def generate_policy_xml(policies: List[str]) -> str:
        """Generate XML templates for requested policies only"""
        templates = {
            "VerifyAPIKey": '''```xml
<!-- VerifyAPIKey.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyAPIKey async="false" continueOnError="false" enabled="true" name="VerifyAPIKey">
    <APIKey ref="request.queryparam.apikey"/>
</VerifyAPIKey>
```''',
            "OAuthV2": '''```xml
<!-- OAuthV2.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 async="false" continueOnError="false" enabled="true" name="OAuthV2">
    <Operation>VerifyAccessToken</Operation>
</OAuthV2>
```''',
            "VerifyJWT": '''```xml
<!-- VerifyJWT.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyJWT async="false" continueOnError="false" enabled="true" name="VerifyJWT">
    <Source>request.header.authorization</Source>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</VerifyJWT>
```''',
            "CORS": '''```xml
<!-- CORS.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<CORS async="false" continueOnError="false" enabled="true" name="CORS">
    <AllowOrigins>*</AllowOrigins>
    <AllowMethods>GET,POST,PUT,DELETE,OPTIONS</AllowMethods>
    <AllowHeaders>Content-Type,Authorization,X-Requested-With</AllowHeaders>
    <ExposeHeaders>Content-Length</ExposeHeaders>
    <MaxAge>3628800</MaxAge>
    <AllowCredentials>false</AllowCredentials>
</CORS>
```''',
            "SpikeArrest": '''```xml
<!-- SpikeArrest.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest async="false" continueOnError="false" enabled="true" name="SpikeArrest">
    <Rate>10ps</Rate>
</SpikeArrest>
```''',
            "Quota": '''```xml
<!-- Quota.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota async="false" continueOnError="false" enabled="true" name="Quota">
    <Allow count="100"/>
    <Interval>1</Interval>
    <TimeUnit>minute</TimeUnit>
    <Identifier ref="request.queryparam.apikey"/>
</Quota>
```''',
            "JSONToXML": '''```xml
<!-- JSONToXML.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<JSONToXML async="false" continueOnError="false" enabled="true" name="JSONToXML">
    <Source>request</Source>
    <OutputVariable>request</OutputVariable>
</JSONToXML>
```''',
            "JSONThreatProtection": '''```xml
<!-- JSONThreatProtection.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<JSONThreatProtection async="false" continueOnError="false" enabled="true" name="JSONThreatProtection">
    <ArrayElementCount>20</ArrayElementCount>
    <ContainerDepth>10</ContainerDepth>
    <ObjectEntryCount>15</ObjectEntryCount>
    <ObjectEntryNameLength>50</ObjectEntryNameLength>
    <Source>request</Source>
    <StringValueLength>500</StringValueLength>
</JSONThreatProtection>
```''',
            "ResponseCache": '''```xml
<!-- ResponseCache.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ResponseCache async="false" continueOnError="false" enabled="true" name="ResponseCache">
    <CacheKey>
        <Prefix/>
        <KeyFragment ref="request.uri" type="string"/>
    </CacheKey>
    <Scope>Exclusive</Scope>
    <ExpirySettings>
        <ExpiryDate/>
        <TimeOfDay/>
        <TimeoutInSec ref="">300</TimeoutInSec>
    </ExpirySettings>
</ResponseCache>
```'''
        }
        
        policy_xmls = ""
        for policy in policies:
            if policy in templates:
                policy_xmls += f"\n📄 **{policy}.xml**\n"
                policy_xmls += templates[policy]
                policy_xmls += "\n"
        
        return policy_xmls

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