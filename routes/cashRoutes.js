const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
    openCashSession,
    addCashIn,
    addCashOut,
    closeSession,
    getCashReport
} = require('../controllers/cashController');

router.post('/open', verifyToken, openCashSession);
router.post('/cash-in', verifyToken, addCashIn);
router.post('/cash-out', verifyToken, addCashOut);
router.post('/close', verifyToken, closeSession);
router.get('/report', verifyToken, getCashReport);

module.exports = router;
