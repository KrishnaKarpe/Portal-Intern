/**
 * Organization Service - Organization operations
 * Handles: list organizations, get products by org
 */

const { products } = require('../data/mockData');

/**
 * Get list of organizations
 */
const getOrganizationsService = () => {
    return [
        { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
        { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
    ];
};

/**
 * Get products by organization ID (fallback using mock data)
 */
const getProductsByOrganizationService = (orgId) => {
    const filteredProducts = products.filter(
        product => product.orgId === parseInt(orgId, 10)
    );
    return filteredProducts;
};

module.exports = {
    getOrganizationsService,
    getProductsByOrganizationService
};