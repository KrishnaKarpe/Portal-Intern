/**
 * Product Controller - Handles business logic for product operations
 * Responsible for processing client requests and returning responses
 */

const {
  fetchProductFromOrg,
  fetchAllProductsFromOrg,
  modifyProductForClone,
  updateProductInOrg,
  createProductInOrg
} = require('../services/apiService');

const { organizations, products } = require('../data/mockData');

/**
 * Clone a product from source organization to target organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cloneProduct = async (req, res) => {
  console.log('Clone request received:', req.body);

  try {
    const {
      sourceOrg,
      targetOrg,
      sourceToken,
      targetToken,
      productName,
      newProductName,
      newDisplayName,
      description,
      environments
    } = req.body;

    // Step 1: Fetch product from source organization
    console.log('Step 1: Fetching product from source...');
    const product = await fetchProductFromOrg(sourceOrg, productName, sourceToken);

    if (!product) {
      console.log('Product not found in source organization');
      return res.status(404).json({
        success: false,
        message: 'Product not found in source organization'
      });
    }

    // Step 2: Modify product data for target organization
    console.log('Step 2: Modifying product data...');
    const modifiedProduct = modifyProductForClone(product, {
      newProductName,
      newDisplayName,
      description,
      environments
    });

    // Step 3: Create product in target organization
    const createdProduct = await createProductInOrg(
      targetOrg,
      modifiedProduct,
      targetToken,
      newProductName
    );

    console.log("Created product:", JSON.stringify(createdProduct, null, 2));

    return res.status(201).json({
      success: true,
      message: 'Product cloned successfully',
      data: createdProduct
    });

  } catch (error) {
    console.error('Error cloning product:', error);
    console.error('Error details:', error.details);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clone product',
      error: error.details || undefined
    });
  }
};

/**
 * Update an existing product in an organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProduct = async (req, res) => {
  try {
    const {
      organizationId,
      productId,
      token,
      name,
      displayName,
      description
    } = req.body;

    // Prepare the update data
    const updateData = {};
    if (name) updateData.name = name;
    if (displayName) updateData.displayName = displayName;
    if (description) updateData.description = description;

    // Update the product in the organization
    const updatedProduct = await updateProductInOrg(
      organizationId,
      productId,
      updateData,
      token
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update product',
      error: error.details || undefined
    });
  }
};

/**
 * Get all products from an organization using real Apigee API (simplified)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllProductsFromOrganization = async (req, res) => {
  console.log('Get all products request received:', req.query);

  try {
    const { orgId } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    console.log('Fetching all products from organization:', orgId);
    const productsData = await fetchAllProductsFromOrg(orgId, token);

    let products = [];

    if (productsData.apiProduct && Array.isArray(productsData.apiProduct)) {
      // If response contains apiProduct array (detailed response)
      console.log('Processing detailed product response...');
      products = productsData.apiProduct.map((product, index) => ({
        id: index + 1,
        name: product.name,
        displayName: product.displayName || product.name,
        description: product.description || '',
        environments: product.environments || [],
        orgId: orgId
      }));
    } else if (Array.isArray(productsData)) {
      // If response is directly an array of product names
      console.log('Received product names list, fetching details for each...');
      console.log('Product names received:', productsData.slice(0, 5)); // Log first 5 names

      // Limit to first 10 products to avoid rate limiting and improve performance
      const productNames = productsData.slice(0, 10);

      // Use Promise.allSettled to handle partial failures
      const productDetailsPromises = productNames.map(async (productName, index) => {
        try {
          console.log(`Fetching details for product: ${productName}`);
          const productDetails = await fetchProductFromOrg(orgId, productName, token);

          console.log(`Successfully fetched details for ${productName}:`, {
            name: productDetails.name,
            displayName: productDetails.displayName,
            description: productDetails.description?.substring(0, 50) + '...',
            environments: productDetails.environments
          });

          return {
            status: 'fulfilled',
            value: {
              id: index + 1,
              name: productDetails.name,
              displayName: productDetails.displayName || productDetails.name,
              description: productDetails.description || '',
              environments: productDetails.environments || [],
              orgId: orgId
            }
          };
        } catch (error) {
          console.error(`Error fetching details for product ${productName}:`, error.message);
          return {
            status: 'rejected',
            reason: error,
            value: {
              id: index + 1,
              name: productName,
              displayName: productName,
              description: 'Unable to fetch details - API error',
              environments: [],
              orgId: orgId
            }
          };
        }
      });

      const results = await Promise.allSettled(productDetailsPromises);

      products = results.map((result, index) => {
        if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
          return result.value.value;
        } else {
          // Handle rejected promises
          const productName = productNames[index];
          console.warn(`Using fallback data for product: ${productName}`);
          return {
            id: index + 1,
            name: productName,
            displayName: productName,
            description: 'Details unavailable - check API permissions',
            environments: [],
            orgId: orgId
          };
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'fulfilled').length;
      console.log(`Successfully fetched details for ${successCount}/${productNames.length} products`);

    } else {
      console.log('Unexpected API response format:', productsData);
      products = [];
    }

    console.log(`Transformed ${products.length} products for frontend`);

    // Log sample of what we're sending to frontend
    if (products.length > 0) {
      console.log('Sample product data being sent:', {
        name: products[0].name,
        displayName: products[0].displayName,
        description: products[0].description?.substring(0, 50) + '...',
        environments: products[0].environments,
        hasDescription: !!products[0].description,
        hasEnvironments: products[0].environments.length > 0
      });
    }

    return res.status(200).json({
      success: true,
      data: products,
      total: products.length,
      organization: orgId,
      message: `Found ${products.length} products`  // Add helpful message
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    console.error('Error details:', error.details);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch products',
      error: error.details || undefined
    });
  }
};

/**
 * Get detailed product information for viewing with grouped API source data
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
const getProductForView = async (req, res) => {
  try {
    const { orgId, productName } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    console.log('Fetching product for view:', { orgId, productName });
    const productDetails = await fetchProductFromOrg(orgId, productName, token);

    // Extract specific data as per your requirements with grouped structure
    const transformedProduct = {
      name: productDetails.name,
      displayName: productDetails.displayName || productDetails.name,
      description: productDetails.description || '',
      environments: productDetails.environments || [],

      // Group operation data by API source
      apiOperations: []
    };

    // Process operation group if it exists
    if (productDetails.operationGroup && productDetails.operationGroup.operationConfigs) {
      transformedProduct.apiOperations = productDetails.operationGroup.operationConfigs.map(config => {
        const apiOperation = {
          apiSource: config.apiSource || 'Unknown API Source',
          operations: []
        };

        if (config.operations && Array.isArray(config.operations)) {
          apiOperation.operations = config.operations.map(operation => ({
            resource: operation.resource || '',
            methods: operation.methods || []
          }));
        }

        return apiOperation;
      });
    }

    console.log('Transformed product for view with grouped operations:', transformedProduct);

    return res.status(200).json({
      success: true,
      data: transformedProduct
    });

  } catch (error) {
    console.error('Error fetching product for view:', error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch product details',
      error: error.details || undefined
    });
  }
};

/**
 * Get list of organizations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOrganizations = (req, res) => {
  try {
    const orgs = [
      { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
      { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
    ];

    return res.status(200).json({
      success: true,
      data: orgs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations',
      error: error.message
    });
  }
};

/**
 * Get products by organization ID (fallback using mock data)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProductsByOrganization = (req, res) => {
  try {
    const { orgId } = req.params;
    const filteredProducts = products.filter(
      product => product.orgId === parseInt(orgId, 10)
    );

    return res.status(200).json({
      success: true,
      data: filteredProducts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

module.exports = {
  cloneProduct,
  updateProduct,
  getOrganizations,
  getProductsByOrganization,
  getAllProductsFromOrganization,
  getProductDetailsById: getProductForView, // Use the new function for view
  getProductForView
};
