const express = require('express');
const router = express.Router();
const {
    getUserPlaylists,
    createPlaylist,
    getPlaylistById,
    addTrackToPlaylist,
    removeTrackFromPlaylist
} = require('../controllers/playlistController');
const { verifyToken } = require('../middleware/authMiddleware');

// Base path: /api/playlists

// GET /api/playlists -> Get My Playlists
router.get('/', verifyToken, getUserPlaylists);

// POST /api/playlists -> Create Playlist
router.post('/', verifyToken, createPlaylist);

// GET /api/playlists/:id -> Get Details + Tracks
router.get('/:id', verifyToken, getPlaylistById);

// POST /api/playlists/:id/tracks -> Add Track
router.post('/:id/tracks', verifyToken, addTrackToPlaylist);

// DELETE /api/playlists/:id/tracks/:trackId -> Remove Track
router.delete('/:id/tracks/:trackId', verifyToken, removeTrackFromPlaylist);

module.exports = router;
