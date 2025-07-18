const express = require('express');
const router = express.Router();
const { cloneProduct } = require('../controllers/productController');

router.post('/clone-product', cloneProduct);

module.exports = router;