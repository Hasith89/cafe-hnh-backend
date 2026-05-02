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
            message: 'Branch not assigned. Please login as cashier/admin assigned to an outlet.'
        });
    }

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items in sale' });
    }

    const invoice_no = generateInvoice();
    const productIds = items.map(item => item.product_id);

    db.beginTransaction(err => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ message: 'Transaction error' });
        }

        // Get current product cost/buying price
        db.query(
            `SELECT id, buying_price FROM products WHERE id IN (?)`,
            [productIds],
            (err, products) => {
                if (err) {
                    console.error('Product cost fetch error:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Product cost fetch failed' });
                    });
                }

                let total_amount = 0;

                const itemValues = items.map(item => {
                    const product = products.find(p => Number(p.id) === Number(item.product_id));

                    const qty = Number(item.qty);
                    const unit_price = Number(item.unit_price);
                    const cost_price = Number(product?.buying_price || 0);

                    const line_total = qty * unit_price;
                    const profit = (unit_price - cost_price) * qty;

                    total_amount += line_total;

                    return [
                        item.product_id,
                        qty,
                        unit_price,
                        cost_price,
                        line_total,
                        profit
                    ];
                });

                const saleSql = `
                    INSERT INTO sales 
                    (invoice_no, branch_id, cashier_id, total_amount, payment_method)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.query(
                    saleSql,
                    [invoice_no, branch_id, cashier_id, total_amount, payment_method || 'cash'],
                    (err, saleResult) => {
                        if (err) {
                            console.error('Sale insert error:', err);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Sale insert failed' });
                            });
                        }

                        const sale_id = saleResult.insertId;

                        const finalItemValues = itemValues.map(item => [
                            sale_id,
                            ...item
                        ]);

                        const itemSql = `
                            INSERT INTO sale_items
                            (sale_id, product_id, qty, unit_price, cost_price, line_total, profit)
                            VALUES ?
                        `;

                        db.query(itemSql, [finalItemValues], (err) => {
                            if (err) {
                                console.error('Sale item insert error:', err);
                                return db.rollback(() => {
                                    res.status(500).json({ message: 'Items insert failed' });
                                });
                            }

                            const inventoryUpdates = items.map(item => {
                                return new Promise((resolve, reject) => {
                                    const inventorySql = `
                                        UPDATE inventory
                                        SET stock_qty = stock_qty - ?
                                        WHERE branch_id = ? AND product_id = ?
                                    `;

                                    db.query(
                                        inventorySql,
                                        [item.qty, branch_id, item.product_id],
                                        (err, result) => {
                                            if (err) return reject(err);

                                            // If no inventory row exists, still allow sale but log it.
                                            // Later we can make this stricter if needed.
                                            if (result.affectedRows === 0) {
                                                console.warn(
                                                    `No inventory row found for branch ${branch_id}, product ${item.product_id}`
                                                );
                                            }

                                            resolve();
                                        }
                                    );
                                });
                            });

                            Promise.all(inventoryUpdates)
                                .then(() => {
                                    // Update open cash session only for cash sales
                                    if ((payment_method || 'cash').toLowerCase() === 'cash') {
                                        const cashSql = `
                                            UPDATE cash_sessions
                                            SET total_sales = total_sales + ?
                                            WHERE branch_id = ? AND status = 'open'
                                        `;

                                        db.query(cashSql, [total_amount, branch_id], (cashErr) => {
                                            if (cashErr) {
                                                console.error('Cash session update error:', cashErr);
                                                return db.rollback(() => {
                                                    res.status(500).json({
                                                        message: 'Cash session update failed'
                                                    });
                                                });
                                            }

                                            db.commit(commitErr => {
                                                if (commitErr) {
                                                    console.error('Commit error:', commitErr);
                                                    return db.rollback(() => {
                                                        res.status(500).json({ message: 'Commit failed' });
                                                    });
                                                }

                                                res.json({
                                                    message: 'Sale completed',
                                                    invoice_no,
                                                    total_amount
                                                });
                                            });
                                        });
                                    } else {
                                        db.commit(commitErr => {
                                            if (commitErr) {
                                                console.error('Commit error:', commitErr);
                                                return db.rollback(() => {
                                                    res.status(500).json({ message: 'Commit failed' });
                                                });
                                            }

                                            res.json({
                                                message: 'Sale completed',
                                                invoice_no,
                                                total_amount
                                            });
                                        });
                                    }
                                })
                                .catch(err => {
                                    console.error('Inventory update error:', err);
                                    db.rollback(() => {
                                        res.status(500).json({ message: 'Inventory update failed' });
                                    });
                                });
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
            console.error('Sales report error:', err);
            return res.status(500).json({ message: 'Sales report failed' });
        }

        const totalSales = results.reduce(
            (sum, sale) => sum + Number(sale.total_amount || 0),
            0
        );

        res.json({
            totalSales,
            totalInvoices: results.length,
            totalRecords: results.length,
            sales: results
        });
    });
};

// ================= SALE ITEMS / INVOICE DETAILS =================
const getSaleItems = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            sale_items.id,
            sale_items.sale_id,
            sale_items.product_id,
            sale_items.qty,
            sale_items.unit_price,
            sale_items.cost_price,
            sale_items.line_total,
            sale_items.profit,
            products.product_name
        FROM sale_items
        JOIN products ON sale_items.product_id = products.id
        WHERE sale_items.sale_id = ?
        ORDER BY sale_items.id ASC
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Sale items error:', err);
            return res.status(500).json({ message: 'Sale items load failed' });
        }

        res.json(results);
    });
};

module.exports = {
    createSale,
    getSalesReport,
    getSaleItems
};
