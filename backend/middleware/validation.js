
/**
 * Validation Middleware - Validates request data before processing
 * Used to ensure request data meets required format/constraints
 */

const { body, validationResult } = require('express-validator');

/**
 * Validate clone product request data
 */
const validateCloneProduct = [
  body('sourceOrg').notEmpty().withMessage('Source organization is required'),
  body('targetOrg').notEmpty().withMessage('Target organization is required'),
  body('sourceToken').notEmpty().withMessage('Source token is required'),
  body('targetToken').notEmpty().withMessage('Target token is required'),
  body('productName').notEmpty().withMessage('Product name is required'),
  body('newProductName').notEmpty().withMessage('New product name is required'),
  
  // Check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate update product request data
 */
const validateUpdateProduct = [
  body('organizationId').notEmpty().withMessage('Organization ID is required'),
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('token').notEmpty().withMessage('Authorization token is required'),
  
  // Check that at least one update field is provided
  body().custom(body => {
    if (!(body.name || body.displayName || body.description)) {
      throw new Error('At least one field to update is required');
    }
    return true;
  }),
  
  // Check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateCloneProduct,
  validateUpdateProduct
};
