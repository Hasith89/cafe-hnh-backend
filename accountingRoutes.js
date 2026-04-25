const express = require('express');
const router = express.Router();

const { getProfitLossReport } = require('../controllers/accountingController');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/profit-loss', verifyToken, allowRoles('owner', 'admin'), getProfitLossReport);

module.exports = router;