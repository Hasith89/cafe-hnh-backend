const db = require('../config/db');

const getProducts = (req, res) => {
    const sql = `
    SELECT products.*, categories.category_name
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    ORDER BY products.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json(results);
    });
};

const createProduct = (req, res) => {
    const { product_name, category_id, selling_price } = req.body;

    const sql = `
    INSERT INTO products (product_name, category_id, selling_price)
    VALUES (?, ?, ?)
  `;

    db.query(sql, [product_name, category_id, selling_price], (err) => {
        if (err) return res.status(500).json({ message: 'Insert error' });
        res.json({ message: 'Product added' });
    });
};

const updateProduct = (req, res) => {
    const { id } = req.params;
    const { product_name, category_id, selling_price } = req.body;

    const sql = `
    UPDATE products
    SET product_name = ?, category_id = ?, selling_price = ?
    WHERE id = ?
  `;

    db.query(sql, [product_name, category_id, selling_price, id], (err) => {
        if (err) return res.status(500).json({ message: 'Product update failed' });
        res.json({ message: 'Product updated' });
    });
};

const deleteProduct = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({
                message: 'Cannot delete product. It may be used in sales, purchases, or inventory.'
            });
        }

        res.json({ message: 'Product deleted' });
    });
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
};