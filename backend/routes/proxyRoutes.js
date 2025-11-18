const express = require('express');
const router = express.Router();
const {
    cloneProxy,
    getAllProxies
} = require('../controllers/ProxyController');
//const { validateCloneProxy } = require('../middleware/validation');

//operations
router.post('/move', cloneProxy);
router.post('/deploy', deployproxy);    
router.get('/getAllProxies', getAllProxies);



module.exports = router;


