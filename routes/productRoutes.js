const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, allowRoles('owner', 'admin'), createProduct);
router.put('/:id', verifyToken, allowRoles('owner', 'admin'), updateProduct);
router.delete('/:id', verifyToken, allowRoles('owner'), deleteProduct);

module.exports = router;
