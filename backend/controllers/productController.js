/**
 * Product Controller - Handles business logic for product operations
 * Responsible for processing client requests and returning responses
 */

const {
  fetchProductFromOrg,
  fetchAllProductsFromOrg,
  modifyProductForClone,
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

      // Limit to first 15 products to avoid rate limiting
      const productNames = productsData.slice(0, 15);

      products = await Promise.all(
        productNames.map(async (productName, index) => {
          try {
            const productDetails = await fetchProductFromOrg(orgId, productName, token);
            return {
              id: index + 1,
              name: productDetails.name,
              displayName: productDetails.displayName || productDetails.name,
              description: productDetails.description || '',
              environments: productDetails.environments || [],
              orgId: orgId
            };
          } catch (error) {
            console.error(`Error fetching details for product ${productName}:`, error);
            // Return basic info if detailed fetch fails
            return {
              id: index + 1,
              name: productName,
              displayName: productName,
              description: 'Unable to fetch details',
              environments: [],
              orgId: orgId
            };
          }
        })
      );
    } else {
      console.log('Unexpected API response format:', productsData);
      products = [];
    }

    console.log(`Transformed ${products.length} products for frontend`);

    return res.status(200).json({
      success: true,
      data: products,
      total: products.length,
      organization: orgId
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
 * Get detailed product information for viewing with specific data extraction
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

    // Extract specific data as per your requirements
    const transformedProduct = {
      name: productDetails.name,
      displayName: productDetails.displayName || productDetails.name,
      description: productDetails.description || '',
      environments: productDetails.environments || [],

      // Extract operation group data
      apiSources: [],
      resources: [],
      methods: []
    };

    // Process operation group if it exists
    if (productDetails.operationGroup && productDetails.operationGroup.operationConfigs) {
      productDetails.operationGroup.operationConfigs.forEach(config => {
        if (config.apiSource) {
          transformedProduct.apiSources.push(config.apiSource);
        }

        if (config.operations) {
          config.operations.forEach(operation => {
            if (operation.resource) {
              transformedProduct.resources.push(operation.resource);
            }
            if (operation.methods) {
              transformedProduct.methods.push(...operation.methods);
            }
          });
        }
      });
    }

    // Remove duplicates
    transformedProduct.apiSources = [...new Set(transformedProduct.apiSources)];
    transformedProduct.resources = [...new Set(transformedProduct.resources)];
    transformedProduct.methods = [...new Set(transformedProduct.methods)];

    console.log('Transformed product for view:', transformedProduct);

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
