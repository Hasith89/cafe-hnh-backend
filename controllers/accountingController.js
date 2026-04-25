const db = require('../config/db');

const getProfitLossReport = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let branchCondition = '';
    const paramsSales = [];
    const paramsPurchases = [];
    const paramsExpenses = [];

    if (from) {
        paramsSales.push(from);
        paramsPurchases.push(from);
        paramsExpenses.push(from);
    }

    if (to) {
        paramsSales.push(to);
        paramsPurchases.push(to);
        paramsExpenses.push(to);
    }

    if (user.role !== 'owner') {
        branchCondition = ' AND branch_id = ?';
        paramsSales.push(user.branch_id);
        paramsPurchases.push(user.branch_id);
        paramsExpenses.push(user.branch_id);
    } else if (branch_id) {
        branchCondition = ' AND branch_id = ?';
        paramsSales.push(branch_id);
        paramsPurchases.push(branch_id);
        paramsExpenses.push(branch_id);
    }

    let salesSql = `
    SELECT COALESCE(SUM(total_amount), 0) AS totalSales
    FROM sales
    WHERE 1=1
  `;

    let purchaseSql = `
    SELECT COALESCE(SUM(total_amount), 0) AS totalPurchases
    FROM purchases
    WHERE 1=1
  `;

    let expenseSql = `
    SELECT COALESCE(SUM(amount), 0) AS totalExpenses
    FROM expenses
    WHERE 1=1
  `;

    if (from) {
        salesSql += ' AND DATE(sale_date) >= ?';
        purchaseSql += ' AND DATE(purchase_date) >= ?';
        expenseSql += ' AND expense_date >= ?';
    }

    if (to) {
        salesSql += ' AND DATE(sale_date) <= ?';
        purchaseSql += ' AND DATE(purchase_date) <= ?';
        expenseSql += ' AND expense_date <= ?';
    }

    salesSql += branchCondition;
    purchaseSql += branchCondition;
    expenseSql += branchCondition;

    db.query(salesSql, paramsSales, (err, salesResult) => {
        if (err) return res.status(500).json({ message: 'Sales calculation failed' });

        db.query(purchaseSql, paramsPurchases, (err, purchaseResult) => {
            if (err) return res.status(500).json({ message: 'Purchase calculation failed' });

            db.query(expenseSql, paramsExpenses, (err, expenseResult) => {
                if (err) return res.status(500).json({ message: 'Expense calculation failed' });

                const totalSales = Number(salesResult[0].totalSales);
                const totalPurchases = Number(purchaseResult[0].totalPurchases);
                const totalExpenses = Number(expenseResult[0].totalExpenses);

                const grossProfit = totalSales - totalPurchases;
                const netProfit = grossProfit - totalExpenses;

                res.json({
                    totalSales,
                    totalPurchases,
                    totalExpenses,
                    grossProfit,
                    netProfit
                });
            });
        });
    });
};

module.exports = {
    getProfitLossReport
};