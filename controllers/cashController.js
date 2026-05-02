const db = require('../config/db');

const todayDate = () => new Date().toISOString().split('T')[0];

const openCashSession = (req, res) => {
    const { opening_cash } = req.body;
    const { branch_id, id: user_id } = req.user;

    if (!branch_id) {
        return res.status(400).json({ message: 'Branch not assigned to user.' });
    }

    if (opening_cash === undefined || opening_cash === '') {
        return res.status(400).json({ message: 'Opening cash is required.' });
    }

    const today = todayDate();

    const checkSql = `
        SELECT id FROM cash_sessions
        WHERE branch_id = ? AND session_date = ? AND status = 'open'
        LIMIT 1
    `;

    db.query(checkSql, [branch_id, today], (err, existing) => {
        if (err) {
            console.error('Cash session check error:', err);
            return res.status(500).json({ message: 'Cash session check failed.' });
        }

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Cash session already opened for today.' });
        }

        const sql = `
            INSERT INTO cash_sessions 
            (branch_id, user_id, opening_cash, session_date, status)
            VALUES (?, ?, ?, ?, 'open')
        `;

        db.query(sql, [branch_id, user_id, opening_cash, today], (err) => {
            if (err) {
                console.error('Open cash error:', err);
                return res.status(500).json({ message: 'Opening cash failed.' });
            }

            res.json({ message: 'Cash session started successfully.' });
        });
    });
};

const addCashIn = (req, res) => {
    const { amount } = req.body;
    const { branch_id } = req.user;
    const today = todayDate();

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Valid cash in amount is required.' });
    }

    const sql = `
        UPDATE cash_sessions 
        SET cash_in = cash_in + ?
        WHERE branch_id = ? AND session_date = ? AND status = 'open'
    `;

    db.query(sql, [amount, branch_id, today], (err, result) => {
        if (err) {
            console.error('Cash in error:', err);
            return res.status(500).json({ message: 'Cash in failed.' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'No open cash session found.' });
        }

        res.json({ message: 'Cash in added successfully.' });
    });
};

const addCashOut = (req, res) => {
    const { amount } = req.body;
    const { branch_id } = req.user;
    const today = todayDate();

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Valid cash out amount is required.' });
    }

    const sql = `
        UPDATE cash_sessions 
        SET cash_out = cash_out + ?
        WHERE branch_id = ? AND session_date = ? AND status = 'open'
    `;

    db.query(sql, [amount, branch_id, today], (err, result) => {
        if (err) {
            console.error('Cash out error:', err);
            return res.status(500).json({ message: 'Cash out failed.' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'No open cash session found.' });
        }

        res.json({ message: 'Cash out deducted successfully.' });
    });
};

const closeSession = (req, res) => {
    const { closing_cash } = req.body;
    const { branch_id } = req.user;
    const today = todayDate();

    if (closing_cash === undefined || closing_cash === '') {
        return res.status(400).json({ message: 'Closing cash is required.' });
    }

    const sql = `
        SELECT * FROM cash_sessions
        WHERE branch_id = ? AND session_date = ? AND status = 'open'
        LIMIT 1
    `;

    db.query(sql, [branch_id, today], (err, results) => {
        if (err) {
            console.error('Close cash select error:', err);
            return res.status(500).json({ message: 'Cash session load failed.' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'No active cash session found.' });
        }

        const session = results[0];

        const expectedCash =
            Number(session.opening_cash) +
            Number(session.total_sales) +
            Number(session.cash_in) -
            Number(session.cash_out);

        const difference = Number(closing_cash) - expectedCash;

        const updateSql = `
            UPDATE cash_sessions 
            SET closing_cash = ?, status = 'closed'
            WHERE id = ?
        `;

        db.query(updateSql, [closing_cash, session.id], (err) => {
            if (err) {
                console.error('Close cash update error:', err);
                return res.status(500).json({ message: 'Cash session close failed.' });
            }

            res.json({
                message: 'Cash session closed successfully.',
                expected_cash: expectedCash,
                closing_cash: Number(closing_cash),
                difference
            });
        });
    });
};

const getCashReport = (req, res) => {
    const { from, to, branch_id } = req.query;
    const user = req.user;

    let sql = `
        SELECT 
            cash_sessions.*,
            branches.branch_name,
            users.full_name AS cashier_name
        FROM cash_sessions
        JOIN branches ON cash_sessions.branch_id = branches.id
        JOIN users ON cash_sessions.user_id = users.id
        WHERE 1 = 1
    `;

    const params = [];

    if (from) {
        sql += ` AND cash_sessions.session_date >= ?`;
        params.push(from);
    }

    if (to) {
        sql += ` AND cash_sessions.session_date <= ?`;
        params.push(to);
    }

    if (user.role !== 'owner') {
        sql += ` AND cash_sessions.branch_id = ?`;
        params.push(user.branch_id);
    } else if (branch_id) {
        sql += ` AND cash_sessions.branch_id = ?`;
        params.push(branch_id);
    }

    sql += ` ORDER BY cash_sessions.session_date DESC, cash_sessions.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Cash report error:', err);
            return res.status(500).json({ message: 'Cash report failed.' });
        }

        const report = results.map(r => {
            const expectedCash =
                Number(r.opening_cash) +
                Number(r.total_sales) +
                Number(r.cash_in) -
                Number(r.cash_out);

            const closingCash = r.closing_cash === null ? null : Number(r.closing_cash);
            const difference = closingCash === null ? null : closingCash - expectedCash;

            return {
                ...r,
                expected_cash: expectedCash,
                difference
            };
        });

        res.json({
            totalRecords: report.length,
            report
        });
    });
};

module.exports = {
    openCashSession,
    addCashIn,
    addCashOut,
    closeSession,
    getCashReport
};
