const db = require('../config/db');

const getProducts = (req, res) => {
    const sql = `
        SELECT 
            products.*,
            categories.category_name
        FROM products
        LEFT JOIN categories ON products.category_id = categories.id
        ORDER BY products.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Product load error:', err);
            return res.status(500).json({ message: 'DB error' });
        }

        res.json(results);
    });
};

const createProduct = (req, res) => {
    const {
        product_name,
        sku,
        category_id,
        buying_price,
        selling_price
    } = req.body;

    if (!product_name || !category_id || selling_price === undefined || selling_price === '') {
        return res.status(400).json({
            message: 'Product name, category and selling price are required'
        });
    }

    const sql = `
        INSERT INTO products 
        (product_name, sku, category_id, buying_price, selling_price)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            product_name,
            sku || null,
            category_id,
            buying_price || 0,
            selling_price
        ],
        (err) => {
            if (err) {
                console.error('Product insert error:', err);
                return res.status(500).json({ message: 'Insert error' });
            }

            res.json({ message: 'Product added' });
        }
    );
};

const updateProduct = (req, res) => {
    const { id } = req.params;

    const {
        product_name,
        sku,
        category_id,
        buying_price,
        selling_price
    } = req.body;

    if (!product_name || !category_id || selling_price === undefined || selling_price === '') {
        return res.status(400).json({
            message: 'Product name, category and selling price are required'
        });
    }

    const sql = `
        UPDATE products
        SET 
            product_name = ?,
            sku = ?,
            category_id = ?,
            buying_price = ?,
            selling_price = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            product_name,
            sku || null,
            category_id,
            buying_price || 0,
            selling_price,
            id
        ],
        (err) => {
            if (err) {
                console.error('Product update error:', err);
                return res.status(500).json({ message: 'Product update failed' });
            }

            res.json({ message: 'Product updated' });
        }
    );
};

const deleteProduct = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
        if (err) {
            console.error('Product delete error:', err);
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
