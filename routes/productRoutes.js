const express = require('express');
const router = express.Router();

const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, allowRoles('owner', 'admin'), createProduct);
router.put('/:id', verifyToken, allowRoles('owner'), updateProduct);
router.delete('/:id', verifyToken, allowRoles('owner'), deleteProduct);

module.exports = router;