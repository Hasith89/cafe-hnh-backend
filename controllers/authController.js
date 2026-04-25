const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const loginUser = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE username = ? AND status = "active" LIMIT 1';

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error('Login DB error:', err);
            return res.status(500).json({ message: 'Database error.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const user = results[0];

        try {
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid username or password.' });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    full_name: user.full_name,
                    username: user.username,
                    role: user.role,
                    branch_id: user.branch_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.status(200).json({
                message: 'Login successful.',
                token,
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    username: user.username,
                    role: user.role,
                    branch_id: user.branch_id
                }
            });
        } catch (error) {
            console.error('Password compare error:', error);
            return res.status(500).json({ message: 'Server error during login.' });
        }
    });
};

const getProfile = (req, res) => {
    return res.status(200).json({
        message: 'Profile fetched successfully.',
        user: req.user
    });
};

module.exports = {
    loginUser,
    getProfile
};