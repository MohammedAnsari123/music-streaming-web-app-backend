const express = require('express');
const router = express.Router();
const { getAllPodcasts, getPodcastById, getPodcastEpisodes } = require('../controllers/podcastController');

router.get('/', getAllPodcasts);
router.get('/:id', getPodcastById);
router.get('/:id/episodes', getPodcastEpisodes);

module.exports = router;
