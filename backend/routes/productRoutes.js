/**
 * Product Routes - All product-related API endpoints
 * Handles: clone, update, list, view operations
 */

const express = require('express');
const router = express.Router();
const {
    cloneProduct,
    updateProduct,
    getAllProductsFromOrganization,
    getProductForView
} = require('../controllers/productController');
const { validateCloneProduct, validateUpdateProduct } = require('../middleware/validation');

// Product CRUD operations
router.post('/clone', validateCloneProduct, cloneProduct);
router.put('/update', validateUpdateProduct, updateProduct);

// Product listing and viewing
router.get('/by-organization/:orgId', getAllProductsFromOrganization);
router.get('/view/:orgId/:productName', getProductForView);

module.exports = router;