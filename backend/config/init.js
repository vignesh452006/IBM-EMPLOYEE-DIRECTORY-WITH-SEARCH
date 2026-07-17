const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

/**
 * Runs schema.sql on startup so the Railway MySQL database is
 * auto-provisioned with tables + sample data the first time the
 * service boots. Safe to run repeatedly (uses IF NOT EXISTS / IGNORE).
 */
async function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split on semicolons that end a statement (naive but fine for this schema)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const conn = await pool.getConnection();
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        // Ignore "duplicate key" / "already exists" style errors so re-runs are safe
        if (!/already exists|Duplicate/i.test(err.message)) {
          console.error('Schema statement failed:', err.message);
        }
      }
    }
    conn.release();
    console.log('✅ Database schema verified/initialized');
  } catch (err) {
    console.error('⚠️  Could not auto-initialize schema:', err.message);
    console.error('   Run schema.sql manually against your MySQL database if tables are missing.');
  }
}

module.exports = { initDatabase };
