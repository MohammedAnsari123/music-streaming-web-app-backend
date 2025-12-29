const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { addSong } = require('../controllers/songController');
const { addPodcast, addEpisode, deletePodcast, deleteEpisode } = require('../controllers/podcastController');
const { getDashboardStats, loginAdmin, registerAdmin, getAllUsers } = require('../controllers/adminController');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// PUBLIC Admin Routes
router.post('/login', loginAdmin);
router.post('/register', registerAdmin);

// PROTECTED Admin Routes
router.use(verifyAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);

router.post('/tracks', upload.fields([{ name: 'song', maxCount: 1 }, { name: 'image', maxCount: 1 }]), addSong);
router.post('/podcasts', upload.fields([{ name: 'image', maxCount: 1 }]), addPodcast);
router.post('/episodes', upload.fields([{ name: 'audio', maxCount: 1 }]), addEpisode);

router.delete('/podcasts/:id', deletePodcast);
router.delete('/episodes/:id', deleteEpisode);

module.exports = router;
