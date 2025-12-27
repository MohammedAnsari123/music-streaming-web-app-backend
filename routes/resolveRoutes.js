const express = require('express');
const router = express.Router();
const { resolveAudio } = require('../controllers/resolveController');

// POST /api/resolve
router.post('/', resolveAudio);

module.exports = router;
