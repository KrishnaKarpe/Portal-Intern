/**
 * Proxy Controller - Handles proxy-specific operations
 */

const {
  moveProxyService,
  getAllProxiesService,
  getOrganizationEnvironments
} = require('../services/proxyService');

const {
  sendSuccess,
  sendError,
  sendValidationError
} = require('../utils/responseHandler');

/**
 * Move a proxy from source organization to target organization
 */
const moveProxy = async (req, res) => {
  console.log('Proxy move request received:', req.body);

  try {
    const {
      sourceOrg,
      targetOrg,
      sourceToken,
      targetToken,
      proxyName,
      newProxyName,
      revision,
      environments
    } = req.body;

    // Validation
    if (!sourceOrg || !targetOrg) {
      return sendValidationError(res, 'Both source and target organizations are required');
    }

    if (!sourceToken || !targetToken) {
      return sendValidationError(res, 'Both source and target tokens are required');
    }

    if (!proxyName) {
      return sendValidationError(res, 'Proxy name is required');
    }

    if (!newProxyName) {
      return sendValidationError(res, 'New proxy name is required');
    }

    // Same org validation with proxy name check
    if (sourceOrg === targetOrg && proxyName === newProxyName) {
      return sendValidationError(res, 'When using the same organization, proxy names must be different');
    }

    console.log('Validation passed:', {
      sameOrg: sourceOrg === targetOrg,
      operation: sourceOrg === targetOrg ? 'duplicate' : 'move'
    });

    // Sends all data to moveProxyService
    const result = await moveProxyService({
      sourceOrg,
      targetOrg,
      sourceToken,
      targetToken,
      proxyName,
      newProxyName,
      revision: revision || 'latest',
      environments: environments || []
    });

    const message = sourceOrg === targetOrg
      ? 'Proxy duplicated successfully within organization'
      : 'Proxy moved successfully between organizations';

    return sendSuccess(res, result, message, 201);

  } catch (error) {
    console.error('Error moving proxy:', error);
    console.error('Error details:', error.details);
    return sendError(res, error, 'Failed to move proxy');
  }
};

/**
 * Get all proxies from an organization
 */
const getAllProxiesFromOrganization = async (req, res) => {
  console.log('Get all proxies request received:', req.query);

  try {
    const { orgId } = req.params;
    const { token } = req.query;

    if (!token) {
      return sendValidationError(res, 'Authentication token is required');
    }

    const result = await getAllProxiesService(orgId, token);

    //     ADD: Debug logging to see what service returns
    console.log('Service result:', result);
    console.log('Service result structure:', {
      hasProxies: !!result.proxies,
      proxiesType: typeof result.proxies,
      isArray: Array.isArray(result.proxies),
      proxiesLength: result.proxies?.length || 0
    });

    //     FIX: Make sure we're sending the right data structure
    return sendSuccess(res, result.proxies, result.message, 200);
  } catch (error) {
    console.error('Error fetching proxies:', error);
    console.error('Error details:', error.details);
    return sendError(res, error, 'Failed to fetch proxies');
  }
};

/**
 * Get environments from an organization
 */
const getEnvironmentsFromOrganization = async (req, res) => {
  console.log('Get environments request received:', req.params, req.query);

  try {
    const { orgId } = req.params;
    const { token } = req.query;

    if (!token) {
      return sendValidationError(res, 'Authentication token is required');
    }

    const environments = await getOrganizationEnvironments(orgId, token);

    const result = {
      environments,
      total: environments.length,
      organization: orgId
    };

    return sendSuccess(res, environments, `Found ${environments.length} environments`, 200);
  } catch (error) {
    console.error('Error fetching environments:', error);
    console.error('Error details:', error.details);
    return sendError(res, error, 'Failed to fetch environments');
  }
};

module.exports = {
  moveProxy,
  getAllProxiesFromOrganization,
  getEnvironmentsFromOrganization  //     ADD this
};