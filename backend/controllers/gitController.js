const {
  fetchProxyFromOrg,    
  sendProxyToGitlab
} = require('../services/apiService');


/**
 * Clone a product from source organization to target organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const gitProxy = async (req, res) => {
  console.log('Clone request received:', req.body);

  try {
    const {
      sourceOrg,
      sourceToken,
      proxyName,
      revision,
      gitToken,
      branch
    } = req.body;

    if (!sourceOrg || !sourceToken || !proxyName || !revision || !gitToken || !branch) {
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
    }    
    
    // Step 2: Import proxy to git
    console.log('Step 2: importing proxy to git...');
    const gitResult = await sendProxyToGitlab(proxyName, gitToken, proxyBundle, branch);

    return res.status(200).json({
      success: true,
      message: `Proxy ${proxyName} sent successfully`,
      data: gitResult
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
  gitProxy
};