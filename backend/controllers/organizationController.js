/**
 * Organization Controller - Handles organization-specific operations
 */

const {
    getOrganizationsService,
    getProductsByOrganizationService
} = require('../services/organizationService');

const {
    sendSuccess,
    sendError
} = require('../utils/responseHandler');

/**
 * Get list of organizations
 */
const getOrganizations = (req, res) => {
    try {
        const orgs = getOrganizationsService();
        return sendSuccess(res, orgs);
    } catch (error) {
        return sendError(res, error, 'Failed to fetch organizations');
    }
};

/**
 * Get products by organization ID (fallback using mock data)
 */
const getProductsByOrganization = (req, res) => {
    try {
        const { orgId } = req.params;
        const filteredProducts = getProductsByOrganizationService(orgId);
        return sendSuccess(res, filteredProducts);
    } catch (error) {
        return sendError(res, error, 'Failed to fetch products');
    }
};

module.exports = {
    getOrganizations,
    getProductsByOrganization
};