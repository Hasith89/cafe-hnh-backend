const express = require('express');
const router = express.Router();

const { getBranches, createBranch } = require('../controllers/branchController');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, getBranches);
router.post('/', verifyToken, allowRoles('owner'), createBranch);

module.exports = router;