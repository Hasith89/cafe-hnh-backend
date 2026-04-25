const db = require('../config/db');
const bcrypt = require('bcryptjs');

const getUsers = (req, res) => {
    const sql = `
    SELECT users.id, full_name, username, role, branch_id, branches.branch_name
    FROM users
    LEFT JOIN branches ON users.branch_id = branches.id
  `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        res.json(results);
    });
};

const createUser = async (req, res) => {
    const { full_name, username, password, role, branch_id } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
      INSERT INTO users (full_name, username, password, role, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `;

        db.query(sql, [full_name, username, hashedPassword, role, branch_id], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error creating user', error: err });
            }

            res.json({ message: 'User created successfully' });
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUsers,
    createUser
};