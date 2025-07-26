const {
  fetchProxyFromOrg,    
  SendProxyToOrg
} = require('../services/apiService');


/**
 * Clone a product from source organization to target organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cloneProxy = async (req, res) => {
  console.log('Clone request received:', req.body);

  try {
    const {
      sourceOrg,
      targetOrg,
      sourceToken,
      targetToken,
      proxyName,
      newProxyName,
      revision,
    } = req.body;

    if (!sourceOrg || !targetOrg || !sourceToken || !targetToken || !proxyName || !newProxyName || !revision) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Step 1: Fetch proxy from source organization
    console.log('Step 1: Fetching proxy from source...');
    const proxyBundle = await fetchProxyFromOrg(sourceOrg, proxyName, sourceToken, revision);

    if (!proxyBundle) {
      console.log('Proxy not found in source organization');
      return res.status(404).json({
        success: false,
        message: 'Proxy not found in source organization'
      });
    }    // Step 2: Import proxy to target organization
    console.log('Step 2: importing proxy in target org...');
    const importResult = await SendProxyToOrg(targetOrg, newProxyName, targetToken, proxyBundle);

    return res.status(200).json({
      success: true,
      message: `Proxy ${proxyName} cloned successfully as ${newProxyName} in ${targetOrg}`,
      data: importResult
    });


  } catch (error) {
    console.error('Error moving proxy:', error);
    console.error('Error details:', error.details);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to move proxy',
      error: error.details || undefined
    });
  }
};



module.exports = {
  cloneProxy
};