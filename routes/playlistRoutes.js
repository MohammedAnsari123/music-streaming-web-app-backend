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

router.get('/', verifyToken, getUserPlaylists);
router.post('/', verifyToken, createPlaylist);
router.get('/:id', verifyToken, getPlaylistById);
router.post('/:id/tracks', verifyToken, addTrackToPlaylist);
router.delete('/:id/tracks/:trackId', verifyToken, removeTrackFromPlaylist);

module.exports = router;
