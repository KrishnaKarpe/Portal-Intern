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
  console.log(`Using token: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);

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
      }
    });

    console.log('Successfully fetched product data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching product:', error.message);
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

// Export functions with clear naming
module.exports = {
  fetchProductFromOrg,           // Fetch single product 
  fetchAllProductsFromOrg,       // Fetch all products from organization
  modifyProductForClone,         // Modify product data for cloning
  createProductInOrg,            // Create new product in organization
  fetchProductDetails: fetchProductFromOrg  // Alias pointing to the same function
};
