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

//move proxies api
/**
 * Clone a product from one organization to another
 * @param {Object} proxyData - Proxy data to clone
 * @returns {Promise<Object>} API response
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
// GitLab API helpers (direct)
// ---------------------------
const GITLAB_API_URL = 'https://gitlab.com/api/v4';

/**
 * Create a GitLab project
 * @param {Object} params { token, name, namespaceId, templateName }
 */
export const gitlabCreateProject = async ({ token, name, namespaceId, templateName }) => {
  const form = new FormData();
  form.append('name', name);
  if (namespaceId) form.append('namespace_id', String(namespaceId));
  if (templateName) form.append('template_name', templateName);

  const response = await fetch(`${GITLAB_API_URL}/projects`, {
    method: 'POST',
    headers: { 'PRIVATE-TOKEN': token },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to create project');
  return data;
};

/**
 * Create a branch in a project
 * @param {Object} params { token, projectId, branch, ref }
 */
export const gitlabCreateBranch = async ({ token, projectId, branch, ref = 'master' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/branches?branch=${encodeURIComponent(branch)}&ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'PRIVATE-TOKEN': token },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to create branch');
  return data;
};

/**
 * Get repository tree
 * @param {Object} params { token, projectId, ref }
 */
export const gitlabGetTree = async ({ token, projectId, ref = 'master' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/tree?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to fetch tree');
  return data;
};

/**
 * Get repository tree at path
 * @param {Object} params { token, projectId, path, ref }
 */
export const gitlabGetTreeAtPath = async ({ token, projectId, path, ref = 'master' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/tree?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to fetch tree at path');
  return data;
};

/**
 * Get raw file content
 * @param {Object} params { token, projectId, filePath, ref }
 */
export const gitlabGetRawFile = async ({ token, projectId, filePath, ref = 'master' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to fetch file');
  }
  const text = await response.text();
  return text;
};

/**
 * Download repository archive (returns Blob)
 * @param {Object} params { token, projectId, sha }
 */
export const gitlabGetArchive = async ({ token, projectId, sha = 'master' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/archive.tar.gz?sha=${encodeURIComponent(sha)}`;
  const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to fetch archive');
  }
  const blob = await response.blob();
  return blob;
};

/**
 * Create or update a file in repository
 * @param {Object} params { token, projectId, filePath, branch, content, commitMessage, method }
 */
export const gitlabUpsertFile = async ({ token, projectId, filePath, branch = 'master', content, commitMessage, method = 'POST' }) => {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`;
  const response = await fetch(url, {
    method, // 'POST' to create, 'PUT' to update
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch, content, commit_message: commitMessage }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to upsert file');
  return data;
};