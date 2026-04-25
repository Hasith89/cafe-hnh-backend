const express = require('express');
const router = express.Router();

const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.get('/', verifyToken, getCategories);
router.post('/', verifyToken, allowRoles('owner', 'admin'), createCategory);
router.put('/:id', verifyToken, allowRoles('owner'), updateCategory);
router.delete('/:id', verifyToken, allowRoles('owner'), deleteCategory);

module.exports = router;