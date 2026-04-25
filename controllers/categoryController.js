const db = require('../config/db');

const getCategories = (req, res) => {
    db.query('SELECT * FROM categories ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json(results);
    });
};

const createCategory = (req, res) => {
    const { category_name } = req.body;

    db.query(
        'INSERT INTO categories (category_name) VALUES (?)',
        [category_name],
        (err) => {
            if (err) return res.status(500).json({ message: 'Insert error' });
            res.json({ message: 'Category added' });
        }
    );
};

const updateCategory = (req, res) => {
    const { id } = req.params;
    const { category_name } = req.body;

    db.query(
        'UPDATE categories SET category_name = ? WHERE id = ?',
        [category_name, id],
        (err) => {
            if (err) return res.status(500).json({ message: 'Update failed' });
            res.json({ message: 'Category updated' });
        }
    );
};

const deleteCategory = (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM categories WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({
                message: 'Cannot delete category. It may be used by products.'
            });
        }

        res.json({ message: 'Category deleted' });
    });
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};