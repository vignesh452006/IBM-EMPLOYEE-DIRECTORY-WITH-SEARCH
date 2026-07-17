const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const SORTABLE = ['first_name', 'last_name', 'email', 'position', 'hire_date', 'salary', 'status', 'created_at'];

// GET /api/employees - list with search, filter, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      department = '',
      status = '',
      sort = 'last_name',
      order = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    const safeSort = SORTABLE.includes(sort) ? sort : 'last_name';
    const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * pageSize;

    const where = [];
    const params = [];

    if (search) {
      where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.position LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (department) {
      where.push('e.department_id = ?');
      params.push(department);
    }
    if (status) {
      where.push('e.status = ?');
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM employees e ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereClause}
       ORDER BY e.${safeSort} ${safeOrder}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees', detail: err.message });
  }
});

// GET /api/employees/stats - dashboard summary numbers
router.get('/stats', async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM employees');
    const [[{ active }]] = await pool.query("SELECT COUNT(*) AS active FROM employees WHERE status='active'");
    const [[{ onLeave }]] = await pool.query("SELECT COUNT(*) AS onLeave FROM employees WHERE status='on_leave'");
    const [[{ departments }]] = await pool.query('SELECT COUNT(*) AS departments FROM departments');
    res.json({ total, active, onLeave, departments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', detail: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.name AS department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee', detail: err.message });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, position,
      department_id, status, hire_date, salary, photo_url, address, notes
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO employees
       (first_name, last_name, email, phone, position, department_id, status, hire_date, salary, photo_url, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone || null, position || null,
       department_id || null, status || 'active', hire_date || null,
       salary || null, photo_url || null, address || null, notes || null]
    );

    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create employee', detail: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, position,
      department_id, status, hire_date, salary, photo_url, address, notes
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Employee not found' });

    await pool.query(
      `UPDATE employees SET
        first_name = ?, last_name = ?, email = ?, phone = ?, position = ?,
        department_id = ?, status = ?, hire_date = ?, salary = ?, photo_url = ?,
        address = ?, notes = ?
       WHERE id = ?`,
      [first_name, last_name, email, phone || null, position || null,
       department_id || null, status || 'active', hire_date || null,
       salary || null, photo_url || null, address || null, notes || null,
       req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update employee', detail: err.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee', detail: err.message });
  }
});

module.exports = router;
