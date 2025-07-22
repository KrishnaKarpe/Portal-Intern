const express = require('express');
const router = express.Router();
const {
    cloneProduct,
    updateProduct,
    getOrganizations,
    getProductsByOrganization,
    getAllProductsFromOrganization,
    getProductDetailsById
} = require('../controllers/productController');
const { validateCloneProduct, validateUpdateProduct } = require('../middleware/validation');

// Product operations
router.post('/products/clone', validateCloneProduct, cloneProduct);
router.put('/products/update', validateUpdateProduct, updateProduct);

// Organization operations
router.get('/products/organizations', getOrganizations);

// Real API product operations
router.get('/products/by-organization/:orgId', getAllProductsFromOrganization);
router.get('/products/details/:orgId/:productName', getProductDetailsById);

// Fallback route for mock data (optional)
router.get('/products/mock/by-organization/:orgId', getProductsByOrganization);

module.exports = router;