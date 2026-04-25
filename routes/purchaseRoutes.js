const express = require('express');
const router = express.Router();

const {
    createPurchase,
    getPurchases
} = require('../controllers/purchaseController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.post('/', verifyToken, allowRoles('owner', 'admin'), createPurchase);
router.get('/', verifyToken, allowRoles('owner', 'admin'), getPurchases);

module.exports = router;