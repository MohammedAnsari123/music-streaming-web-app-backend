const express = require('express');
const router = express.Router();
const { getGenres } = require('../controllers/trackController');

router.get('/', getGenres);

module.exports = router;
