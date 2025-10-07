const express = require('express');
const router = express.Router();
const { 
    gitProxy, 
} = require('../controllers/gitController');

router.post('/lab', gitProxy);

module.exports = router;