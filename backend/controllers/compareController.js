const { fetchProxyFromOrg, compareProxies } = require('../services/apiService');

const compareProxiesController = async (req, res) => {
  try {
    const { sourceOrg, proxyName, revision1, revision2, token } = req.body;

    // Validate required fields
    if (!sourceOrg || !proxyName || !revision1 || !revision2 || !token) {
      return res.status(400).json({
        error: 'Missing required fields: sourceOrg, proxyName, revision1, revision2, token'
      });
    }

    console.log(`Comparing proxy ${proxyName} revisions ${revision1} vs ${revision2} in org ${sourceOrg}`);

    // Fetch proxy data for each revision
    const proxy1 = await fetchProxyFromOrg(sourceOrg, proxyName, token, revision1);
    const proxy2 = await fetchProxyFromOrg(sourceOrg, proxyName, token, revision2);

    // Compare the proxies
    const comparisonReport = await compareProxies(proxy1, proxy2);

    // Return the comparison report
    res.json(comparisonReport);
  } catch (error) {
    console.error('Error comparing proxies:', error);
    
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to compare proxies';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.details || null
    });
  }
};

module.exports = {
  compareProxiesController,
};