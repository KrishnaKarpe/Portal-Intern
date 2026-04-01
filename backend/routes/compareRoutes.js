const express = require('express');
const router = express.Router();
const { compareProxiesController } = require('../controllers/compareController');

router.post('/proxies', compareProxiesController);

module.exports = router;