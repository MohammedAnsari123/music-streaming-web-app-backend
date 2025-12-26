const express = require('express');
const router = express.Router();
const { getAllTracks, getTrackById } = require('../controllers/trackController');
// const verifyToken = require('../middleware/auth.middleware'); // Uncomment to protect

// Public endpoints as per requirements "GET /tracks" might be public or protected depending on interpretation.
// Requirement 5) says "Protected APIs require valid JWT", "Public APIs explicitly marked".
// Usually GET tracks is public for browsing, but let's stick to simple first.
router.get('/', getAllTracks);
router.get('/:id', getTrackById);

module.exports = router;
