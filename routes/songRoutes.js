const express = require('express');
const router = express.Router();
const multer = require('multer');
const { addSong, getAllSongs, deleteSong } = require('../controllers/songController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

router.post('/add', verifyAdmin, upload.fields([{ name: 'song' }, { name: 'image' }]), addSong);
router.get('/all', getAllSongs);
router.delete('/delete/:id', verifyAdmin, deleteSong);

module.exports = router;
