const express = require('express');
const router = express.Router();
const { loginUser, getProfile } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/profile', verifyToken, getProfile);

module.exports = router;