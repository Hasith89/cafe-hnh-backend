const express = require('express');
const router = express.Router();

const {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');

const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

router.post('/', verifyToken, allowRoles('owner', 'admin'), createExpense);
router.get('/', verifyToken, allowRoles('owner', 'admin'), getExpenses);
router.put('/:id', verifyToken, allowRoles('owner'), updateExpense);
router.delete('/:id', verifyToken, allowRoles('owner'), deleteExpense);

module.exports = router;