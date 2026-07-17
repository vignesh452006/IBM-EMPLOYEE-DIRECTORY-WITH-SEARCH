// ---------------------------------------------------------------
// Set your Railway backend URL here BEFORE deploying to Vercel,
// e.g. "https://employee-directory-backend-production.up.railway.app"
//
// You can also leave this blank and set it later from the app itself
// via the gear icon (⚙) in the navbar — it's saved in the browser's
// localStorage and overrides the value below.
// ---------------------------------------------------------------
const DEFAULT_API_URL = "https://employee-directory-production-c0d8.up.railway.app";

function getApiBaseUrl() {
  const stored = localStorage.getItem("employeeDirectoryApiUrl");
  const base = (stored || DEFAULT_API_URL || "http://localhost:5000").trim();
  return base.replace(/\/+$/, ""); // strip trailing slash
}
