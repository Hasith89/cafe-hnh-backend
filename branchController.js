const db = require('../config/db');

const getBranches = (req, res) => {
    const sql = 'SELECT * FROM branches';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
};

const createBranch = (req, res) => {
    const { branch_name, branch_code, address, phone } = req.body;

    const sql = `
    INSERT INTO branches (branch_name, branch_code, address, phone)
    VALUES (?, ?, ?, ?)
  `;

    db.query(sql, [branch_name, branch_code, address, phone], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error creating branch', error: err });
        }

        res.json({ message: 'Branch created successfully' });
    });
};

module.exports = {
    getBranches,
    createBranch
};