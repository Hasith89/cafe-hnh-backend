const express = require('express');
const router = express.Router();

const {
    getSuppliers,
    createSupplier
} = require('../controllers/supplierController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, getSuppliers);
router.post('/', verifyToken, allowRoles('owner', 'admin'), createSupplier);

module.exports = router;