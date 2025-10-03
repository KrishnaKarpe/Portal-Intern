import requests
import logging
import json
import zipfile
import io
from typing import List, Dict, Any
from common.tools import PolicyTools
import config  # Make sure this import is correct

logger = logging.getLogger(__name__)

class ApigeeService:
    """Handles Apigee-specific operations"""
    
    def analyze_requirements(self, requirements: str, doc_context: str = "") -> str:
        """Analyze requirements and suggest configuration"""
        target_url = PolicyTools.extract_target_url(requirements)
        base_path = PolicyTools.extract_base_path(requirements)
        policies = PolicyTools.suggest_policies(requirements)
        
        return f"""
🔍 **Requirement Analysis:**

**Recommended Configuration:**
- Target Endpoint: `{target_url}`
- Base Path: `{base_path}`  
- Policies: {', '.join(policies) if policies else 'None (basic proxy only)'}

**Policy Details:**
{PolicyTools.explain_policies(policies) if policies else 'No additional policies - creating basic passthrough proxy'}

**Documentation Context:**
{doc_context}

💡 **Next Steps:**
1. Review configuration
2. Modify as needed
3. Use Agent mode to create proxy
"""
    
    def generate_proxy_config(self, requirements: str) -> str:
        """Generate complete proxy XML configuration"""
        target_url = PolicyTools.extract_target_url(requirements)
        base_path = PolicyTools.extract_base_path(requirements)
        policies = PolicyTools.suggest_policies(requirements)
        
        # Extract proxy name from requirements or base path
        proxy_name = PolicyTools.extract_proxy_name(requirements)
        
        return f"""
🔧 **Complete Proxy Configuration:**

**Proxy Name:** `{proxy_name}`

**Proxy Endpoint:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ProxyEndpoint name="default">
    <Description>Generated proxy for {requirements[:50]}...</Description>
    <HTTPProxyConnection>
        <BasePath>{base_path}</BasePath>
        <VirtualHost>default</VirtualHost>
        <VirtualHost>secure</VirtualHost>
    </HTTPProxyConnection>
    <Flows>
        <Flow name="MainFlow">
            <Request>
{PolicyTools.generate_policy_steps(policies) if policies else '                <!-- No policies requested -->'}
            </Request>
            <Response>
                <!-- Response flow policies if needed -->
            </Response>
        </Flow>
    </Flows>
    <RouteRule name="default">
        <TargetEndpoint>default</TargetEndpoint>
    </RouteRule>
</ProxyEndpoint>
```

**Target Endpoint:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<TargetEndpoint name="default">
    <Description>Target for {target_url}</Description>
    <HTTPTargetConnection>
        <URL>{target_url}</URL>
    </HTTPTargetConnection>
</TargetEndpoint>
```

**Policy Files:**
{PolicyTools.generate_policy_xml(policies) if policies else '<!-- No additional policies requested -->'}
"""
    
    def create_api_proxy(self, config_text: str) -> str:
        """Prepare proxy creation (requires confirmation)"""
        return f"""
🤖 **REAL Apigee Proxy Creation Ready**

Configuration generated:
{config_text[:400]}...

**Actions I'll perform in your Apigee organization:**
1. ✅ Create proxy bundle with XML configurations
2. ✅ Apply ONLY the policies you requested (no extras)
3. ✅ Deploy to {config.APIGEE_ENVIRONMENT} environment
4. ✅ Verify deployment and provide test endpoint

⚠️ **REAL APIGEE CONFIRMATION REQUIRED**
This will create an ACTUAL proxy in your Apigee organization.

To proceed with REAL proxy creation, please confirm by saying: **"Yes, create the proxy"**

**Organization:** {config.APIGEE_ORG or 'Not configured'}
**Environment:** {config.APIGEE_ENVIRONMENT}
"""
    
    async def execute_proxy_creation(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute REAL proxy creation in Apigee"""
        
        if config.DEVELOPMENT_MODE:
            return await self._mock_proxy_creation(details)
        
        # REAL APIGEE CREATION
        logger.info("🚀 REAL APIGEE: Creating actual proxy")
        
        proxy_name = details.get("name", "ai-generated-proxy")
        target_url = details.get("target_url")
        base_path = details.get("base_path", "/v1/api")
        policies = details.get("policies", [])
        
        # Use org and token from config or details
        organization = details.get("organization") or config.APIGEE_ORG
        token = details.get("token") or config.APIGEE_TOKEN
        environment = details.get("environment") or config.APIGEE_ENVIRONMENT
        
        if not organization or not token:
            raise Exception("Apigee organization and token required. Set APIGEE_ORG and APIGEE_TOKEN in .env file")
        
        try:
            # Step 1: Create proxy bundle
            proxy_bundle = self._create_proxy_bundle(proxy_name, target_url, base_path, policies)
            
            # Step 2: Import to Apigee
            result = await self._import_proxy_to_apigee(organization, token, proxy_name, proxy_bundle)
            
            # Step 3: Deploy to environment
            deployment = await self._deploy_proxy(organization, token, proxy_name, environment)
            
            return {
                "status": "success",
                "mode": "real_apigee",
                "proxy_details": {
                    "name": proxy_name,
                    "target_url": target_url,
                    "base_path": base_path,
                    "policies_applied": policies,
                    "organization": organization,
                    "environment": environment,
                    "created_at": result.get("createdAt"),
                    "revision": result.get("revision"),
                    "deployment_status": deployment.get("state")
                },
                "message": f"✅ REAL proxy '{proxy_name}' created and deployed in Apigee!",
                "test_endpoint": f"https://{organization}-{environment}.apigee.net{base_path}",
                "next_steps": [
                    f"Proxy available at: https://{organization}-{environment}.apigee.net{base_path}",
                    "Test the endpoint with your API client",
                    "Monitor usage in Apigee console",
                    "Apply additional configurations as needed"
                ]
            }
            
        except Exception as e:
            logger.error(f"Real Apigee proxy creation failed: {e}")
            raise Exception(f"Failed to create proxy in Apigee: {str(e)}")
    
    def _create_proxy_bundle(self, name: str, target_url: str, base_path: str, policies: List[str]) -> bytes:
        """Create Apigee proxy bundle ZIP file"""
        
        # Proxy Endpoint XML
        proxy_endpoint = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
    <Description>AI Generated Proxy</Description>
    <HTTPProxyConnection>
        <BasePath>{base_path}</BasePath>
        <VirtualHost>default</VirtualHost>
        <VirtualHost>secure</VirtualHost>
    </HTTPProxyConnection>
    <Flows>
        <Flow name="MainFlow">
            <Request>
{PolicyTools.generate_policy_steps(policies) if policies else ''}
            </Request>
        </Flow>
    </Flows>
    <RouteRule name="default">
        <TargetEndpoint>default</TargetEndpoint>
    </RouteRule>
</ProxyEndpoint>'''

        # Target Endpoint XML
        target_endpoint = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
    <Description>Target for {target_url}</Description>
    <HTTPTargetConnection>
        <URL>{target_url}</URL>
    </HTTPTargetConnection>
</TargetEndpoint>'''

        # Main Proxy XML
        main_proxy = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<APIProxy revision="1" name="{name}">
    <Description>AI Generated Proxy</Description>
    <DisplayName>{name}</DisplayName>
    <Policies>
{self._generate_policy_references(policies)}
    </Policies>
    <ProxyEndpoints>
        <ProxyEndpoint>default</ProxyEndpoint>
    </ProxyEndpoints>
    <TargetEndpoints>
        <TargetEndpoint>default</TargetEndpoint>
    </TargetEndpoints>
</APIProxy>'''

        # Create ZIP bundle
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add main proxy file
            zip_file.writestr(f"apiproxy/{name}.xml", main_proxy)
            
            # Add proxy endpoint
            zip_file.writestr("apiproxy/proxies/default.xml", proxy_endpoint)
            
            # Add target endpoint
            zip_file.writestr("apiproxy/targets/default.xml", target_endpoint)
            
            # Add policy files
            for policy in policies:
                policy_xml = self._get_policy_xml(policy)
                zip_file.writestr(f"apiproxy/policies/{policy}.xml", policy_xml)
        
        zip_buffer.seek(0)
        return zip_buffer.read()
    
    def _generate_policy_references(self, policies: List[str]) -> str:
        """Generate policy references for main proxy XML"""
        refs = ""
        for policy in policies:
            refs += f"        <Policy>{policy}</Policy>\n"
        return refs.rstrip()
    
    def _get_policy_xml(self, policy_name: str) -> str:
        """Get actual policy XML content"""
        policy_templates = {
            "VerifyAPIKey": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyAPIKey async="false" continueOnError="false" enabled="true" name="VerifyAPIKey">
    <DisplayName>Verify API Key</DisplayName>
    <APIKey ref="request.queryparam.apikey"/>
</VerifyAPIKey>''',
            
            "CORS": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<CORS async="false" continueOnError="false" enabled="true" name="CORS">
    <DisplayName>CORS Policy</DisplayName>
    <AllowOrigins>*</AllowOrigins>
    <AllowMethods>GET,POST,PUT,DELETE,OPTIONS</AllowMethods>
    <AllowHeaders>Content-Type,Authorization</AllowHeaders>
    <MaxAge>3628800</MaxAge>
</CORS>''',
            
            "Quota": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota async="false" continueOnError="false" enabled="true" name="Quota">
    <DisplayName>Quota Policy</DisplayName>
    <Allow count="100"/>
    <Interval>1</Interval>
    <TimeUnit>minute</TimeUnit>
    <Identifier ref="request.queryparam.apikey"/>
</Quota>''',
            
            "SpikeArrest": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest async="false" continueOnError="false" enabled="true" name="SpikeArrest">
    <DisplayName>Spike Arrest</DisplayName>
    <Rate>10ps</Rate>
</SpikeArrest>'''
        }
        
        return policy_templates.get(policy_name, f'<!-- Policy {policy_name} not found -->')
    
    async def _import_proxy_to_apigee(self, org: str, token: str, name: str, bundle: bytes) -> Dict[str, Any]:
        """Import proxy bundle to Apigee"""
        
        url = f"{config.APIGEE_BASE_URL}/organizations/{org}/apis?action=import&name={name}"
        
        headers = {
            "Authorization": f"Bearer {token}",
        }
        
        files = {
            'file': ('proxy.zip', bundle, 'application/zip')
        }
        
        response = requests.post(url, headers=headers, files=files, timeout=60)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ Proxy {name} imported successfully")
            return response.json()
        else:
            raise Exception(f"Import failed: {response.status_code} - {response.text}")
    
    async def _deploy_proxy(self, org: str, token: str, name: str, environment: str) -> Dict[str, Any]:
        """Deploy proxy to environment"""
        
        # Get latest revision first
        revisions_url = f"{config.APIGEE_BASE_URL}/organizations/{org}/apis/{name}/revisions"
        headers = {"Authorization": f"Bearer {token}"}
        
        revisions_response = requests.get(revisions_url, headers=headers)
        if revisions_response.status_code != 200:
            raise Exception(f"Failed to get revisions: {revisions_response.text}")
        
        revisions = revisions_response.json()
        latest_revision = max(revisions) if revisions else "1"
        
        # Deploy the proxy
        deploy_url = f"{config.APIGEE_BASE_URL}/organizations/{org}/environments/{environment}/apis/{name}/revisions/{latest_revision}/deployments"
        
        response = requests.post(deploy_url, headers=headers, timeout=60)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ Proxy {name} deployed to {environment}")
            return response.json()
        else:
            raise Exception(f"Deployment failed: {response.status_code} - {response.text}")
    
    async def _mock_proxy_creation(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Mock creation for development"""
        logger.info("🧪 DEVELOPMENT MODE: Simulating proxy creation")
        
        import asyncio
        await asyncio.sleep(2)
        
        return {
            "status": "success",
            "mode": "development_mock",
            "message": "✅ Mock proxy created (DEVELOPMENT_MODE = True)",
            "note": "Set DEVELOPMENT_MODE = False in config.py for real creation"
        }