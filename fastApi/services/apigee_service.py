import os
import json
import requests
import zipfile
import tempfile
import logging
import re  # Make sure this import exists
from typing import Dict, Any, List
from common.tools import PolicyTools

logger = logging.getLogger(__name__)

class ApigeeService:
    """Handles Apigee-specific operations"""
    
    def __init__(self):
        self.base_url = "https://apigee.googleapis.com/v1"
        self.org = os.getenv('APIGEE_ORG', 'apigee-non-prod-crjb')
        self.environment = os.getenv('APIGEE_ENVIRONMENT', 'apim-dev')
    
    def _get_access_token(self) -> str:
        """Get access token"""
        token = os.getenv('APIGEE_TOKEN')
        if not token:
            raise Exception("APIGEE_TOKEN not found in environment variables")
        return token
    
    def _make_request(self, method: str, url: str, data=None, files=None) -> Dict[str, Any]:
        """Make authenticated request to Apigee API"""
        try:
            token = self._get_access_token()
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            if files:
                # Let requests set the Content-Type for file uploads
                response = requests.request(method, url, headers=headers, files=files)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.request(method, url, headers=headers, json=data)
            
            logger.info(f"Apigee API {method} {url}: {response.status_code}")
            
            if response.status_code >= 400:
                raise Exception(f"API error {response.status_code}: {response.text}")
            
            return response.json() if response.content else {}
            
        except Exception as e:
            logger.error(f"Apigee API request failed: {str(e)}")
            raise e
    
    def _generate_policy_xml(self, policy_name: str, custom_logic: Dict[str, Any] = None) -> str:
        """Generate policy XML"""
        
        # Default policy templates
        policy_templates = {
            "VerifyAPIKey": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyAPIKey async="false" continueOnError="false" enabled="true" name="VerifyAPIKey">
    <DisplayName>Verify API Key</DisplayName>
    <APIKey ref="request.queryparam.apikey"/>
</VerifyAPIKey>''',
        
            "JavaScript": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Javascript async="false" continueOnError="false" enabled="true" name="JavaScript">
    <DisplayName>JavaScript</DisplayName>
    <ResourceURL>jsc://javascript-script.js</ResourceURL>
</Javascript>''',
        
            "AssignMessage": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage async="false" continueOnError="false" enabled="true" name="AssignMessage">
    <DisplayName>Assign Message</DisplayName>
    <AssignVariable>
        <Name>client_ip</Name>
        <Ref>client.ip</Ref>
    </AssignVariable>
    <AssignVariable>
        <Name>request_timestamp</Name>
        <Value>{system.timestamp}</Value>
    </AssignVariable>
</AssignMessage>''',
        
            "CORS": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<CORS async="false" continueOnError="false" enabled="true" name="CORS">
    <DisplayName>CORS</DisplayName>
    <AllowOrigins>*</AllowOrigins>
    <AllowMethods>GET,POST,PUT,DELETE,OPTIONS</AllowMethods>
    <AllowHeaders>Content-Type,Authorization,X-Requested-With</AllowHeaders>
    <MaxAge>3628800</MaxAge>
    <AllowCredentials>false</AllowCredentials>
    <GeneratePreflightResponse>true</GeneratePreflightResponse>
</CORS>''',
        
            "SpikeArrest": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest async="false" continueOnError="false" enabled="true" name="SpikeArrest">
    <DisplayName>Spike Arrest</DisplayName>
    <Rate>10ps</Rate>
</SpikeArrest>''',
        
            "Quota": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota async="false" continueOnError="false" enabled="true" name="Quota">
    <DisplayName>Quota</DisplayName>
    <Allow count="100"/>
    <Interval>1</Interval>
    <TimeUnit>minute</TimeUnit>
</Quota>'''
        }
        
        # Return the template or a generic one if not found
        return policy_templates.get(policy_name, f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<{policy_name} async="false" continueOnError="false" enabled="true" name="{policy_name}">
    <DisplayName>{policy_name}</DisplayName>
</{policy_name}>''')
    
    def _generate_proxy_endpoint_xml(self, name: str, base_path: str, policies: List[str]) -> str:
        """Generate proxy endpoint XML with proper policy references"""
        
        # Build policy steps
        preflow_request_steps = []
        preflow_response_steps = []
        postflow_request_steps = []
        postflow_response_steps = []
        
        for policy in policies:
            if policy in ["CORS", "VerifyAPIKey", "SpikeArrest", "Quota", "AssignMessage"]:
                # Security and assignment policies go in PreFlow Request
                preflow_request_steps.append(f'        <Step>\n            <Name>{policy}</Name>\n        </Step>')
            elif policy == "JavaScript":
                # JavaScript typically in PostFlow Response for transformation
                postflow_response_steps.append(f'        <Step>\n            <Name>{policy}</Name>\n        </Step>')
            else:
                # Others, default to PreFlow Response
                preflow_response_steps.append(f'        <Step>\n            <Name>{policy}</Name>\n        </Step>')
        
        preflow_request_xml = "\n".join(preflow_request_steps) if preflow_request_steps else ""
        preflow_response_xml = "\n".join(preflow_response_steps) if preflow_response_steps else ""
        postflow_request_xml = "\n".join(postflow_request_steps) if postflow_request_steps else ""
        postflow_response_xml = "\n".join(postflow_response_steps) if postflow_response_steps else ""
        
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
    <Description>{name} proxy endpoint</Description>
    <PreFlow name="PreFlow">
        <Request>
{preflow_request_xml}
        </Request>
        <Response>
{preflow_response_xml}
        </Response>
    </PreFlow>
    <PostFlow name="PostFlow">
        <Request>
{postflow_request_xml}
        </Request>
        <Response>
{postflow_response_xml}
        </Response>
    </PostFlow>
    <Flows/>
    <HTTPProxyConnection>
        <BasePath>{base_path}</BasePath>
        <VirtualHost>default</VirtualHost>
    </HTTPProxyConnection>
    <RouteRule name="default">
        <TargetEndpoint>default</TargetEndpoint>
    </RouteRule>
</ProxyEndpoint>'''
    
    def _generate_target_endpoint_xml(self, target_url: str) -> str:
        """Generate target endpoint XML"""
        # Remove any trailing periods in URLs
        if target_url.endswith('.'):
            target_url = target_url[:-1]
            
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
    <Description>Default target endpoint</Description>
    <PreFlow name="PreFlow">
        <Request/>
        <Response/>
    </PreFlow>
    <PostFlow name="PostFlow">
        <Request/>
        <Response/>
    </PostFlow>
    <Flows/>
    <HTTPTargetConnection>
        <URL>{target_url}</URL>
    </HTTPTargetConnection>
</TargetEndpoint>'''
    
    def _generate_proxy_xml(self, name: str, description: str, policies: List[str]) -> str:
        """Generate main proxy XML"""
        
        # Build policy references
        policy_refs = []
        for policy in policies:
            policy_refs.append(f'    <Policy>{policy}</Policy>')
        
        policy_xml = "\n".join(policy_refs) if policy_refs else ""
        
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<APIProxy name="{name}">
    <Description>{description}</Description>
    <DisplayName>{name}</DisplayName>
{policy_xml}
    <ProxyEndpoints>
        <ProxyEndpoint>default</ProxyEndpoint>
    </ProxyEndpoints>
    <Resources/>
    <TargetEndpoints>
        <TargetEndpoint>default</TargetEndpoint>
    </TargetEndpoints>
</APIProxy>'''
    
    def _create_javascript_resource(self, custom_logic: Dict[str, Any]) -> str:
        """Create JavaScript resource content"""
        if not custom_logic:
            return "// Default JavaScript code\nconsole.log('Hello from Apigee');"
            
        if "javascript" in custom_logic and custom_logic["javascript"].get("required", False):
            js_info = custom_logic["javascript"]
            code = js_info.get("code", "").strip()
            
            if code:
                return code
            
            # Generate based on purpose
            purpose = js_info.get("purpose", "custom_processing")
            
            if purpose == "data_combination":
                return """// Combine fields in response
var response = context.getVariable('response.content');
var data = JSON.parse(response);

if (data.firstname && data.lastname) {
    data.fullname = data.firstname + ' ' + data.lastname;
}

context.setVariable('response.content', JSON.stringify(data));"""
                
        return "// Default JavaScript code\nconsole.log('Hello from Apigee');"
    
    def create_proxy_bundle(self, details: Dict[str, Any]) -> bytes:
        """Create proxy bundle ZIP file"""
        try:
            name = details["name"]
            target_url = details["target_url"]
            base_path = details["base_path"]
            description = details.get("description", f"Proxy: {name}")
            policies = details.get("policies", [])
            custom_logic = details.get("custom_logic", {})
            
            # Create temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                # Create directory structure
                apiproxy_dir = os.path.join(temp_dir, "apiproxy")
                policies_dir = os.path.join(apiproxy_dir, "policies")
                proxies_dir = os.path.join(apiproxy_dir, "proxies")
                targets_dir = os.path.join(apiproxy_dir, "targets")
                resources_dir = os.path.join(apiproxy_dir, "resources")
                jsc_dir = os.path.join(resources_dir, "jsc")
                
                os.makedirs(policies_dir, exist_ok=True)
                os.makedirs(proxies_dir, exist_ok=True)
                os.makedirs(targets_dir, exist_ok=True)
                os.makedirs(jsc_dir, exist_ok=True)
                
                # Generate main proxy XML
                proxy_xml = self._generate_proxy_xml(name, description, policies)
                with open(os.path.join(apiproxy_dir, f"{name}.xml"), 'w', encoding='utf-8') as f:
                    f.write(proxy_xml)
                
                # Generate policy XMLs
                for policy in policies:
                    policy_xml = self._generate_policy_xml(policy, custom_logic)
                    with open(os.path.join(policies_dir, f"{policy}.xml"), 'w', encoding='utf-8') as f:
                        f.write(policy_xml)
                
                # Generate JavaScript resources if needed
                if "JavaScript" in policies:
                    js_content = self._create_javascript_resource(custom_logic)
                    with open(os.path.join(jsc_dir, "javascript-script.js"), 'w', encoding='utf-8') as f:
                        f.write(js_content)
                
                # Generate proxy endpoint
                proxy_endpoint_xml = self._generate_proxy_endpoint_xml(name, base_path, policies)
                with open(os.path.join(proxies_dir, "default.xml"), 'w', encoding='utf-8') as f:
                    f.write(proxy_endpoint_xml)
                
                # Generate target endpoint
                target_endpoint_xml = self._generate_target_endpoint_xml(target_url)
                with open(os.path.join(targets_dir, "default.xml"), 'w', encoding='utf-8') as f:
                    f.write(target_endpoint_xml)
                
                # Create ZIP bundle
                bundle_path = os.path.join(temp_dir, f"{name}-bundle.zip")
                with zipfile.ZipFile(bundle_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(apiproxy_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arc_path = os.path.relpath(file_path, temp_dir)
                            zipf.write(file_path, arc_path)
                
                # Read bundle as bytes
                with open(bundle_path, 'rb') as f:
                    bundle_content = f.read()
                
                logger.info(f"Created proxy bundle: {name} ({len(bundle_content)} bytes)")
                return bundle_content
                
        except Exception as e:
            logger.error(f"Error creating proxy bundle: {str(e)}")
            raise e
    
    async def execute_proxy_creation(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute proxy creation in Apigee"""
        try:
            name = details["name"]
            organization = details.get("organization", self.org)
            token = details.get("token")
            
            # Temporarily set token if provided
            original_token = None
            if token:
                original_token = os.getenv('APIGEE_TOKEN')
                os.environ['APIGEE_TOKEN'] = token
            
            try:
                # Create proxy bundle
                bundle_content = self.create_proxy_bundle(details)
                
                # Upload to Apigee
                url = f"{self.base_url}/organizations/{organization}/apis"
                files = {
                    'file': (f'{name}-bundle.zip', bundle_content, 'application/zip')
                }
                params = {'action': 'import', 'name': name}
                
                # Make request with query parameters
                full_url = f"{url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
                result = self._make_request('POST', full_url, files=files)
                
                logger.info(f"✅ Proxy '{name}' created successfully")
                
                return {
                    "success": True,
                    "message": f"✅ Proxy '{name}' created successfully in Apigee",
                    "proxy_name": name,
                    "organization": organization,
                    "revision": result.get("revision", "1"),
                    "test_url": f"https://{organization}-{self.environment}.apigee.net{details['base_path']}"
                }
                
            finally:
                # Restore original token
                if token and original_token is not None:
                    os.environ['APIGEE_TOKEN'] = original_token
                
        except Exception as e:
            error_msg = f"Failed to create proxy in Apigee: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg,
                "error": str(e)
            }
    
    def analyze_requirements(self, requirements: str, documentation: str = None) -> str:
        """Analyze requirements and suggest implementation approach"""
        # Extract key features
        features = []
        
        if "security" in requirements.lower() or "api key" in requirements.lower():
            features.append("• API Key verification for security")
        
        if "rate" in requirements.lower() or "limit" in requirements.lower() or "quota" in requirements.lower():
            features.append("• Rate limiting to prevent abuse")
            
        if "cors" in requirements.lower() or "cross" in requirements.lower():
            features.append("• CORS support for browser clients")
            
        if "javascript" in requirements.lower() or "custom logic" in requirements.lower():
            features.append("• Custom JavaScript processing")
            
        if "cache" in requirements.lower():
            features.append("• Response caching for performance")
            
        # Construct analysis response
        response = f"## Requirements Analysis:\n\n"
        
        if features:
            response += "**Identified Requirements:**\n" + "\n".join(features) + "\n\n"
        else:
            response += "**Basic proxy with target endpoint.**\n\n"
            
        response += "**Suggested Implementation:**\n"
        response += "1. Create API proxy with proper naming\n"
        response += "2. Configure target endpoint\n"
        
        if features:
            response += "3. Apply identified policies\n"
            response += "4. Test thoroughly with sample requests\n"
            
        if documentation:
            response += f"\n**Documentation:**\n{documentation}"
            
        return response
    
    def create_api_proxy(self, requirements: str) -> str:
        """Create API proxy based on requirements (mock for agent use)"""
        # This is just a placeholder for the agent to use
        # Actual implementation happens in execute_proxy_creation
        
        config = self.generate_proxy_config(requirements)
        
        return f"""
✅ **API Proxy Ready for Creation**

{config}

To proceed with creation, please confirm by responding with:
"Yes, create this proxy" or provide your Apigee credentials if needed.
"""
    
    def generate_proxy_config(self, requirements: str) -> str:
        """Generate proxy configuration XML based on requirements"""
        # Extract basic info from requirements
        import re
        
        name = "sample-proxy"
        target_url = "https://api.example.com"
        base_path = "/v1/sample"
        policies = []
        
        # Try to extract information from requirements
        if requirements:
            name_match = re.search(r'named\s+([a-zA-Z0-9\-_]+)', requirements.lower())
            if name_match:
                name = name_match.group(1)
            
            url_match = re.search(r'pointing to\s+(https?://[^\s]+)', requirements.lower())
            if url_match:
                target_url = url_match.group(1)
            
            path_match = re.search(r'base path\s+([a-zA-Z0-9\-_/]+)', requirements.lower())
            if path_match:
                base_path = f"/{path_match.group(1).strip('/')}"
            
            # Add policy detection
            if "javascript" in requirements.lower():
                policies.append("JavaScript")
            
            if "assign message" in requirements.lower() or "assignmessage" in requirements.lower():
                policies.append("AssignMessage")
            
            if "security" in requirements.lower() or "apikey" in requirements.lower():
                policies.append("VerifyAPIKey")
            
            if "cors" in requirements.lower():
                policies.append("CORS")
    
        # Generate basic proxy XML
        proxy_xml = self._generate_proxy_xml(name, f"Auto-generated proxy for {name}", policies)
        endpoint_xml = self._generate_proxy_endpoint_xml(name, base_path, policies)
        target_xml = self._generate_target_endpoint_xml(target_url)
        
        # Format response
        response = f"""
## Generated Proxy Configuration

### Main Proxy XML:
```xml
{proxy_xml}
```

### Proxy Endpoint XML:
```xml
{endpoint_xml}
```

### Target Endpoint XML:
```xml
{target_xml}
```

**Policies Configured**: {', '.join(policies) if policies else 'None'}
"""
    
        return response.strip()
    
    def _extract_proxy_name_from_requirements(self, requirements: str) -> str:
        """Extract proxy name from requirements text"""
        # Look for patterns like "named xyz", "called xyz", "proxy xyz"
        name_patterns = [
            r'named\s+([a-zA-Z0-9\-_]+)',       # "named portal-test-js-bot"
            r'called\s+([a-zA-Z0-9\-_]+)',      # "called portal-test-js-bot"
            r'proxy\s+named\s+([a-zA-Z0-9\-_]+)',  # "proxy named portal-test-js-bot"
            r'create.*?proxy\s+([a-zA-Z0-9\-_]+)',  # "create ... proxy portal-test-js-bot"
            r'API\s+proxy\s+([a-zA-Z0-9\-_]+)'   # "API proxy portal-test-js-bot"
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, requirements, re.IGNORECASE)
            if matches:
                return matches[0].replace(' ', '-')
        
        return "generated-proxy"
    
    def _extract_target_url_from_requirements(self, requirements: str) -> str:
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
    
    def _extract_base_path_from_requirements(self, requirements: str, proxy_name: str) -> str:
        """Extract base path from requirements"""
        # Look for base path patterns - improved logic
        base_path_patterns = [
            r'base path\s+([a-zA-Z0-9\-_/]+)',  # "base path portal-test-js-bot"
            r'path\s+([a-zA-Z0-9\-_/]+)',       # "path portal-test-js-bot"
        ]
        
        for pattern in base_path_patterns:
            matches = re.findall(pattern, requirements, re.IGNORECASE)
            if matches:
                path = matches[0]
                # Ensure it starts with /
                if not path.startswith('/'):
                    path = f"/{path}"
                return path
        
        # If no explicit base path found, use proxy name
        if not proxy_name.startswith('/'):
            return f"/{proxy_name}"
        return proxy_name
