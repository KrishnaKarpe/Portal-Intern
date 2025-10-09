const express = require('express');
const router = express.Router();
const { 
    gitProxy,
    getLatestRevision, 
} = require('../controllers/gitController');

router.post('/lab', gitProxy);
router.post('/latest-revision', getLatestRevision);

module.exports = router;