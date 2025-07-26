/**
 * Main Router - Central routing configuration
 * All route modules are imported and configured here
 */

const express = require('express');
const router = express.Router();

// Import route modules
const productRoutes = require('./productRoutes');
const organizationRoutes = require('./organizationRoutes');
const proxyRoutes = require('./proxyRoutes');

// Mount route modules
router.use('/products', productRoutes);
router.use('/organizations', organizationRoutes);
router.use('/proxy', proxyRoutes);
module.exports = router;