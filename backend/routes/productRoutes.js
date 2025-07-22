const express = require('express');
const router = express.Router();
const {
    cloneProduct,
    updateProduct,
    getOrganizations,
    getAllProductsFromOrganization,
    getProductForView
} = require('../controllers/productController');
const { validateCloneProduct, validateUpdateProduct } = require('../middleware/validation');

// Product operations
router.post('/products/clone', validateCloneProduct, cloneProduct);
router.put('/products/update', validateUpdateProduct, updateProduct);

// Organization operations
router.get('/products/organizations', getOrganizations);

// Real API product operations
router.get('/products/by-organization/:orgId', getAllProductsFromOrganization);
router.get('/products/view/:orgId/:productName', getProductForView); // New view endpoint

module.exports = router;