const express = require('express');
const router = express.Router();
const { 
    gitProxy,
    getLatestRevision, 
    getDeploymentStatus,
    gitProduct,
} = require('../controllers/gitController');

router.post('/lab', gitProxy);
router.post('/latest-revision', getLatestRevision);
router.post('/deployments', getDeploymentStatus);
router.post('/gitproduct', gitProduct);

module.exports = router;