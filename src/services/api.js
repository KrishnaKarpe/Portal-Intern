/**
 * API Service for frontend
 * Handles communication with the backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Clone a product from one organization to another
 * @param {Object} productData - Product data to clone
 * @returns {Promise<Object>} API response
 */
export const cloneProduct = async (productData) => {
  try {
    const response = await fetch(`${API_URL}/products/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to clone product');
    }

    return data;
  } catch (error) {
    console.error('Error cloning product:', error);
    throw error;
  }
};

/**
 * Update an existing product
 * @param {Object} productData - Product data to update
 * @returns {Promise<Object>} API response
 */
export const updateProduct = async (productData) => {
  try {
    const response = await fetch(`${API_URL}/products/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update product');
    }

    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Get list of organizations
 * @returns {Promise<Array>} List of organizations
 */
export const getOrganizations = async () => {
  try {
    const response = await fetch(`${API_URL}/products/organizations`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch organizations');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

/**
 * Get all products from an organization using real Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} List of products
 */
export const getAllProductsFromOrganization = async (orgId, token) => {
  try {
    const response = await fetch(`${API_URL}/products/by-organization/${orgId}?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch products');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Get detailed product information for viewing
 * @param {string} orgId - Organization ID
 * @param {string} productName - Product name
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Product details
 */
export const getProductForView = async (orgId, productName, token) => {
  try {
    const response = await fetch(`${API_URL}/products/view/${orgId}/${productName}?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch product details');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching product for view:', error);
    throw error;
  }
};

/**
 * Get products by organization ID (fallback using mock data)
 * @param {string|number} orgId - Organization ID
 * @returns {Promise<Array>} List of products
 */
export const getProductsByOrganization = async (orgId) => {
  try {
    const response = await fetch(`${API_URL}/products/mock/by-organization/${orgId}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch products');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Move proxies via backend
/**
 * Move/clone a proxy via backend orchestrator
 * @param {Object} proxyData
 * @returns {Promise<Object>}
 */
export const MoveProxy = async (proxyData) => {
  try {
    const response = await fetch(`${API_URL}/proxy/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to clone proxy');
    }

    return data;
  } catch (error) {
    console.error('Error cloning proxy:', error);
    throw error;
  }
};

//move proxies api
/**
 * Clone a product from one organization to another
 * @param {Object} gitdata - Proxy data to clone
 * @returns {Promise<Object>} API response
 */
export const pushProxyToGitlab = async (gitdata) => {
  try{
  const response = await fetch(`${API_URL}/git/lab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gitdata),
    });
    const resdata = await response.json();

      if (!response.ok) {
        throw new Error(resdata.message || 'Failed to clone proxy');
      }

      return resdata;
  } catch (error) {
    console.error('Error cloning proxy:', error);
    throw error;
  }
};

//to get latest revision
/**
 * Fetch the latest revision number of a proxy in the source organization
 * @param {Object} payload - { sourceOrg, proxyName, sourceToken }
 * @returns {Promise<number>} Latest revision number
 */
export const fetchLatestRevision = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/git/latest-revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch latest revision. Check if proxy exists and correct name is provided');
    return data.latestRevision;
  } catch (error) {
    console.error('Error fetching latest revision:', error);
    throw error;
  }
};
// Fetch deployment status for a proxy
// payload: { sourceOrg, proxyName, sourceToken }
export const fetchDeploymentStatus = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/git/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch deployment status');
    return data.deployments || [];
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    throw error;
  }
};

export const fetchProxies = async (sourceOrg, token) => {
  try {
    const res = await fetch(`${API_URL}/proxy/getAllProxies?sourceOrg=${sourceOrg}&token=${token}`);

    // Try parsing JSON safely
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      const text = await res.text(); // fallback to raw text
      console.error('Backend returned non-JSON response:', text);
      throw new Error(`Failed to fetch proxies. Backend returned non-JSON response.`);
    }

    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch proxies.');
    }

    return data; // should be array of proxy names
  } catch (error) {
    console.error('Error fetching proxies:', error);
    throw error;
  }
};

//move products api
/**
 * @param {Object} gitdata2 - Proxy data to clone
 * @returns {Promise<Object>} API response
 */
export const pushProductToGitlab = async (gitdata2) => {
  try{
  const response = await fetch(`${API_URL}/git/gitproduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gitdata2),
    });
    const resdata = await response.json();

      if (!response.ok) {
        throw new Error(resdata.message || 'Failed to clone product for gitlab');
      }

      return resdata;
  } catch (error) {
    console.error('Error cloning product:', error);
    throw error;
  }
};

export const deployProxy = async (deployData) => {
  try {
    const response = await fetch(`${API_URL}/proxy/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployData),
    }); 
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to deploy proxy');
    }
    return data;
  }
  catch (error) {
    console.error('Error deploying proxy:', error);
    throw error;
  }
}  

/**
 * Fetch the file tree + diff summary for two proxy revisions
 * @param {Object} payload - { sourceOrg, proxyName, sourceToken, revision1, revision2 }
 * @returns {Promise<{ fileTree, fileDiffSummary }>}
 */
export const getCompareFileTree = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/proxy/compare/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch compare file tree');
    return data;
  } catch (error) {
    console.error('Error fetching compare file tree:', error);
    throw error;
  }
};
 
/**
 * Fetch the content of a specific file from two proxy revisions
 * @param {Object} payload - { sourceOrg, proxyName, sourceToken, revision1, revision2, filePath }
 * @returns {Promise<{ revision1: { content, exists }, revision2: { content, exists }, isDifferent }>}
 */
export const getCompareFileContent = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/proxy/compare/file-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch compare file content');
    return data;
  } catch (error) {
    console.error('Error fetching compare file content:', error);
    throw error;
  }
};