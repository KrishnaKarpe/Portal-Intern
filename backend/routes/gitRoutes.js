const express = require('express');
const router = express.Router();
const { 
    gitProxy,
    getLatestRevision, 
    getDeploymentStatus,
} = require('../controllers/gitController');

router.post('/lab', gitProxy);
router.post('/latest-revision', getLatestRevision);
router.post('/deployments', getDeploymentStatus);

module.exports = router;