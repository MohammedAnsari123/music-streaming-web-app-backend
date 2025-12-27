const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

// GET /api/search?q=...
router.get('/', globalSearch);

module.exports = router;
