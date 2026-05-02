const db = require('../config/db');

// ================= GENERATE INVOICE =================
const generateInvoice = () => {
    return 'INV-' + Date.now();
};

// ================= CREATE SALE =================
const createSale = (req, res) => {
    const { items, payment_method } = req.body;
    const { branch_id, id: cashier_id } = req.user;

    if (!branch_id) {
        return res.status(400).json({
            message: 'Branch not assigned. Please login properly.'
        });
    }

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items in sale' });
    }

    const invoice_no = generateInvoice();

    let total_amount = 0;
    items.forEach(item => {
        total_amount += Number(item.qty) * Number(item.unit_price);
    });

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: 'Transaction error' });

        const saleSql = `
            INSERT INTO sales (invoice_no, branch_id, cashier_id, total_amount, payment_method)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            saleSql,
            [invoice_no, branch_id, cashier_id, total_amount, payment_method || 'cash'],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return db.rollback(() =>
                        res.status(500).json({ message: 'Sale insert failed' })
                    );
                }

                const sale_id = result.insertId;

                const itemValues = items.map(item => [
                    sale_id,
                    item.product_id,
                    item.qty,
                    item.unit_price,
                    Number(item.qty) * Number(item.unit_price)
                ]);

                db.query(
                    `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total) VALUES ?`,
                    [itemValues],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return db.rollback(() =>
                                res.status(500).json({ message: 'Items insert failed' })
                            );
                        }

                        // ================= UPDATE INVENTORY =================
                        const updatePromises = items.map(item => {
                            return new Promise((resolve, reject) => {
                                db.query(
                                    `UPDATE inventory 
                                     SET stock_qty = stock_qty - ? 
                                     WHERE branch_id = ? AND product_id = ?`,
                                    [item.qty, branch_id, item.product_id],
                                    (err) => err ? reject(err) : resolve()
                                );
                            });
                        });

                        Promise.all(updatePromises)
                            .then(() => {

                                // ================= CASH SESSION UPDATE =================
                                db.query(`
                                    UPDATE cash_sessions 
                                    SET total_sales = total_sales + ?
                                    WHERE branch_id = ? AND status = 'open'
                                `, [total_amount, branch_id], (cashErr) => {

                                    if (cashErr) {
                                        console.error('Cash update error:', cashErr);
                                        return db.rollback(() =>
                                            res.status(500).json({ message: 'Cash update failed' })
                                        );
                                    }

                                    // ================= COMMIT =================
                                    db.commit(err => {
                                        if (err) {
                                            return db.rollback(() =>
                                                res.status(500).json({ message: 'Commit failed' })
                                            );
                                        }

                                        res.json({
                                            message: 'Sale completed',
                                            invoice_no,
                                            total_amount
                                        });
                                    });

                                });

                            })
                            .catch(err => {
                                console.error(err);
                                db.rollback(() =>
                                    res.status(500).json({ message: 'Inventory update failed' })
                                );
                            });
                    }
                );
            }
        );
    });
};

// ================= SALES REPORT =================
const getSalesReport = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let sql = `
        SELECT 
            sales.id,
            sales.invoice_no,
            sales.total_amount,
            sales.payment_method,
            sales.sale_date,
            branches.branch_name,
            users.full_name AS cashier_name
        FROM sales
        JOIN branches ON sales.branch_id = branches.id
        JOIN users ON sales.cashier_id = users.id
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

    sql += ` ORDER BY sales.sale_date DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sales report failed' });
        }

        const totalSales = results.reduce((sum, s) => sum + Number(s.total_amount), 0);

        res.json({
            totalSales,
            totalRecords: results.length,
            sales: results
        });
    });
};

module.exports = {
    createSale,
    getSalesReport
};
