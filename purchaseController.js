const db = require('../config/db');

const generatePurchaseNo = () => {
    return 'PUR-' + Date.now();
};

const createPurchase = (req, res) => {
    const { supplier_id, branch_id, items } = req.body;
    const user_id = req.user.id;

    if (!branch_id) {
        return res.status(400).json({ message: 'Branch is required' });
    }

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No purchase items added' });
    }

    const purchase_no = generatePurchaseNo();

    let total_amount = 0;
    items.forEach(item => {
        total_amount += Number(item.qty) * Number(item.cost_price);
    });

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: 'Transaction error' });

        const purchaseSql = `
      INSERT INTO purchases (purchase_no, supplier_id, branch_id, user_id, total_amount)
      VALUES (?, ?, ?, ?, ?)
    `;

        db.query(
            purchaseSql,
            [purchase_no, supplier_id || null, branch_id, user_id, total_amount],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return db.rollback(() => res.status(500).json({ message: 'Purchase insert failed' }));
                }

                const purchase_id = result.insertId;

                const itemValues = items.map(item => [
                    purchase_id,
                    item.product_id,
                    item.qty,
                    item.cost_price,
                    Number(item.qty) * Number(item.cost_price)
                ]);

                db.query(
                    `INSERT INTO purchase_items (purchase_id, product_id, qty, cost_price, line_total) VALUES ?`,
                    [itemValues],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return db.rollback(() => res.status(500).json({ message: 'Purchase items insert failed' }));
                        }

                        const stockUpdates = items.map(item => {
                            return new Promise((resolve, reject) => {
                                const sql = `
                  INSERT INTO inventory (branch_id, product_id, stock_qty, reorder_level)
                  VALUES (?, ?, ?, 5)
                  ON DUPLICATE KEY UPDATE stock_qty = stock_qty + VALUES(stock_qty)
                `;

                                db.query(sql, [branch_id, item.product_id, item.qty], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });
                        });

                        Promise.all(stockUpdates)
                            .then(() => {
                                db.commit(err => {
                                    if (err) {
                                        return db.rollback(() => res.status(500).json({ message: 'Commit failed' }));
                                    }

                                    res.json({
                                        message: 'Purchase completed and stock updated',
                                        purchase_no,
                                        total_amount
                                    });
                                });
                            })
                            .catch(err => {
                                console.error(err);
                                db.rollback(() => res.status(500).json({ message: 'Stock update failed' }));
                            });
                    }
                );
            }
        );
    });
};

const getPurchases = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let sql = `
    SELECT 
      purchases.id,
      purchases.purchase_no,
      purchases.total_amount,
      purchases.purchase_date,
      branches.branch_name,
      suppliers.supplier_name,
      users.full_name AS created_by
    FROM purchases
    JOIN branches ON purchases.branch_id = branches.id
    LEFT JOIN suppliers ON purchases.supplier_id = suppliers.id
    JOIN users ON purchases.user_id = users.id
    WHERE 1 = 1
  `;

    const params = [];

    if (from) {
        sql += ` AND DATE(purchases.purchase_date) >= ?`;
        params.push(from);
    }

    if (to) {
        sql += ` AND DATE(purchases.purchase_date) <= ?`;
        params.push(to);
    }

    if (user.role !== 'owner') {
        sql += ` AND purchases.branch_id = ?`;
        params.push(user.branch_id);
    } else if (branch_id) {
        sql += ` AND purchases.branch_id = ?`;
        params.push(branch_id);
    }

    sql += ` ORDER BY purchases.purchase_date DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: 'Purchase report failed' });

        const totalPurchases = results.reduce((sum, p) => sum + Number(p.total_amount), 0);

        res.json({
            totalPurchases,
            totalRecords: results.length,
            purchases: results
        });
    });
};

module.exports = {
    createPurchase,
    getPurchases
};