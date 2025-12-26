const express = require('express');
const router = express.Router();
const { saveProgress, getRecentlyPlayed } = require('../controllers/recentlyPlayedController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes here are protected
router.use(verifyToken);

router.post('/', saveProgress);
router.get('/', getRecentlyPlayed);

module.exports = router;
