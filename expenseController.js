const db = require('../config/db');

const createExpense = (req, res) => {
    const { branch_id, expense_title, expense_category, amount, note, expense_date } = req.body;
    const user_id = req.user.id;

    if (!branch_id || !expense_title || !amount || !expense_date) {
        return res.status(400).json({ message: 'Required fields missing' });
    }

    const sql = `
    INSERT INTO expenses 
    (branch_id, user_id, expense_title, expense_category, amount, note, expense_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    db.query(
        sql,
        [branch_id, user_id, expense_title, expense_category || '', amount, note || '', expense_date],
        (err) => {
            if (err) return res.status(500).json({ message: 'Expense create failed' });
            res.json({ message: 'Expense saved successfully' });
        }
    );
};

const getExpenses = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let sql = `
    SELECT expenses.*, branches.branch_name, users.full_name AS created_by
    FROM expenses
    JOIN branches ON expenses.branch_id = branches.id
    JOIN users ON expenses.user_id = users.id
    WHERE 1 = 1
  `;

    const params = [];

    if (from) {
        sql += ` AND expenses.expense_date >= ?`;
        params.push(from);
    }

    if (to) {
        sql += ` AND expenses.expense_date <= ?`;
        params.push(to);
    }

    if (user.role !== 'owner') {
        sql += ` AND expenses.branch_id = ?`;
        params.push(user.branch_id);
    } else if (branch_id) {
        sql += ` AND expenses.branch_id = ?`;
        params.push(branch_id);
    }

    sql += ` ORDER BY expenses.expense_date DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: 'Expense report failed' });

        const totalExpenses = results.reduce((sum, e) => sum + Number(e.amount), 0);

        res.json({
            totalExpenses,
            totalRecords: results.length,
            expenses: results
        });
    });
};

const updateExpense = (req, res) => {
    const { id } = req.params;
    const { branch_id, expense_title, expense_category, amount, note, expense_date } = req.body;

    const sql = `
    UPDATE expenses
    SET branch_id = ?, expense_title = ?, expense_category = ?, amount = ?, note = ?, expense_date = ?
    WHERE id = ?
  `;

    db.query(
        sql,
        [branch_id, expense_title, expense_category || '', amount, note || '', expense_date, id],
        (err) => {
            if (err) return res.status(500).json({ message: 'Expense update failed' });
            res.json({ message: 'Expense updated' });
        }
    );
};

const deleteExpense = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM expenses WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Expense delete failed' });
        res.json({ message: 'Expense deleted' });
    });
};

module.exports = {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense
};