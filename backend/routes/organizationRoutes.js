/**
 * Organization Routes - All organization-related API endpoints
 * Handles: list organizations, get products by org
 */

const express = require('express');
const router = express.Router();
const {
    getOrganizations,
    getProductsByOrganization
} = require('../controllers/organizationController');

// Organization operations
router.get('/', getOrganizations);
router.get('/:orgId/products', getProductsByOrganization);

module.exports = router;