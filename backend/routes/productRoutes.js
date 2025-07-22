const express = require('express');
const router = express.Router();
const {
    cloneProduct,
    updateProduct,
    getOrganizations,
    getProductsByOrganization
} = require('../controllers/productController');
const { validateCloneProduct, validateUpdateProduct } = require('../middleware/validation');

// Fix the route and add validation
router.post('/products/clone', validateCloneProduct, cloneProduct);
router.put('/products/update', validateUpdateProduct, updateProduct);
router.get('/products/organizations', getOrganizations);
router.get('/products/by-organization/:orgId', getProductsByOrganization);


module.exports = router;