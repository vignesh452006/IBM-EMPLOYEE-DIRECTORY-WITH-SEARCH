-- Employee Directory Schema
-- Run this once against your Railway MySQL database (or let server.js auto-create it)

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  position VARCHAR(150),
  department_id INT,
  status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
  hire_date DATE,
  salary DECIMAL(12,2),
  photo_url VARCHAR(500),
  address VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX idx_employees_name ON employees(last_name, first_name);
CREATE INDEX idx_employees_status ON employees(status);

-- Sample departments
INSERT IGNORE INTO departments (name) VALUES
  ('Engineering'), ('Sales'), ('Marketing'), ('Human Resources'),
  ('Finance'), ('Operations'), ('Customer Support'), ('Design');

-- Sample employees
INSERT IGNORE INTO employees (first_name, last_name, email, phone, position, department_id, status, hire_date, salary, photo_url)
VALUES
  ('Ava', 'Johnson', 'ava.johnson@company.com', '555-0101', 'Senior Software Engineer', 1, 'active', '2021-03-15', 118000, ''),
  ('Liam', 'Smith', 'liam.smith@company.com', '555-0102', 'Sales Manager', 2, 'active', '2019-07-01', 95000, ''),
  ('Olivia', 'Brown', 'olivia.brown@company.com', '555-0103', 'Marketing Specialist', 3, 'active', '2022-01-10', 72000, ''),
  ('Noah', 'Williams', 'noah.williams@company.com', '555-0104', 'HR Business Partner', 4, 'active', '2020-11-20', 88000, ''),
  ('Emma', 'Jones', 'emma.jones@company.com', '555-0105', 'Financial Analyst', 5, 'on_leave', '2021-05-05', 79000, ''),
  ('Oliver', 'Garcia', 'oliver.garcia@company.com', '555-0106', 'Operations Lead', 6, 'active', '2018-09-12', 102000, ''),
  ('Sophia', 'Miller', 'sophia.miller@company.com', '555-0107', 'Support Team Lead', 7, 'active', '2022-06-01', 68000, ''),
  ('Elijah', 'Davis', 'elijah.davis@company.com', '555-0108', 'Product Designer', 8, 'active', '2023-02-14', 91000, ''),
  ('Isabella', 'Rodriguez', 'isabella.rodriguez@company.com', '555-0109', 'Software Engineer', 1, 'inactive', '2020-08-08', 105000, ''),
  ('James', 'Martinez', 'james.martinez@company.com', '555-0110', 'Account Executive', 2, 'active', '2023-04-17', 84000, '');
