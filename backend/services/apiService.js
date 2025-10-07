/**
 * API Service - Handles external API communication
 * Responsible for making requests to the Apigee API
 */

const axios = require('axios');

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
    // First, create the proxy
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
const createGitlabProject = async (proxyName, token) => {
  try {
    console.log(`Creating new GitLab project: ${proxyName}`);
    const response = await axios.post(
      'https://gitlab.com/api/v4/projects',
      {
        name: proxyName,
        namespace_id: 116698866, 
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
 * Upload proxy bundle to GitLab project (creates project if missing)
 * @param {string} proxyName - Proxy name / GitLab project name
 * @param {string} token - GitLab access token
 * @param {Buffer} proxyBundle - Proxy bundle binary (zip)
 * @param {string} branch
 * @returns {Promise<Object>} - Upload response
 */
const sendProxyToGitlab = async (proxyName, token, proxyBundle, branch) => {
  try {
    console.log(`Checking for GitLab project: ${proxyName}`);

    // Step 1: Try to get existing project
    let projectId;
    try {
      projectId = await getGitlabProjectId(proxyName, token);
      console.log(`Found GitLab project ${proxyName} (ID: ${projectId})`);
    } catch {
      console.log(`Project ${proxyName} not found. Creating new project...`);
      projectId = await createGitlabProject(proxyName, token);
    }

    // Step 2: Encode proxy bundle (GitLab API expects base64 for file uploads)
    const base64Data = Buffer.from(proxyBundle).toString('base64');

    // Step 3: Upload proxy zip to GitLab
    const fileName = `${proxyName}.zip`;
    console.log(`Uploading ${fileName} to GitLab project ${projectId}`);

    const uploadUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(fileName)}`;

    const response = await axios.post(
      uploadUrl,
      {
        branch: branch,
        content: base64Data,
        commit_message: `Upload proxy bundle for ${proxyName}`,
        encoding: 'base64',
      },
      {
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Proxy bundle uploaded successfully to ${proxyName}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error uploading proxy to GitLab:', error.response?.data || error.message);
    throw error;
  }
};


    

// Export functions with clear naming
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


};
