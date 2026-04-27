const db = require('../config/db');

const getSuppliers = (req, res) => {
  db.query('SELECT * FROM suppliers ORDER BY supplier_name', (err, results) => {
    if (err) {
      console.error('Supplier load error:', err);
      return res.status(500).json({ message: 'Supplier load failed' });
    }

    res.json(results);
  });
};

const createSupplier = (req, res) => {
  const { supplier_name, phone, address } = req.body;

  if (!supplier_name) {
    return res.status(400).json({ message: 'Supplier name is required' });
  }

  db.query(
    'INSERT INTO suppliers (supplier_name, phone, address) VALUES (?, ?, ?)',
    [supplier_name, phone || '', address || ''],
    (err) => {
      if (err) {
        console.error('Supplier create error:', err);
        return res.status(500).json({ message: 'Supplier create failed' });
      }

      res.json({ message: 'Supplier created successfully' });
    }
  );
};

module.exports = {
  getSuppliers,
  createSupplier
};
