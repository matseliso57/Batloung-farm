require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./src/config/db');
const { seedAdmin } = require('./src/utils/seedAdmin');
const { requireAuth } = require('./src/middleware/auth');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // correct client address when hosted behind a proxy
app.use(cors());
app.use(express.json());

// API health check (the front end runs separately from the /frontend folder)
const health = (req, res) =>
  res.json({ success: true, message: 'Batloung Farm Distribution API is running' });
app.get('/', health);
app.get('/api', health);

// Login is public. Everything below this line needs a valid token.
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api', requireAuth);

app.use('/api/suppliers', require('./src/routes/supplierRoutes'));
app.use('/api/fruits', require('./src/routes/fruitRoutes'));
app.use('/api/vendors', require('./src/routes/vendorRoutes'));
app.use('/api/purchases', require('./src/routes/purchaseRoutes'));
app.use('/api/sales', require('./src/routes/saleRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));

app.use(notFound);
app.use(errorHandler);

// Safety nets: log instead of crashing
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
process.on('uncaughtException', (e) => console.error('Uncaught exception:', e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BACK END (API) running: http://localhost:${PORT}/api`);
  testConnection().then((ok) => { if (ok) seedAdmin(); });
});