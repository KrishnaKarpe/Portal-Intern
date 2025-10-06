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
 * Get detailed information about a specific product
 * @param {string} orgId - Organization ID
 * @param {string} productName - Product name
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Product details
 */
export const getProductDetails = async (orgId, productName, token) => {
  try {
    const response = await fetch(`${API_URL}/products/details/${orgId}/${productName}?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch product details');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching product details:', error);
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

// ---------------------------
// GitLab (backend) endpoints
// ---------------------------

/**
 * Push Apigee proxy bundle to GitLab (backend orchestrated)
 * @param {Object} payload { apigeeOrg, apigeeToken, proxyName, revision, gitlabToken, gitlabGroupName, gitRef }
 */
export const gitlabPushProxy = async (payload) => {
  const response = await fetch(`${API_URL}/gitlab/push-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to push proxy to GitLab');
  return data;
};

/**
 * Create a GitLab project (backend handled)
 * @param {Object} payload { gitlabToken, name, groupName }
 */
export const gitlabCreateProject = async (payload) => {
  const response = await fetch(`${API_URL}/gitlab/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create GitLab project');
  return data;
};

/**
 * Create a branch in a project (backend handled)
 * @param {string|number} projectId
 * @param {Object} payload { gitlabToken, branch, ref }
 */
export const gitlabCreateBranch = async (projectId, payload) => {
  const response = await fetch(`${API_URL}/gitlab/projects/${encodeURIComponent(projectId)}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create branch');
  return data;
};

/**
 * Get repository tree (backend handled)
 * @param {string|number} projectId
 * @param {Object} query { ref, path }
 */
export const gitlabGetTree = async (projectId, query = {}) => {
  const params = new URLSearchParams();
  if (query.ref) params.set('ref', query.ref);
  if (query.path) params.set('path', query.path);
  const response = await fetch(`${API_URL}/gitlab/projects/${encodeURIComponent(projectId)}/tree?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch tree');
  return data;
};

/**
 * Get raw file (backend handled)
 * @param {string|number} projectId
 * @param {Object} query { path, ref }
 */
export const gitlabGetRawFile = async (projectId, query) => {
  const params = new URLSearchParams();
  if (query?.path) params.set('path', query.path);
  if (query?.ref) params.set('ref', query.ref);
  const response = await fetch(`${API_URL}/gitlab/projects/${encodeURIComponent(projectId)}/files/raw?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch file');
  }
  return await response.text();
};

/**
 * Get archive (backend handled) - returns Blob-like via arrayBuffer here
 * @param {string|number} projectId
 * @param {Object} query { sha }
 */
export const gitlabGetArchive = async (projectId, query = {}) => {
  const params = new URLSearchParams();
  if (query.sha) params.set('sha', query.sha);
  const response = await fetch(`${API_URL}/gitlab/projects/${encodeURIComponent(projectId)}/archive?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch archive');
  }
  return await response.arrayBuffer();
};

/**
 * Create or update a file (backend handled)
 * @param {string|number} projectId
 * @param {Object} payload { gitlabToken, path, content, commitMessage, branch, method }
 */
export const gitlabUpsertFile = async (projectId, payload) => {
  const response = await fetch(`${API_URL}/gitlab/projects/${encodeURIComponent(projectId)}/files`, {
    method: (payload?.method || 'POST'),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to upsert file');
  return data;
};