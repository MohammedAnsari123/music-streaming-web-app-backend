const express = require('express');
const router = express.Router();
const { resolveAudio } = require('../controllers/resolveController');

router.post('/', resolveAudio);

module.exports = router;
