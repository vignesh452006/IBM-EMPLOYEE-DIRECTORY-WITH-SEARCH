const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const PAGE_SIZE = 9;

async function fetchDirectoryData(query) {
  const search = (query.q || '').trim();
  const department = query.department || '';
  const status = query.status || '';
  const sort = query.sort || 'name_asc';
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  const where = [];
  const params = [];

  if (search) {
    where.push('(e.full_name LIKE ? OR e.job_title LIKE ? OR e.skills LIKE ? OR e.email LIKE ?)');
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

  const sortMap = {
    name_asc: 'e.full_name ASC',
    name_desc: 'e.full_name DESC',
    newest: 'e.hire_date DESC',
    oldest: 'e.hire_date ASC',
  };
  const orderBy = sortMap[sort] || sortMap.name_asc;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees e ${whereClause}`,
    params
  );
  const total = countRows[0].total;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const [employees] = await pool.query(
    `SELECT e.*, d.name AS department_name, d.color AS department_color
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );

  const [departments] = await pool.query('SELECT * FROM departments ORDER BY name ASC');

  return { employees, departments, total, totalPages, safePage, search, department, status, sort };
}

router.get('/', async (req, res) => {
  try {
    const data = await fetchDirectoryData(req.query);
    res.render('index', {
      title: 'Employee Directory',
      ...data,
      view: req.query.view === 'list' ? 'list' : 'grid',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('index', {
      title: 'Employee Directory',
      employees: [], departments: [], total: 0, totalPages: 1, safePage: 1,
      search: '', department: '', status: '', sort: 'name_asc', view: 'grid',
      error: 'Could not load the directory right now.',
    });
  }
});

// AJAX endpoint for smooth, no-reload live search/filtering
router.get('/api/employees', async (req, res) => {
  try {
    const data = await fetchDirectoryData(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

router.get('/employee/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.name AS department_name, d.color AS department_color
       FROM employees e LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).render('404', { title: 'Not Found' });
    }
    const [related] = await pool.query(
      `SELECT e.* FROM employees e WHERE e.department_id = ? AND e.id != ? LIMIT 4`,
      [rows[0].department_id, req.params.id]
    );
    res.render('employee', { title: rows[0].full_name, employee: rows[0], related });
  } catch (err) {
    console.error(err);
    res.status(500).render('404', { title: 'Error' });
  }
});

module.exports = router;
