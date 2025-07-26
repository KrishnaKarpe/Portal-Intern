/**
 * API Service for frontend - Updated for modular backend
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
 * Get all products from an organization using real Apigee API
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} List of products
 */
export const getAllProductsFromOrganization = async (orgId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/products/by-organization/${orgId}?token=${encodeURIComponent(token)}`
    );
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
    const response = await fetch(
      `${API_URL}/products/view/${orgId}/${productName}?token=${encodeURIComponent(token)}`
    );
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
 * Get list of organizations
 * @returns {Promise<Array>} List of organizations
 */
export const getOrganizations = async () => {
  try {
    const response = await fetch(`${API_URL}/organizations`);

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
 * Get products by organization ID (fallback using mock data)
 * @param {string|number} orgId - Organization ID
 * @returns {Promise<Array>} List of products
 */
export const getProductsByOrganization = async (orgId) => {
  try {
    const response = await fetch(`${API_URL}/organizations/${orgId}/products`);

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
 * Move a proxy from one organization to another
 * @param {Object} proxyData - Proxy data to move
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
      throw new Error(data.message || 'Failed to move proxy');
    }

    return data;
  } catch (error) {
    console.error('Error moving proxy:', error);
    throw error;
  }
};

/**
 * Get all proxies from an organization
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} List of proxies
 */
export const getAllProxiesFromOrganization = async (orgId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/proxy/by-organization/${orgId}?token=${encodeURIComponent(token)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch proxies');
    }

    //     The backend sends: { success: true, data: [...proxies], message: "..." }
    // So we need data.data, not just data
    return data.data || [];
  } catch (error) {
    console.error('Error fetching proxies:', error);
    throw error;
  }
};

/**
 * Get environments for an organization
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} List of environments
 */
export const getOrganizationEnvironments = async (orgId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/proxy/environments/${orgId}?token=${encodeURIComponent(token)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch environments');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching environments:', error);
    throw error;
  }
};

