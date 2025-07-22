/**
 * Product Controller - Handles business logic for product operations
 * Responsible for processing client requests and returning responses
 */

const {
  fetchProductFromOrg,
  modifyProductForClone,
  createProductInOrg
} = require('../services/apiService');

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

    // console.log('Attempting to clone product:', {
    //   sourceOrg,
    //   targetOrg,
    //   productName,
    //   newProductName
    // });

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

    // console.log("Fetched product:", JSON.stringify(product, null, 2));

    // Step 2: Modify product data for target organization
    console.log('Step 2: Modifying product data...');
    const modifiedProduct = modifyProductForClone(product, {
      newProductName,
      newDisplayName,
      description,
      environments
    });

    // console.log("Modified product data:", JSON.stringify(modifiedProduct, null, 2));

    // Step 3: Create product in target organization
    // console.log('Step 3: Creating product in target organization...');
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
 * Get list of organizations (using mock data for demo)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOrganizations = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: organizations
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
 * Get products by organization ID (using mock data for demo)
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
  getProductsByOrganization
};
