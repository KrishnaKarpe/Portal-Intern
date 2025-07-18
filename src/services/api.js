
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
 * Get products by organization ID
 * @param {string|number} orgId - Organization ID
 * @returns {Promise<Array>} List of products
 */
export const getProductsByOrganization = async (orgId) => {
  try {
    const response = await fetch(`${API_URL}/products/by-organization/${orgId}`);
    
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
