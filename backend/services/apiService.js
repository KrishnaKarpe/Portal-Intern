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
const createGitlabProject = async (proxyName, token,template) => {
  try {
    console.log(`Creating new GitLab project: ${proxyName}`);
    const response = await axios.post(
      'https://gitlab.com/api/v4/projects',
      {
        name: proxyName,
        namespace_id: 116698866, 
        //template_name : template ,
        visibility: 'private',
      },
      {
        headers: { 'PRIVATE-TOKEN': token },
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
 * @param {string} branch - Target branch (default: 'main')
 * @param {string} template - Template to use for new project (optional)
 * @param {Array} environments - Environments to set up in the new project (if created)
 * @returns {Promise<Object>} - Upload response { success, projectId, username, gitlabProjectUrl }
 */
const sendProxyToGitlab = async (proxyName, token, proxyBundle, branch, template, environments = []) => {
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
      projectId = await createGitlabProject(proxyName, token, "python");
      isNewProject = true;
    }

    const uploadBranch = branch;

    // If new project, create at least 1 branch
    if (isNewProject) {
      console.log(`Creating environment branches: ${environments.join(', ') || 'dev'}`);
      const baseBranch = environments[0] || 'dev';

      // Create first branch
      await axios.post(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/files/README.md`,
        {
          branch: baseBranch,
          content: `# ${proxyName}`,
          commit_message: `Initial commit on ${baseBranch}`,
        },
        { headers: { 'PRIVATE-TOKEN': token } }
      );
      console.log(`✅ Created initial branch '${baseBranch}' with README`);

      for (const env of environments.slice(1)) {
        try {
          await axios.post(
            `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
            { branch: env, ref: baseBranch },
            { headers: { 'PRIVATE-TOKEN': token } }
          );
          console.log(`✅ Created branch '${env}'`);
        } catch (err) {
          console.warn(`⚠️ Skipped '${env}': ${err.response?.data?.message || err.message}`);
        }
      }
    } else {
      // When not new project: ensure selected branch exists
      try {
        await axios.get(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(branch)}`,
          { headers: { 'PRIVATE-TOKEN': token } }
        );
        console.log(`✅ Branch '${branch}' exists`);
      } catch {
        console.log(`⚠️ Branch '${branch}' missing — creating now...`);
        const ref = environments[0] || 'dev';
        await axios.post(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
          { branch, ref },
          { headers: { 'PRIVATE-TOKEN': token } }
        );
      }
    }

    // Create other environment branches if they don't exist
    for (const env of environments) {
      if (env === branch) continue; // Skip upload branch
        try {   //checking env exists already
          await axios.get(
            `https://gitlab.com/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(env)}`,
            { headers: { 'PRIVATE-TOKEN': token } }
          );
          console.log(`✅ Branch '${env}' exists`);
        } catch {   //if not
            try {
              await axios.post(
                `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`,
                { branch: env, ref: branch }, // create from upload branch
                { headers: { 'PRIVATE-TOKEN': token } }
              );
              console.log(`✅ Created missing branch '${env}' from '${branch}'`);
            } catch (err) {
            console.warn(`⚠️ Skipped '${env}': ${err.response?.data?.message || err.message}`);
            }
        }
    }

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

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const repoPath = entry.entryName.replace(/\\/g, '/');
      const fileUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(repoPath)}`;
      const content = entry.getData().toString('base64');

      try {
        // File creation
        await axios.post(
          fileUrl,
          {
            branch : uploadBranch,
            content,
            commit_message: `Upload ${repoPath} by ${usernameToUse} on branch ${uploadBranch}`,
            encoding: 'base64',
          },
          { headers: { 'PRIVATE-TOKEN': token } }
        );
      } catch (err) {
        // If file exists, update with PUT
        if (err.response?.status === 400) {
          await axios.put(
            fileUrl,
            {
              branch : uploadBranch,
              content,
              commit_message: `Update ${repoPath} by ${usernameToUse}`,
              encoding: 'base64',
            },
            { headers: { 'PRIVATE-TOKEN': token } }
          );
        } else {
          throw err;
        }
      }

      console.log(`📤 Uploaded: ${repoPath}`);
    }

    console.log(`✅ Proxy bundle uploaded successfully to ${proxyName}`);
    return { success: true, projectId, username: usernameToUse, gitlabProjectUrl };
  } catch (error) {
    console.error('❌ Error uploading proxy:', error.response?.data || error.message);
    throw error;
  }
};


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

<<<<<<< Updated upstream
// Export functions
=======
// (exports moved to bottom)

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

// Export functions with clear naming (placed after all definitions)
>>>>>>> Stashed changes
module.exports = {
  fetchProductFromOrg,
  fetchAllProductsFromOrg,
  modifyProductForClone,
  createProductInOrg,
  fetchProxyFromOrg,
  SendProxyToOrg,
  sendProxyToGitlab,
  createGitlabProject,
  getGitlabProjectId,
  fetchLatestRevision,
  getGitUser,
  fetchProxyDeployments,
};
