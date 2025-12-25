const express = require('express');
const router = express.Router();
const multer = require('multer');
const { addSong, getAllSongs, deleteSong } = require('../controller/songs.controller');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

router.post('/add', upload.fields([{ name: 'song' }, { name: 'image' }]), addSong);
router.get('/all', getAllSongs);
router.delete('/delete/:id', deleteSong);

module.exports = router;
