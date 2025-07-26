/**
 * Main Router - Central routing configuration
 * All route modules are imported and configured here
 */


// Import route modules
const productRoutes = require('./productRoutes');
const organizationRoutes = require('./organizationRoutes');



const express = require('express');
const router = express.Router();


// Mount route modules
router.use('/products', productRoutes);
router.use('/organizations', organizationRoutes);


module.exports = router;