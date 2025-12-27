const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getFavorites, toggleFavorite, checkFavorite } = require('../controllers/favoriteController');

router.use(verifyToken);

router.get('/', getFavorites);
router.post('/toggle', toggleFavorite);
router.get('/check/:id', checkFavorite);

module.exports = router;
