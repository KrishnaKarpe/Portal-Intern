const express = require('express');
const router = express.Router();
const { getCompareFileTree, getCompareFileContent, getProxyRevisions } = require('../controllers/compareController');
 
// POST /api/proxy/compare/files
// Returns file tree + diff summary for two revisions
router.post('/files', getCompareFileTree);
 
// POST /api/proxy/compare/file-content
// Returns content of a specific file from both revisions
router.post('/file-content', getCompareFileContent);

router.post('/revisions', getProxyRevisions); 
 
module.exports = router;