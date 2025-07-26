const express = require('express');
const router = express.Router();
const {
    cloneProxy,
} = require('../controllers/ProxyController');
//const { validateCloneProxy } = require('../middleware/validation');

// Product operations
router.post('/move', cloneProxy);



module.exports = router;


