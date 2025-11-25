const {
  fetchProxyFromOrg,    
  sendProxyToGitlab,
  fetchLatestRevision,
  fetchProxyDeployments,
  fetchProductFromOrg,
  pushProductToGitlab,
} = require('../services/apiService');


/**
 * Clone a proxy from source organization to gitlab
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
      commitmessage,
    } = req.body;

    if (!sourceOrg || !sourceToken || !proxyName || !revision || !gitToken  ) {
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
    const gitResult = await sendProxyToGitlab(proxyName, gitToken, proxyBundle, commitmessage);

    return res.status(200).json({
      success: true,
      message: `Proxy ${proxyName} sent successfully`,
      username: gitResult.username,
      projectUrl: gitResult.gitlabProjectUrl,
      branch: "dev",
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

/**
 * Get the latest revision number of a proxy in the source organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLatestRevision = async (req, res) => {
  const { sourceOrg, proxyName, sourceToken } = req.body;

  try {
    const latestRevision = await fetchLatestRevision(sourceOrg, proxyName, sourceToken);
    res.status(200).json({
      success: true,
      latestRevision
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      details: error.details || null
    });
  }
};

/**
 * Get deployment status of a proxy in the source organization
 * @param {Object} req
 * @param {Object} res
 */
const getDeploymentStatus = async (req, res) => {
  const { sourceOrg, proxyName, sourceToken } = req.body;

  if (!sourceOrg || !proxyName || !sourceToken) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  try {
    const deployments = await fetchProxyDeployments(sourceOrg, proxyName, sourceToken);
    return res.status(200).json({ success: true, deployments });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch deployment status',
      details: error.details || null,
    });
  }
};

/**
 * Clone a product from source organization to gitlab
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const gitProduct = async (req, res) => {
  console.log('Clone request received:', req.body);

  try {
    const {
      sourceOrg,
      sourceToken,
      productName,
      gitToken,
      environments
    } = req.body;

    if (!sourceOrg || !sourceToken || !productName || !gitToken ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Step 1: Fetch product from source organization
    console.log('Step 1: Fetching product from source...');
    const productData = await fetchProductFromOrg(sourceOrg, productName, sourceToken);

    if (!productData) {
      console.log('Product not found in source organization');
      return res.status(404).json({
        success: false,
        message: 'Product not found in source organization'
      });
    }    
    
    // Step 2: Import product to git
    console.log('Step 2: importing product to git...');
    const gitResult2 = await pushProductToGitlab(productName, gitToken, productData, environments);

    return res.status(200).json({
      success: true,
      message: `Product ${productName} sent successfully`,
      username: gitResult2.username,
      projectUrl: gitResult2.gitlabProjectUrl,
      branch: "dev",
      data: gitResult2
    });


  } catch (error) {
    console.error('Error moving product:', error);
    console.error('Error details:', error.details);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to move product',
      error: error.details || undefined
    });
  }
};




module.exports = {
  gitProxy,
  getLatestRevision,
  getDeploymentStatus,
  gitProduct,
};