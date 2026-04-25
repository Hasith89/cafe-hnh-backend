const db = require('../config/db');

const getInventory = (req, res) => {
    const { branch_id } = req.query;

    let sql = `
    SELECT 
      inventory.id,
      inventory.branch_id,
      inventory.product_id,
      inventory.stock_qty,
      inventory.reorder_level,
      inventory.updated_at,
      branches.branch_name,
      products.product_name,
      products.sku,
      products.selling_price,
      categories.category_name
    FROM inventory
    JOIN branches ON inventory.branch_id = branches.id
    JOIN products ON inventory.product_id = products.id
    LEFT JOIN categories ON products.category_id = categories.id
  `;

    const params = [];

    if (branch_id) {
        sql += ` WHERE inventory.branch_id = ?`;
        params.push(branch_id);
    }

    sql += ` ORDER BY branches.branch_name, products.product_name`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Inventory fetch error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json(results);
    });
};

const upsertInventory = (req, res) => {
    const { branch_id, product_id, stock_qty, reorder_level } = req.body;

    if (!branch_id || !product_id) {
        return res.status(400).json({ message: 'Branch and product are required' });
    }

    const sql = `
    INSERT INTO inventory (branch_id, product_id, stock_qty, reorder_level)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      stock_qty = VALUES(stock_qty),
      reorder_level = VALUES(reorder_level)
  `;

    db.query(
        sql,
        [branch_id, product_id, stock_qty || 0, reorder_level || 0],
        (err) => {
            if (err) {
                console.error('Inventory update error:', err);
                return res.status(500).json({ message: 'Inventory update failed' });
            }

            res.json({ message: 'Inventory updated successfully' });
        }
    );
};

const getLowStock = (req, res) => {
    const sql = `
    SELECT 
      inventory.id,
      branches.branch_name,
      products.product_name,
      inventory.stock_qty,
      inventory.reorder_level
    FROM inventory
    JOIN branches ON inventory.branch_id = branches.id
    JOIN products ON inventory.product_id = products.id
    WHERE inventory.stock_qty <= inventory.reorder_level
    ORDER BY branches.branch_name, products.product_name
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Low stock fetch error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json(results);
    });
};

module.exports = {
    getInventory,
    upsertInventory,
    getLowStock
};