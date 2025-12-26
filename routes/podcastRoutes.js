const express = require('express');
const router = express.Router();
const { getAllPodcasts, getPodcastById, getPodcastEpisodes } = require('../controllers/podcastController');

// Public Read APIs allowed
router.get('/', getAllPodcasts);
router.get('/:id', getPodcastById);
router.get('/:id/episodes', getPodcastEpisodes);

module.exports = router;
