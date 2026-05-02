const db = require('../config/db');

const openCashSession = (req, res) => {
    const { opening_cash } = req.body;
    const { branch_id, id: user_id } = req.user;

    const today = new Date().toISOString().split('T')[0];

    const sql = `
        INSERT INTO cash_sessions (branch_id, user_id, opening_cash, session_date)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [branch_id, user_id, opening_cash, today], (err) => {
        if (err) return res.status(500).json({ message: 'Opening cash failed' });
        res.json({ message: 'Cash session started' });
    });
};

const addCashIn = (req, res) => {
    const { amount } = req.body;
    const { branch_id } = req.user;

    const today = new Date().toISOString().split('T')[0];

    db.query(
        `UPDATE cash_sessions 
         SET cash_in = cash_in + ?
         WHERE branch_id = ? AND session_date = ? AND status = 'open'`,
        [amount, branch_id, today],
        (err) => {
            if (err) return res.status(500).json({ message: 'Cash in failed' });
            res.json({ message: 'Cash added' });
        }
    );
};

const addCashOut = (req, res) => {
    const { amount } = req.body;
    const { branch_id } = req.user;

    const today = new Date().toISOString().split('T')[0];

    db.query(
        `UPDATE cash_sessions 
         SET cash_out = cash_out + ?
         WHERE branch_id = ? AND session_date = ? AND status = 'open'`,
        [amount, branch_id, today],
        (err) => {
            if (err) return res.status(500).json({ message: 'Cash out failed' });
            res.json({ message: 'Cash deducted' });
        }
    );
};

const closeSession = (req, res) => {
    const { closing_cash } = req.body;
    const { branch_id } = req.user;

    const today = new Date().toISOString().split('T')[0];

    db.query(
        `SELECT * FROM cash_sessions 
         WHERE branch_id = ? AND session_date = ? AND status = 'open'`,
        [branch_id, today],
        (err, result) => {
            if (err || result.length === 0) {
                return res.status(400).json({ message: 'No active session' });
            }

            const session = result[0];

            const expected =
                Number(session.opening_cash) +
                Number(session.total_sales) +
                Number(session.cash_in) -
                Number(session.cash_out);

            const difference = closing_cash - expected;

            db.query(
                `UPDATE cash_sessions 
                 SET closing_cash = ?, status = 'closed'
                 WHERE id = ?`,
                [closing_cash, session.id],
                () => {
                    res.json({
                        message: 'Session closed',
                        expected_cash: expected,
                        difference
                    });
                }
            );
        }
    );
};

module.exports = {
    openCashSession,
    addCashIn,
    addCashOut,
    closeSession
};