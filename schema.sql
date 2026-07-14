-- Employee Directory database schema (SQLite / Turso / libSQL dialect)
-- The backend auto-creates this table on startup, so running this file
-- manually is OPTIONAL. Use it if you want to create the schema yourself
-- via the Turso CLI shell:
--   turso db shell employee-directory < schema.sql

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

CREATE INDEX IF NOT EXISTS idx_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_name ON employees(last_name, first_name);

-- Sample data (optional - safe to skip if you want to start empty)
INSERT OR IGNORE INTO employees (first_name, last_name, email, phone, department, position, photo_url, address, join_date, status, salary)
VALUES
('Ava','Thompson','ava.thompson@company.com','+1-555-0101','Engineering','Senior Software Engineer','https://i.pravatar.cc/150?img=1','Austin, TX','2021-03-15','Active',118000),
('Marcus','Lee','marcus.lee@company.com','+1-555-0102','Engineering','Engineering Manager','https://i.pravatar.cc/150?img=2','Seattle, WA','2019-07-01','Active',145000),
('Priya','Nair','priya.nair@company.com','+1-555-0103','Design','Product Designer','https://i.pravatar.cc/150?img=3','New York, NY','2022-01-10','Active',102000),
('Diego','Alvarez','diego.alvarez@company.com','+1-555-0104','Sales','Account Executive','https://i.pravatar.cc/150?img=4','Miami, FL','2020-09-21','Active',95000),
('Hannah','Kim','hannah.kim@company.com','+1-555-0105','Marketing','Marketing Manager','https://i.pravatar.cc/150?img=5','Chicago, IL','2018-11-05','Active',110000),
('Oliver','Brown','oliver.brown@company.com','+1-555-0106','Finance','Financial Analyst','https://i.pravatar.cc/150?img=6','Boston, MA','2023-02-14','Active',88000),
('Sofia','Rossi','sofia.rossi@company.com','+1-555-0107','HR','HR Business Partner','https://i.pravatar.cc/150?img=7','Denver, CO','2020-05-18','Active',92000),
('Ethan','Walker','ethan.walker@company.com','+1-555-0108','Engineering','QA Engineer','https://i.pravatar.cc/150?img=8','Portland, OR','2022-08-09','Inactive',89000),
('Grace','Chen','grace.chen@company.com','+1-555-0109','Design','UX Researcher','https://i.pravatar.cc/150?img=9','San Jose, CA','2021-10-12','Active',97000),
('Liam','Patel','liam.patel@company.com','+1-555-0110','Sales','Sales Director','https://i.pravatar.cc/150?img=10','Dallas, TX','2017-04-03','Active',150000);
