const express = require('express');
const router = express.Router();
const { getAllTracks, getTrackById } = require('../controllers/trackController');
router.get('/', getAllTracks);
router.get('/:id', getTrackById);

module.exports = router;
