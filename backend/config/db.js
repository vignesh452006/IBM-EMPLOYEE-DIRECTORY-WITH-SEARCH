const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Railway MySQL plugin exposes either:
 *   - a single connection string: MYSQL_URL / MYSQL_PUBLIC_URL / DATABASE_URL
 *   - or individual vars: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
 * This config supports both, plus local .env fallback for development.
 */

let pool;

function buildPoolFromUrl(url) {
  return mysql.createPool(url + (url.includes('?') ? '&' : '?') + 'ssl-mode=DISABLED&waitForConnections=true&connectionLimit=10');
}

function createPool() {
  const connectionString =
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.DATABASE_URL;

  if (connectionString) {
    return mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'employee_directory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

pool = createPool();

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
