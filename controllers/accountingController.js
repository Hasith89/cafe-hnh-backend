const db = require('../config/db');

const getProfitLossReport = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let salesSql = `
        SELECT COALESCE(SUM(total_amount), 0) AS totalSales
        FROM sales
        WHERE 1 = 1
    `;

    let purchaseSql = `
        SELECT COALESCE(SUM(total_amount), 0) AS totalPurchases
        FROM purchases
        WHERE 1 = 1
    `;

    let expenseSql = `
        SELECT COALESCE(SUM(amount), 0) AS totalExpenses
        FROM expenses
        WHERE 1 = 1
    `;

    let profitSql = `
        SELECT COALESCE(SUM(sale_items.profit), 0) AS totalProfit
        FROM sale_items
        JOIN sales ON sale_items.sale_id = sales.id
        WHERE 1 = 1
    `;

    const salesParams = [];
    const purchaseParams = [];
    const expenseParams = [];
    const profitParams = [];

    if (from) {
        salesSql += ` AND DATE(sale_date) >= ?`;
        purchaseSql += ` AND DATE(purchase_date) >= ?`;
        expenseSql += ` AND expense_date >= ?`;
        profitSql += ` AND DATE(sales.sale_date) >= ?`;

        salesParams.push(from);
        purchaseParams.push(from);
        expenseParams.push(from);
        profitParams.push(from);
    }

    if (to) {
        salesSql += ` AND DATE(sale_date) <= ?`;
        purchaseSql += ` AND DATE(purchase_date) <= ?`;
        expenseSql += ` AND expense_date <= ?`;
        profitSql += ` AND DATE(sales.sale_date) <= ?`;

        salesParams.push(to);
        purchaseParams.push(to);
        expenseParams.push(to);
        profitParams.push(to);
    }

    if (user.role !== 'owner') {
        salesSql += ` AND branch_id = ?`;
        purchaseSql += ` AND branch_id = ?`;
        expenseSql += ` AND branch_id = ?`;
        profitSql += ` AND sales.branch_id = ?`;

        salesParams.push(user.branch_id);
        purchaseParams.push(user.branch_id);
        expenseParams.push(user.branch_id);
        profitParams.push(user.branch_id);
    } else if (branch_id) {
        salesSql += ` AND branch_id = ?`;
        purchaseSql += ` AND branch_id = ?`;
        expenseSql += ` AND branch_id = ?`;
        profitSql += ` AND sales.branch_id = ?`;

        salesParams.push(branch_id);
        purchaseParams.push(branch_id);
        expenseParams.push(branch_id);
        profitParams.push(branch_id);
    }

    db.query(salesSql, salesParams, (err, salesResult) => {
        if (err) {
            console.error('Sales accounting error:', err);
            return res.status(500).json({ message: 'Sales calculation failed.' });
        }

        db.query(purchaseSql, purchaseParams, (err, purchaseResult) => {
            if (err) {
                console.error('Purchase accounting error:', err);
                return res.status(500).json({ message: 'Purchase calculation failed.' });
            }

            db.query(expenseSql, expenseParams, (err, expenseResult) => {
                if (err) {
                    console.error('Expense accounting error:', err);
                    return res.status(500).json({ message: 'Expense calculation failed.' });
                }

                db.query(profitSql, profitParams, (err, profitResult) => {
                    if (err) {
                        console.error('Profit accounting error:', err);
                        return res.status(500).json({ message: 'Profit calculation failed.' });
                    }

                    const totalSales = Number(salesResult[0].totalSales || 0);
                    const totalPurchases = Number(purchaseResult[0].totalPurchases || 0);
                    const totalExpenses = Number(expenseResult[0].totalExpenses || 0);

                    // Correct profit: sale item profit only
                    const grossProfit = Number(profitResult[0].totalProfit || 0);

                    // Net profit after expenses only
                    // Purchases are reported separately, not deducted from profit here
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
    });
};

const getProductProfitReport = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let sql = `
        SELECT 
            products.product_name,
            products.sku,
            SUM(sale_items.qty) AS total_qty,
            SUM(sale_items.line_total) AS total_sales,
            SUM(sale_items.profit) AS total_profit,
            AVG(sale_items.unit_price) AS avg_selling_price,
            AVG(sale_items.cost_price) AS avg_cost_price
        FROM sale_items
        JOIN sales ON sale_items.sale_id = sales.id
        JOIN products ON sale_items.product_id = products.id
        WHERE 1 = 1
    `;

    const params = [];

    if (from) {
        sql += ` AND DATE(sales.sale_date) >= ?`;
        params.push(from);
    }

    if (to) {
        sql += ` AND DATE(sales.sale_date) <= ?`;
        params.push(to);
    }

    if (user.role !== 'owner') {
        sql += ` AND sales.branch_id = ?`;
        params.push(user.branch_id);
    } else if (branch_id) {
        sql += ` AND sales.branch_id = ?`;
        params.push(branch_id);
    }

    sql += `
        GROUP BY products.id, products.product_name, products.sku
        ORDER BY total_profit DESC
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Product profit report error:', err);
            return res.status(500).json({ message: 'Product profit report failed.' });
        }

        res.json(results);
    });
};

module.exports = {
    getProfitLossReport,
    getProductProfitReport
};
