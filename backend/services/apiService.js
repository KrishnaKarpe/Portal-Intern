/**
 * API Service - Handles external API communication
 * Responsible for making requests to the Apigee API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * Fetch a single product from an organization using Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} productName - Product name to fetch
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Product data
 */
const fetchProductFromOrg = async (orgId, productName, token) => {
  console.log(`Fetching product ${productName} from organization ${orgId}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts/${productName}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // Add timeout to prevent hanging requests
    });

    console.log(`Successfully fetched product data for ${productName}`);

    // Log what we received to debug
    const productData = response.data;
    console.log(`Product ${productName} details:`, {
      hasDescription: !!productData.description,
      descriptionLength: productData.description?.length || 0,
      hasEnvironments: !!productData.environments,
      environmentsCount: productData.environments?.length || 0,
      environments: productData.environments
    });

    return productData;
  } catch (error) {
    console.error(`Error fetching product ${productName}:`, error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;

    throw enhancedError;
  }
};

/**
 * Fetch all products from an organization using Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Products data
 */
const fetchAllProductsFromOrg = async (orgId, token) => {
  console.log(`Fetching all products from organization ${orgId}`);
  console.log(`Using token: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Successfully fetched products list:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error.message);
    console.error('Status code:', error.response?.status);
    console.error('Response data:', error.response?.data);

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;

    throw enhancedError;
  }
};

/**
 * Modify product data for cloning
 * @param {Object} productData - Original product data
 * @param {Object} newData - New product data
 * @returns {Object} - Modified product data
 */
const modifyProductForClone = (productData, newData) => {
  console.log('Original product data:', productData);
  console.log('New data to be applied:', newData);

  const modifiedData = {
    ...productData,
    name: newData.newProductName,
    displayName: newData.newDisplayName,
    description: newData.description,
    environments: Array.isArray(newData.environments)
      ? newData.environments
      : [newData.environments]
  };

  // Remove metadata fields that shouldn't be copied
  delete modifiedData.createdAt;
  delete modifiedData.createdBy;
  delete modifiedData.lastModifiedAt;
  delete modifiedData.lastModifiedBy;

  console.log('Modified product data:', modifiedData);
  return modifiedData;
};

/**
 * Create a product in an organization using Apigee API
 * @param {string} orgId - Organization ID
 * @param {Object} productData - Product data to create
 * @param {string} token - Authentication token
 * @param {string} newProductName - New product name (optional, for logging)
 * @returns {Promise<Object>} - Created product data
 */
const createProductInOrg = async (orgId, productData, token, newProductName = null) => {
  console.log(`Creating product ${newProductName || productData.name || 'unnamed'} in organization ${orgId}`);
  console.log('Product data to be created:', productData);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: productData
    });

    console.log('Successfully created product:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error.message);
    console.error('Status code:', error.response?.status);
    console.error('Response data:', error.response?.data);

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;

    throw enhancedError;
  }
};

//-----Proxies------

/**
 * Fetch a single proxy from an organization using Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} proxyName - Proxy name to fetch
 * @param {string} token - Authentication token
 * @param {string} revision - Proxy revision number
 * @returns {Promise<Object>} - Proxy bundle data
 */
const fetchProxyFromOrg = async (orgId, proxyName, token, revision) => {
  console.log(`Fetching proxy ${proxyName} revision ${revision} from organization ${orgId}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis/${proxyName}/revisions/${revision}?format=bundle`,
      headers: {
        'Authorization': `Bearer ${token}`,
        
      },
      responseType: 'arraybuffer', // Use arraybuffer to handle binary data
      timeout: 30000 // Longer timeout for proxy bundles
    });
    
    
    console.log(`Successfully fetched proxy bundle for ${proxyName}`);

    return response.data;

  } catch (error) {
    console.error(`Error fetching proxy ${proxyName}:`, error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;

    throw enhancedError;
  }
};

/**
 * Fetch all revisions of a proxy from an organization using Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} proxyName - Proxy name to fetch revisions for
 * @param {string} token - Authentication token
 * @returns {Promise<number>} - Latest (maximum) revision number
 */
const fetchLatestRevision = async (orgId, proxyName, token) => {
  console.log(`Fetching revisions of ${proxyName} from organization ${orgId}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis/${proxyName}/revisions`,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 30000,
    });

    const revisions = response.data; //["1", "2", "3", ...]
    console.log(`✅ Revisions fetched: ${revisions}`);

    //latest (max) revision number
    const latestRevision = Math.max(...revisions.map(Number));

    console.log(`📦 Latest revision for ${proxyName}: ${latestRevision}`);

    return latestRevision;

  } catch (error) {
    console.error(`❌ Error fetching revisions for ${proxyName}:`, error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;

    throw enhancedError;
  }
};


/**
 * Send/Import a proxy to target organization using Apigee API
 * @param {string} orgId - Target organization ID
 * @param {string} proxyName - New proxy name
 * @param {string} token - Authentication token
 * @param {Object} proxyBundle - Proxy bundle data
 * @returns {Promise<Object>} - Created proxy data
 */
const SendProxyToOrg = async (orgId, proxyName, token, proxyBundle) => {
  console.log(`Importing proxy ${proxyName} to organization ${orgId}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    //create the proxy
    const createResponse = await axios({
      method: 'POST',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis?action=import&name=${proxyName}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      data: proxyBundle,
      timeout: 30000 // Longer timeout for proxy import
    });

    console.log(`Successfully imported proxy ${proxyName} to ${orgId}`);
    return createResponse.data;
  } catch (error) {
    console.error(`Error importing proxy ${proxyName}:`, error.message);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;
    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;
    throw enhancedError;
  }
};


//------proxy to gitlab ------
/**
 * Fetch GitLab project ID using project name
 * @param {string} proxyName - Project name (same as proxy name)
 * @param {string} token - GitLab access token
 * @returns {Promise<number>} - Project ID
 */
const getGitlabProjectId = async (proxyName, token) => {
  const response = await axios.get('https://gitlab.com/api/v4/projects', {
    headers: { 'PRIVATE-TOKEN': token },
    params: { search: proxyName }
  });

  const project = response.data.find(p => p.name === proxyName);
  if (!project) throw new Error(`Project ${proxyName} not found in GitLab`);
  return project.id;
};


/**
 * Create a new project in GitLab if it doesn’t exist
 * @param {string} proxyName - Project name (same as proxy name)
 * @param {string} token - GitLab access token
 * @returns {Promise<number>} - Newly created project ID
 */
const createGitlabProjectforProxy = async (proxyName, token) => {
  try {
    console.log(`Creating new GitLab project: ${proxyName}`);
    const response = await axios.post(
      'https://gitlab.com/api/v4/projects',
      {
        name: proxyName,
        namespace_id:  123,    //STATIC VALUE
        group_with_project_templates_id : 123,     //STATIC VALUE
        use_custom_template: true,
        template_project_id :  123      //Static Value
      },
      {
        headers: { 
          'PRIVATE-TOKEN': token ,
          'Content-Type': 'application/json'
        },
      }
    );
    console.log(`✅ Created project ${proxyName} with ID ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('❌ Failed to create GitLab project:', error.response?.data || error.message);
    throw error;
  }
};




/**
 * Upload project to GitLab
 * @param {string} proxyName - Proxy name / GitLab project name
 * @param {string} token - GitLab access token
 * @param {Buffer} proxyBundle - Proxy bundle binary (zip)
 * @param {Array} environments - Environments to set up in the new project (if created)
 * @returns {Promise<Object>} - Upload response { success, projectId, username, gitlabProjectUrl }
 */
const sendProxyToGitlab = async (proxyName, token, proxyBundle, environments = []) => {
  try {
    console.log(`🔍 Checking for GitLab project: ${proxyName}`);

    // Get username
    let usernameToUse;
    try {
      usernameToUse = await getGitUser(token);
    } catch (err) {
      console.warn('Could not fetch GitLab user, proceeding with "unknown"');
      usernameToUse = 'unknown';
    }

    // Step 1: Get or create project
    let projectId;
    let isNewProject = false;

    try {
      projectId = await getGitlabProjectId(proxyName, token);
      console.log(`✅ Found GitLab project ${proxyName} (ID: ${projectId})`);
    } catch {
      console.log(`🚀 Creating new GitLab project: ${proxyName}`);
      projectId = await createGitlabProjectforProxy(proxyName, token);
      isNewProject = true;
      console.log(`✅ New project created (ID: ${projectId}) — base branch 'prod-public' will be auto-created`);
    }

    if (isNewProject) {
      await waitForRepoReady(projectId, token);
      console.log('⏳ Repository initialization confirmed — proceeding to create branches...');
    }

    const baseBranch = "prod-public";
    const uploadBranch = "dev" ;

    // Step 2: Ensure branches exist
    try {    //check if selected branch exists
      await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(uploadBranch)}`,
        { headers: { 'PRIVATE-TOKEN': token } }
      );

      console.log(`✅ Branch '${uploadBranch}' exists`);
    } catch {    //if not exist create from prod
      console.log(`⚠️ Branch '${uploadBranch}' missing — creating from '${baseBranch}'`);
      
      await axios.post(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
        { branch: uploadBranch, ref: baseBranch },
        { headers: { 'PRIVATE-TOKEN': token } }
        
      );
      console.log(`⚠️ Branch '${uploadBranch}' created from '${baseBranch}'`);
    }

    // Step 3: check for envs
    for (const env of environments) {
      if (env === uploadBranch) continue;
      try {
        await axios.get(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(env)}`,
          { headers: { 'PRIVATE-TOKEN': token } }
        );
        console.log(`✅ Branch '${env}' exists`);
      } catch {
        console.log(`⚠️ Creating missing branch '${env}' from '${baseBranch}'`);
        await axios.post(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
          { branch: env, ref: baseBranch },
          { headers: { 'PRIVATE-TOKEN': token } }
        );
      }
    }
     // Step 4: Upload files
    // Fetch project info
    let gitlabProjectUrl;
    try {
      const projResp = await axios.get(`https://gitlab.com/api/v4/projects/${projectId}`, {
        headers: { 'PRIVATE-TOKEN': token }
      });
      gitlabProjectUrl = projResp.data.web_url;
    } catch (err) {
      console.warn('Could not fetch project info to get web_url:', err.message || err);
    }

    // Unzip bundle in memory
    const zip = new AdmZip(proxyBundle);
    const entries = zip.getEntries();
    console.log(`📦 Preparing to upload ${entries.length} files...`);

    const actions=[];
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const repoPath = entry.entryName.replace(/\\/g, '/');
      //const fileUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(repoPath)}`;
      //const content = entry.getData().toString('base64');
      const rawData = entry.getData();

      actions.push({
        action: 'create', 
        file_path: repoPath,
        content: rawData.toString("base64"),
        encoding: "base64" 
      });
    }

    const commitUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`;

    const commitResp = await axios.post(
      commitUrl,
      {
        branch: uploadBranch,
        commit_message: `Upload all proxgit statusy files for ${proxyName} by ${usernameToUse}`,
        actions,
      },
      { headers: { 'PRIVATE-TOKEN': token } }
    );

    console.log(`✅ Single commit created: ${commitResp.data.id}`);
    return { success: true, projectId, username: usernameToUse, gitlabProjectUrl, commitId: commitResp.data.id };


      

    
  } catch (error) {
    console.error('❌ Error uploading proxy:', error.response?.data || error.message);
    throw error;
  }
};


async function waitForRepoReady(projectId, token) {
  const maxAttempts = 10; // retry up to 10 times
  const delay = ms => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
        { headers: { 'PRIVATE-TOKEN': token } }
      );
      if (Array.isArray(resp.data)) {
        console.log(`✅ Repo ready after ${i + 1} attempt(s).`);
        return;
      }
    } catch {
      console.log(`⏳ Waiting for GitLab repo to initialize... (${i + 1}/${maxAttempts})`);
    }
    await delay(3000); // wait 3 seconds between tries
  }

  throw new Error('❌ Repository did not become ready in time.');
}

//get user from git
const getGitUser = async (token) => {
  try {
    console.log(`Looking for git user`);
    const response = await axios.get('https://gitlab.com/api/v4/user', {
      headers: { 'PRIVATE-TOKEN': token },
    });
    console.log(`Found git user: ${response.data.username}`);
    return response.data.username;
  } catch (error) {
    console.error('Error fetching git user:', error.response?.data || error.message);
    throw error;
  } 
}; 


/**
 * Fetch deployments for a proxy from Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} proxyName - Proxy name
 * @param {string} token - Authentication token
 * @returns {Promise<Array<{environment: string, status: 'Deployed' | 'Not Deployed'}>>}
 */
const fetchProxyDeployments = async (orgId, proxyName, token) => {
  console.log(`Fetching deployments for proxy ${proxyName} in org ${orgId}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis/${proxyName}/deployments`,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 20000,
    });

    const data = response.data;
    console.log('Apigee deployments raw response:', JSON.stringify(data, null, 2));

    // Apigee response shape:
    // {
    //   deployments: [
    //     {
    //       environment: 'apim-dev',
    //       revisions: [ { name: '8', state: 'deployed' | 'undeployed' | 'IN_PROGRESS', ... } ]
    //     }
    //   ]
    // }

    const deployments = [];
    if (data && Array.isArray(data.deployments)) {
      for (const item of data.deployments) {
        const environment = item.environment || 'unknown';
        // In your tenant, Apigee returns a flat list with 'revision' per environment (no state field)
        // Treat presence of an entry with a revision as Deployed
        const isDeployed = !!item.revision;
        const status = isDeployed ? 'Deployed' : 'Not Deployed';
        const revision = item.revision || null;
        deployments.push({ environment, status, revision });
      }
    }

    return deployments;
  } catch (error) {
    console.error(`Error fetching deployments for ${proxyName}:`, error.message);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;
    const enhancedError = new Error(errorMessage);
    enhancedError.status = statusCode;
    enhancedError.details = error.response?.data;
    throw enhancedError;
  }
};


/** Fetch all proxies from an organization using Apigee API
 * @param {string} sourceOrg - Source organization ID
 * @returns {Promise<Array>} - List of proxy names
 */
const fetchAllProxies = async (sourceOrg,token) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${sourceOrg}/apis`;

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  //res.data is typically an array of proxy names
  return res.data;
};


//------product to gitlab ------

/**
 * Create a new project in GitLab if it doesn’t exist
 * @param {string} productName - Project name (same as proxy name)
 * @param {string} token - GitLab access token
 * @returns {Promise<number>} - Newly created project ID
 */
const createGitlabProjectforProduct = async (productName, token) => {
  try {
    console.log(`Creating new GitLab project: ${productName}`);
    const response = await axios.post(
      'https://gitlab.com/api/v4/projects',
      {
        name: productName,
        namespace_id: 123 ,    //STATIC VALUE
        group_with_project_templates_id : 123,     //STATIC VALUE
        use_custom_template: true,
        template_project_id : 123       //Static Value
      },
      {
        headers: { 
          'PRIVATE-TOKEN': token ,
          'Content-Type': 'application/json'
        },
      }
    );
    console.log(`✅ Created project ${productName} with ID ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('❌ Failed to create GitLab project:', error.response?.data || error.message);
    throw error;
  }
};


const pushProductToGitlab = async (productName, token, productData, environments = [] ) => {
  try {
    console.log(`🔍 Checking for GitLab project: ${productName}`);
    
    // Get username
    let usernameToUse;
    try {
      usernameToUse = await getGitUser(token);
    } catch (err) {
      console.warn('Could not fetch GitLab user, proceeding with "unknown"');
      usernameToUse = 'unknown';
    }

    // Step 1: Get or create project
    let projectId;
    let isNewProject = false;

    try {
      projectId = await getGitlabProjectId(productName, token);
      console.log(`✅ Found GitLab project ${productName} (ID: ${projectId})`);
    } catch {
      console.log(`🚀 Creating new GitLab project: ${productName}`);
      projectId = await createGitlabProjectforProduct(productName, token);
      isNewProject = true;
      console.log(`✅ New project created (ID: ${projectId}) — base branch 'prod-public' will be auto-created`);
    }

    if (isNewProject) {
      await waitForRepoReady(projectId, token);
      console.log('⏳ Repository initialization confirmed — proceeding to create branches...');
    }

    const baseBranch = "prod-public";
    const uploadBranch = "dev" ;

    // Step 2: Ensure branches exist
    //check if selected branch exists
    try {    
      await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(uploadBranch)}`,
        { headers: { 'PRIVATE-TOKEN': token } }
      );

      console.log(`✅ Branch '${uploadBranch}' exists`);
    } catch {    //if not exist create from prod
      console.log(`⚠️ Branch '${uploadBranch}' missing — creating from '${baseBranch}'`);
      
      await axios.post(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
        { branch: uploadBranch, ref: baseBranch },
        { headers: { 'PRIVATE-TOKEN': token } }
        
      );
      console.log(`⚠️ Branch '${uploadBranch}' created from '${baseBranch}'`);
    }

    // Step 3: check for envs
    for (const env of environments) {
      if (env === uploadBranch) continue;
      try {
        await axios.get(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(env)}`,
          { headers: { 'PRIVATE-TOKEN': token } }
        );
        console.log(`✅ Branch '${env}' exists`);
      } catch {
        console.log(`⚠️ Creating missing branch '${env}' from '${baseBranch}'`);
        await axios.post(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
          { branch: env, ref: baseBranch },
          { headers: { 'PRIVATE-TOKEN': token } }
        );
      }
    }
    // Step 4: Upload files
    // Fetch project info
    let gitlabProjectUrl;
    try {
      const projResp = await axios.get(`https://gitlab.com/api/v4/projects/${projectId}`, {
        headers: { 'PRIVATE-TOKEN': token }
      });
      gitlabProjectUrl = projResp.data.web_url;
    } catch (err) {
      console.warn('Could not fetch project info to get web_url:', err.message || err);
    }

    // Unzip bundle in memory
    const zip = new AdmZip(productData);
    const entries = zip.getEntries();
    console.log(`📦 Preparing to upload ${entries.length} files...`);

    const actions=[];
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const repoPath = entry.entryName.replace(/\\/g, '/');
      //const fileUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(repoPath)}`;
      //const content = entry.getData().toString('base64');
      const rawData = entry.getData();

      actions.push({
        action: 'create', 
        file_path: repoPath,
        content: rawData.toString("base64"),
        encoding: "base64" 
      });
    }

    const commitUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`;

    const commitResp = await axios.post(
      commitUrl,
      {
        branch: uploadBranch,
        commit_message: `Upload all proxgit statusy files for ${productName} by ${usernameToUse}`,
        actions,
      },
      { headers: { 'PRIVATE-TOKEN': token } }
    );

    console.log(`✅ Single commit created: ${commitResp.data.id}`);
    return { success: true, projectId, username: usernameToUse, gitlabProjectUrl, commitId: commitResp.data.id };
  } catch (error) {
    console.error('❌ Error uploading proxy:', error.response?.data || error.message);
    throw error;
  }
}    








// Export functions with clear naming (placed after all definitions)
module.exports = {
  fetchProductFromOrg,
  fetchAllProductsFromOrg,
  modifyProductForClone,
  createProductInOrg,
  createGitlabProjectforProduct,
  pushProductToGitlab,

  fetchProxyFromOrg,
  SendProxyToOrg,
  sendProxyToGitlab,
  createGitlabProjectforProxy,
  fetchLatestRevision,
  fetchProxyDeployments,
  fetchAllProxies,

  getGitlabProjectId,
  getGitUser, 
};
