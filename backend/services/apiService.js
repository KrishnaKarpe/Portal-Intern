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
 * Fetch all products from an organization using Apigee API with expand=true
 * @param {string} orgId - Organization ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Products data with full details
 */
const fetchAllProductsFromOrg = async (orgId, token) => {
  console.log(`Fetching all products from organization ${orgId} with expanded details`);
  console.log(`Using token: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);

  if (!token || token.trim() === '') {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts?expand=true`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Increase timeout for expanded response
    });

    console.log('Successfully fetched expanded products list');
    console.log('Response structure:', {
      hasApiProduct: !!response.data.apiProduct,
      isArray: Array.isArray(response.data.apiProduct),
      count: response.data.apiProduct?.length || 0
    });

    // Log sample product to verify structure
    if (response.data.apiProduct && response.data.apiProduct.length > 0) {
      const sampleProduct = response.data.apiProduct[0];
      console.log('Sample expanded product:', {
        name: sampleProduct.name,
        displayName: sampleProduct.displayName,
        hasDescription: !!sampleProduct.description,
        descriptionLength: sampleProduct.description?.length || 0,
        hasEnvironments: !!sampleProduct.environments,
        environmentsCount: sampleProduct.environments?.length || 0,
        environments: sampleProduct.environments
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching expanded products:', error.message);
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
