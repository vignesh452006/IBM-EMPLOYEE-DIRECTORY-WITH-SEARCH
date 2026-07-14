/**
 * Employee Directory - Backend API
 * Node.js + Express + Turso (libSQL / SQLite)
 * Designed to be deployed FREE on Render (https://render.com)
 * Database: Turso free tier (https://turso.tech) - hosted SQLite
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((s) => s.trim()),
  })
);
app.use(express.json());

// ---------- Database connection ----------
// Production: point TURSO_DATABASE_URL at your Turso db (libsql://...)
// and set TURSO_AUTH_TOKEN. Local dev: leave both unset and it falls back
// to a local SQLite file (local.db) - no Turso account needed to test.
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// ---------- Schema bootstrap ----------
async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      phone         TEXT,
      department    TEXT,
      position      TEXT,
      photo_url     TEXT,
      address       TEXT,
      join_date     TEXT,
      status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
      salary        REAL,
      created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_department ON employees(department);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_status ON employees(status);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_name ON employees(last_name, first_name);');

  if ((process.env.SEED_SAMPLE_DATA || 'true').toLowerCase() === 'true') {
    const countResult = await db.execute('SELECT COUNT(*) AS count FROM employees');
    const count = Number(countResult.rows[0].count);
    if (count === 0) {
      const sample = [
        ['Ava', 'Thompson', 'ava.thompson@company.com', '+1-555-0101', 'Engineering', 'Senior Software Engineer', 'https://i.pravatar.cc/150?img=1', 'Austin, TX', '2021-03-15', 'Active', 118000],
        ['Marcus', 'Lee', 'marcus.lee@company.com', '+1-555-0102', 'Engineering', 'Engineering Manager', 'https://i.pravatar.cc/150?img=2', 'Seattle, WA', '2019-07-01', 'Active', 145000],
        ['Priya', 'Nair', 'priya.nair@company.com', '+1-555-0103', 'Design', 'Product Designer', 'https://i.pravatar.cc/150?img=3', 'New York, NY', '2022-01-10', 'Active', 102000],
        ['Diego', 'Alvarez', 'diego.alvarez@company.com', '+1-555-0104', 'Sales', 'Account Executive', 'https://i.pravatar.cc/150?img=4', 'Miami, FL', '2020-09-21', 'Active', 95000],
        ['Hannah', 'Kim', 'hannah.kim@company.com', '+1-555-0105', 'Marketing', 'Marketing Manager', 'https://i.pravatar.cc/150?img=5', 'Chicago, IL', '2018-11-05', 'Active', 110000],
        ['Oliver', 'Brown', 'oliver.brown@company.com', '+1-555-0106', 'Finance', 'Financial Analyst', 'https://i.pravatar.cc/150?img=6', 'Boston, MA', '2023-02-14', 'Active', 88000],
        ['Sofia', 'Rossi', 'sofia.rossi@company.com', '+1-555-0107', 'HR', 'HR Business Partner', 'https://i.pravatar.cc/150?img=7', 'Denver, CO', '2020-05-18', 'Active', 92000],
        ['Ethan', 'Walker', 'ethan.walker@company.com', '+1-555-0108', 'Engineering', 'QA Engineer', 'https://i.pravatar.cc/150?img=8', 'Portland, OR', '2022-08-09', 'Inactive', 89000],
        ['Grace', 'Chen', 'grace.chen@company.com', '+1-555-0109', 'Design', 'UX Researcher', 'https://i.pravatar.cc/150?img=9', 'San Jose, CA', '2021-10-12', 'Active', 97000],
        ['Liam', 'Patel', 'liam.patel@company.com', '+1-555-0110', 'Sales', 'Sales Director', 'https://i.pravatar.cc/150?img=10', 'Dallas, TX', '2017-04-03', 'Active', 150000],
      ];
      for (const row of sample) {
        await db.execute({
          sql: `INSERT INTO employees
            (first_name,last_name,email,phone,department,position,photo_url,address,join_date,status,salary)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          args: row,
        });
      }
      console.log('Seeded sample employee data.');
    }
  }
}

// ---------- Helpers ----------
function toEmployeePayload(body) {
  return {
    first_name: body.first_name?.trim(),
    last_name: body.last_name?.trim(),
    email: body.email?.trim().toLowerCase(),
    phone: body.phone?.trim() || null,
    department: body.department?.trim() || null,
    position: body.position?.trim() || null,
    photo_url: body.photo_url?.trim() || null,
    address: body.address?.trim() || null,
    join_date: body.join_date || null,
    status: body.status === 'Inactive' ? 'Inactive' : 'Active',
    salary: body.salary !== undefined && body.salary !== '' && body.salary !== null ? Number(body.salary) : null,
  };
}

function validateEmployee(payload) {
  const errors = [];
  if (!payload.first_name) errors.push('first_name is required');
  if (!payload.last_name) errors.push('last_name is required');
  if (!payload.email) errors.push('email is required');
  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) errors.push('email is invalid');
  if (payload.salary !== null && Number.isNaN(payload.salary)) errors.push('salary must be a number');
  return errors;
}

function rowToObject(row) {
  // libsql rows are array-like + keyed; spreading gives plain enumerable keys
  return { ...row };
}

function isUniqueConstraintError(err) {
  return /UNIQUE constraint failed/i.test(err.message || '');
}

// ---------- Routes ----------
app.get('/', (req, res) => {
  res.json({ name: 'Employee Directory API', status: 'ok', db: 'turso/sqlite' });
});

app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// List + search + filter + sort + paginate
app.get('/api/employees', async (req, res) => {
  try {
    const {
      search = '',
      department = '',
      status = '',
      sortBy = 'last_name',
      sortDir = 'ASC',
      page = 1,
      limit = 10,
    } = req.query;

    const allowedSort = ['first_name', 'last_name', 'department', 'position', 'join_date', 'salary', 'status'];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'last_name';
    const direction = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const where = [];
    const args = [];

    if (search) {
      where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR position LIKE ?)');
      const like = `%${search}%`;
      args.push(like, like, like, like);
    }
    if (department) {
      where.push('department = ?');
      args.push(department);
    }
    if (status) {
      where.push('status = ?');
      args.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM employees ${whereClause}`,
      args,
    });
    const total = Number(countResult.rows[0].total);

    const listResult = await db.execute({
      sql: `SELECT * FROM employees ${whereClause} ORDER BY ${sortColumn} ${direction} LIMIT ? OFFSET ?`,
      args: [...args, limitNum, offset],
    });

    res.json({
      data: listResult.rows.map(rowToObject),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
  }
});

// Dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalResult = await db.execute('SELECT COUNT(*) AS total FROM employees');
    const activeResult = await db.execute("SELECT COUNT(*) AS active FROM employees WHERE status = 'Active'");
    const byDeptResult = await db.execute(
      `SELECT COALESCE(department, 'Unassigned') AS department, COUNT(*) AS count
       FROM employees GROUP BY department ORDER BY count DESC`
    );
    const total = Number(totalResult.rows[0].total);
    const active = Number(activeResult.rows[0].active);
    res.json({
      total,
      active,
      inactive: total - active,
      byDepartment: byDeptResult.rows.map(rowToObject),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// Distinct departments (for filter dropdown)
app.get('/api/departments', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department'
    );
    res.json(result.rows.map((r) => r.department));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments', details: err.message });
  }
});

// Get single employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM employees WHERE id = ?', args: [req.params.id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rowToObject(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee', details: err.message });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const p = toEmployeePayload(req.body);
    const errors = validateEmployee(p);
    if (errors.length) return res.status(400).json({ errors });

    const result = await db.execute({
      sql: `INSERT INTO employees
        (first_name,last_name,email,phone,department,position,photo_url,address,join_date,status,salary)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [p.first_name, p.last_name, p.email, p.phone, p.department, p.position, p.photo_url, p.address, p.join_date, p.status, p.salary],
    });

    const created = await db.execute({ sql: 'SELECT * FROM employees WHERE id = ?', args: [result.lastInsertRowid] });
    res.status(201).json(rowToObject(created.rows[0]));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee', details: err.message });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const p = toEmployeePayload(req.body);
    const errors = validateEmployee(p);
    if (errors.length) return res.status(400).json({ errors });

    const existing = await db.execute({ sql: 'SELECT id FROM employees WHERE id = ?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    await db.execute({
      sql: `UPDATE employees SET
        first_name=?, last_name=?, email=?, phone=?, department=?, position=?,
        photo_url=?, address=?, join_date=?, status=?, salary=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?`,
      args: [p.first_name, p.last_name, p.email, p.phone, p.department, p.position, p.photo_url, p.address, p.join_date, p.status, p.salary, req.params.id],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM employees WHERE id = ?', args: [req.params.id] });
    res.json(rowToObject(updated.rows[0]));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update employee', details: err.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM employees WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee', details: err.message });
  }
});

// ---------- Start server ----------
ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Employee Directory API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
