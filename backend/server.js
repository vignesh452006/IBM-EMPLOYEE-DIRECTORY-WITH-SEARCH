require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const { initDatabase } = require('./config/init');
const employeesRouter = require('./routes/employees');
const departmentsRouter = require('./routes/departments');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow your Vercel frontend (and localhost for dev) to call this API.
// Set ALLOWED_ORIGINS in Railway to a comma-separated list, e.g.
// https://your-app.vercel.app,http://localhost:5500
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (also used by Railway to confirm the service is alive)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Employee Directory API is running' });
});
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({ status: 'ok', database: dbOk ? 'connected' : 'disconnected' });
});

app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', detail: err.message });
});

async function start() {
  await testConnection();
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Employee Directory API running on port ${PORT}`);
  });
}

start();
