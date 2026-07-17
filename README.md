# 🧑‍💼 TeamBase — Employee Directory

A modern, animated, full-stack **Employee Directory** web app built with **Node.js, Express, EJS and MySQL** — complete with a public searchable directory and a full **Admin Panel with CRUD**. Ready to deploy on **Railway**.

---

## ✨ Features

### Public Directory
- Searchable, filterable employee grid (search by name, role, or skill)
- Filter by department & status, sort by name/hire date
- Grid / list view toggle
- Live AJAX search — no page reloads, with skeleton loading states
- Individual employee profile pages (bio, contact info, skills, social links)
- 4 built-in **themes**: Light, Dark, Ocean, Sunset — instantly switchable, persisted per browser
- Smooth entrance animations, hover effects, animated bar charts
- Fully responsive (mobile, tablet, desktop)

### Admin Panel (`/admin`)
- Secure session-based login (bcrypt password hashing)
- Dashboard with live stats (total employees, active, on leave, departments) + charts
- **Full CRUD** for employees: create, read, update, delete
  - Avatar via image URL **or** file upload
  - Rich fields: job title, department, status, hire date, skills, bio, socials, "featured" flag
- Department management (create/delete, color-coded tags, employee counts)
- Activity log (audit trail of every admin action)
- Change-password profile page
- Mobile-friendly collapsible sidebar

---

## 🗂 Project Structure

```
employee-directory/
├── config/db.js            # MySQL connection pool
├── database/
│   ├── schema.sql           # Table definitions + seed departments
│   ├── init.js              # Auto-runs schema + creates default admin on boot
│   └── seed.js              # Optional: inserts sample demo employees
├── middleware/
│   ├── auth.js               # requireAuth guard for /admin routes
│   └── upload.js             # Multer config for avatar uploads
├── routes/
│   ├── public.js              # Directory + profile + JSON API
│   ├── auth.js                 # Login / logout
│   └── admin.js                 # Dashboard + Employee/Department CRUD
├── views/                        # EJS templates (public + admin)
├── public/css, public/js         # Styles, themes, animations, client JS
├── server.js                     # App entry point
├── Procfile / railway.json       # Deployment config
└── .env.example
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+
- A MySQL server (local install, Docker, or a cloud instance)

### 2. Install dependencies
```bash
cd employee-directory
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your local MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=employee_directory
SESSION_SECRET=some_long_random_string
```

### 4. Create the database
```bash
mysql -u root -p -e "CREATE DATABASE employee_directory;"
```
The app automatically creates all tables and a default admin account on first boot — no manual schema import needed. (You can also run `database/schema.sql` manually if you prefer.)

### 5. (Optional) Seed demo data
```bash
npm run seed
```

### 6. Run the app
```bash
npm run dev     # with nodemon, auto-restart
# or
npm start
```
Visit **http://localhost:3000** for the public directory and **http://localhost:3000/admin/login** for the admin panel.

**Default admin login:** `admin@company.com` / `Admin@12345` (set via `.env`, change immediately after first login using the profile page).

---

## ☁️ Deploying to Railway

### Step 1 — Push this project to a GitHub repo
```bash
git init
git add .
git commit -m "Initial commit: Employee Directory app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Step 2 — Create a new Railway project
1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project → Deploy from GitHub repo** and select your repository.
3. Railway will detect Node.js automatically via Nixpacks and use the included `railway.json` / `Procfile`.

### Step 3 — Add a MySQL database
1. In your Railway project, click **+ New → Database → Add MySQL**.
2. Railway provisions a MySQL instance and exposes connection variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, and a combined `MYSQL_URL`).

### Step 4 — Configure environment variables
In your **web service** (not the database) → **Variables** tab, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Reference the MySQL plugin's `MYSQL_URL` variable (Railway lets you reference `${{MySQL.MYSQL_URL}}`) |
| `SESSION_SECRET` | A long random string |
| `ADMIN_NAME` | e.g. `Super Admin` |
| `ADMIN_EMAIL` | e.g. `admin@yourcompany.com` |
| `ADMIN_PASSWORD` | A strong password — change it after first login |
| `NODE_ENV` | `production` |

> The app reads `DATABASE_URL` first (see `config/db.js`); if not set, it falls back to discrete `DB_HOST` / `DB_USER` / etc. variables — you can map those instead if you prefer explicit fields (`DB_HOST` → `${{MySQL.MYSQLHOST}}`, `DB_PORT` → `${{MySQL.MYSQLPORT}}`, `DB_USER` → `${{MySQL.MYSQLUSER}}`, `DB_PASSWORD` → `${{MySQL.MYSQLPASSWORD}}`, `DB_NAME` → `${{MySQL.MYSQLDATABASE}}`).

Railway automatically sets `PORT` — the app already reads `process.env.PORT`, so no change needed.

### Step 5 — Deploy
Railway auto-deploys on every push to `main`. On boot, the app automatically creates all tables and the default admin account — no manual migration step needed.

### Step 6 — Generate a public domain
In the web service → **Settings → Networking → Generate Domain**. Your app will be live at `https://<your-app>.up.railway.app`.

### A note on avatar uploads
Railway's filesystem is **ephemeral** — files uploaded via the "Upload Avatar" option in the admin form will be lost on redeploy/restart unless you attach a [Railway Volume](https://docs.railway.app/reference/volumes) mounted at `public/uploads`. For a production setup, prefer the **Avatar Image URL** field (e.g., a link to an image hosted on S3, Cloudinary, or similar), which persists regardless of redeploys.

---

## 🔒 Security Notes
- Passwords are hashed with bcrypt (never stored in plain text).
- Sessions are server-side (`express-session`) with a configurable secret.
- Change the default admin password immediately via **Admin → My Profile**.
- Always set a strong, unique `SESSION_SECRET` in production.

## 🎨 Customization
- Themes and colors: edit CSS variables at the top of `public/css/style.css`.
- Add more departments: Admin Panel → Departments (color-coded automatically).
- Add more employee fields: extend `database/schema.sql`, `routes/admin.js`, and `views/admin/form.ejs`.

---

Built with ❤️ using Node.js, Express, EJS, and MySQL.
