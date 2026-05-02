const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const salesRoutes = require('./routes/salesRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const cashRoutes = require('./routes/cashRoutes');



const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Cafe HNH Cloud POS API running');
});

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/cash', cashRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
