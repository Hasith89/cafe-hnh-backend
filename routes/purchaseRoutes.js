const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
    createPurchase,
    getPurchases,
    getPurchaseItems
} = require('../controllers/purchaseController');

router.post('/', verifyToken, createPurchase);
router.get('/', verifyToken, getPurchases);
router.get('/:id/items', verifyToken, getPurchaseItems);

module.exports = router;
