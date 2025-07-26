/**
 * Proxy Routes - All proxy-related API endpoints
 * Handles: move, list operations
 */

const express = require('express');
const router = express.Router();
const {
    moveProxy,
    getAllProxiesFromOrganization,
    getEnvironmentsFromOrganization
} = require('../controllers/ProxyController');

// Proxy operations
router.post('/move', moveProxy);

// Proxy listing
router.get('/by-organization/:orgId', getAllProxiesFromOrganization);

// Environment listing
router.get('/environments/:orgId', getEnvironmentsFromOrganization);

module.exports = router;