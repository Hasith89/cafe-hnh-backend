const express = require('express');
const router = express.Router();

const {
    getDashboardSummary,
    getDashboardCharts
} = require('../controllers/dashboardController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/summary', verifyToken, getDashboardSummary);
router.get('/charts', verifyToken, getDashboardCharts);

module.exports = router;