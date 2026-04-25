const express = require('express');
const router = express.Router();

const {
    getInventory,
    upsertInventory,
    getLowStock
} = require('../controllers/inventoryController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, getInventory);
router.get('/low-stock', verifyToken, getLowStock);
router.post('/', verifyToken, allowRoles('owner', 'admin'), upsertInventory);

module.exports = router;