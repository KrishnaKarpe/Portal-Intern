/**
 * Product Controller - Handles product-specific operations
 */

const {
  cloneProductService,
  getAllProductsService,
  getProductForViewService
} = require('../services/productService');

const { updateProductService } = require('../services/updateService');

const {
  sendSuccess,
  sendError,
  sendValidationError
} = require('../utils/responseHandler');

/**
 * Clone a product from source organization to target organization
 */
const cloneProduct = async (req, res) => {
  console.log('Clone request received:');

  try {
    const createdProduct = await cloneProductService(req.body);
    return sendSuccess(res, createdProduct, 'Product cloned successfully', 201);
  } catch (error) {
    console.error('Error cloning product:', error);
    console.error('Error details:', error.details);
    return sendError(res, error, 'Failed to clone product');
  }
};

/**
 * Update an existing product in an organization
 */
const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await updateProductService(req.body);
    return sendSuccess(res, updatedProduct, 'Product updated successfully');
  } catch (error) {
    console.error('Error updating product:', error);
    return sendError(res, error, 'Failed to update product');
  }
};

/**
 * Get all products from an organization using real Apigee API with expand=true
 */
const getAllProductsFromOrganization = async (req, res) => {
  console.log('Get all products request received:', req.query);

  try {
    const { orgId } = req.params;
    const { token } = req.query;

    if (!token) {
      return sendValidationError(res, 'Authentication token is required');
    }

    const result = await getAllProductsService(orgId, token);
    return sendSuccess(res, result.products, result.message, 200);
  } catch (error) {
    console.error('Error fetching products:', error);
    console.error('Error details:', error.details);
    return sendError(res, error, 'Failed to fetch products');
  }
};

/**
 * Get detailed product information for viewing with grouped API source data
 */
const getProductForView = async (req, res) => {
  try {
    const { orgId, productName } = req.params;
    const { token } = req.query;

    if (!token) {
      return sendValidationError(res, 'Authentication token is required');
    }

    const transformedProduct = await getProductForViewService(orgId, productName, token);
    return sendSuccess(res, transformedProduct);
  } catch (error) {
    console.error('Error fetching product for view:', error);
    return sendError(res, error, 'Failed to fetch product details');
  }
};

module.exports = {
  cloneProduct,
  updateProduct,
  getAllProductsFromOrganization,
  getProductForView
};
