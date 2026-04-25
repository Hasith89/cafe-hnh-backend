const express = require('express');
const router = express.Router();

const { getUsers, createUser } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, allowRoles('owner', 'admin'), getUsers);
router.post('/', verifyToken, allowRoles('owner'), createUser);

module.exports = router;