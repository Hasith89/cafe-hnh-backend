const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
    getProfitLossReport,
    getProductProfitReport
} = require('../controllers/accountingController');

router.get('/profit-loss', verifyToken, allowRoles('owner', 'admin'), getProfitLossReport);
router.get('/product-profit', verifyToken, allowRoles('owner', 'admin'), getProductProfitReport);

module.exports = router;
