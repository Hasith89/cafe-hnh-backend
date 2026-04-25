const express = require('express');
const router = express.Router();

const {
    createSale,
    getSalesReport,
    getSaleDetails
} = require('../controllers/salesController');

const verifyToken = require('../middleware/authMiddleware');

router.post('/', verifyToken, createSale);
router.get('/report', verifyToken, getSalesReport);
router.get('/:id/items', verifyToken, getSaleDetails);

module.exports = router;