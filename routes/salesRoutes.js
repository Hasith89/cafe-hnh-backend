const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
    createSale,
    getSalesReport,
    getSaleItems
} = require('../controllers/salesController');

router.post('/', verifyToken, createSale);
router.get('/report', verifyToken, getSalesReport);
router.get('/:id/items', verifyToken, getSaleItems);

module.exports = router;
