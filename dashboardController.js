const db = require('../config/db');

const getDashboardSummary = (req, res) => {
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [];

    if (user.role !== 'owner') {
        branchCondition = ' AND branch_id = ?';
        params.push(user.branch_id);
    }

    const salesSql = `
    SELECT COALESCE(SUM(total_amount), 0) AS todaySales, COUNT(*) AS todayInvoices
    FROM sales
    WHERE DATE(sale_date) = ? ${branchCondition}
  `;

    const purchaseSql = `
    SELECT COALESCE(SUM(total_amount), 0) AS todayPurchases
    FROM purchases
    WHERE DATE(purchase_date) = ? ${branchCondition}
  `;

    const expenseSql = `
    SELECT COALESCE(SUM(amount), 0) AS todayExpenses
    FROM expenses
    WHERE expense_date = ? ${branchCondition}
  `;

    const lowStockSql = `
    SELECT COUNT(*) AS lowStockCount
    FROM inventory
    WHERE stock_qty <= reorder_level ${branchCondition}
  `;

    db.query(salesSql, [today, ...params], (err, salesResult) => {
        if (err) return res.status(500).json({ message: 'Sales summary failed' });

        db.query(purchaseSql, [today, ...params], (err, purchaseResult) => {
            if (err) return res.status(500).json({ message: 'Purchase summary failed' });

            db.query(expenseSql, [today, ...params], (err, expenseResult) => {
                if (err) return res.status(500).json({ message: 'Expense summary failed' });

                db.query(lowStockSql, params, (err, lowStockResult) => {
                    if (err) return res.status(500).json({ message: 'Low stock summary failed' });

                    res.json({
                        todaySales: Number(salesResult[0].todaySales),
                        todayInvoices: salesResult[0].todayInvoices,
                        todayPurchases: Number(purchaseResult[0].todayPurchases),
                        todayExpenses: Number(expenseResult[0].todayExpenses),
                        lowStockCount: lowStockResult[0].lowStockCount,
                        estimatedProfit:
                            Number(salesResult[0].todaySales) -
                            Number(purchaseResult[0].todayPurchases) -
                            Number(expenseResult[0].todayExpenses)
                    });
                });
            });
        });
    });
};

const getDashboardCharts = (req, res) => {
    const user = req.user;

    let branchCondition = '';
    const params = [];

    if (user.role !== 'owner') {
        branchCondition = ' AND branch_id = ?';
        params.push(user.branch_id);
    }

    const salesChartSql = `
    SELECT DATE(sale_date) AS report_date, COALESCE(SUM(total_amount), 0) AS total
    FROM sales
    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    ${branchCondition}
    GROUP BY DATE(sale_date)
    ORDER BY report_date
  `;

    const expensesChartSql = `
    SELECT expense_date AS report_date, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    ${branchCondition}
    GROUP BY expense_date
    ORDER BY report_date
  `;

    const topProductsSql = `
    SELECT 
      products.product_name,
      COALESCE(SUM(sale_items.qty), 0) AS total_qty
    FROM sale_items
    JOIN products ON sale_items.product_id = products.id
    JOIN sales ON sale_items.sale_id = sales.id
    WHERE sales.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ${branchCondition.replace('branch_id', 'sales.branch_id')}
    GROUP BY products.id, products.product_name
    ORDER BY total_qty DESC
    LIMIT 5
  `;

    db.query(salesChartSql, params, (err, salesRows) => {
        if (err) return res.status(500).json({ message: 'Sales chart failed' });

        db.query(expensesChartSql, params, (err, expenseRows) => {
            if (err) return res.status(500).json({ message: 'Expense chart failed' });

            db.query(topProductsSql, params, (err, productRows) => {
                if (err) return res.status(500).json({ message: 'Top products chart failed' });

                res.json({
                    sales: salesRows,
                    expenses: expenseRows,
                    topProducts: productRows
                });
            });
        });
    });
};

module.exports = {
    getDashboardSummary,
    getDashboardCharts
};