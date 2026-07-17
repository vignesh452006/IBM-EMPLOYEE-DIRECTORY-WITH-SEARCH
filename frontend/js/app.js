(function () {
  const API = () => getApiBaseUrl();

  const state = {
    page: 1,
    limit: 10,
    search: '',
    department: '',
    status: '',
    sort: 'last_name',
    order: 'asc',
    departments: [],
    lastResults: []
  };

  const el = (id) => document.getElementById(id);
  const toastEl = el('appToast');
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
  const employeeModal = new bootstrap.Modal(el('employeeModal'));
  const detailModal = new bootstrap.Modal(el('detailModal'));
  const deleteModal = new bootstrap.Modal(el('deleteModal'));

  function showToast(message, variant = 'success') {
    el('toastBody').textContent = message;
    toastEl.classList.remove('text-bg-danger', 'text-bg-success');
    toastEl.classList.add(variant === 'error' ? 'text-bg-danger' : 'text-bg-success');
    toast.show();
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API()}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    let body = null;
    try { body = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      throw new Error((body && body.error) || `Request failed (${res.status})`);
    }
    return body;
  }

  // ---------- Connection status ----------
  async function checkConnection() {
    const badge = el('connectionStatus');
    try {
      await apiFetch('/api/health');
      badge.textContent = '';
      badge.className = 'badge text-bg-success d-none d-sm-inline-flex align-items-center gap-1';
      badge.innerHTML = '<i class="bi bi-circle-fill"></i> Connected';
    } catch (err) {
      badge.className = 'badge text-bg-danger d-none d-sm-inline-flex align-items-center gap-1';
      badge.innerHTML = '<i class="bi bi-circle-fill"></i> Offline';
    }
  }

  // ---------- Departments ----------
  async function loadDepartments() {
    try {
      const depts = await apiFetch('/api/departments');
      state.departments = depts;
      const filterSel = el('filterDepartment');
      const formSel = el('empDepartment');
      filterSel.innerHTML = '<option value="">All Departments</option>' +
        depts.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${d.employee_count})</option>`).join('');
      formSel.innerHTML = '<option value="">— None —</option>' +
        depts.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }

  // ---------- Stats ----------
  async function loadStats() {
    try {
      const stats = await apiFetch('/api/employees/stats');
      el('statTotal').textContent = stats.total;
      el('statActive').textContent = stats.active;
      el('statOnLeave').textContent = stats.onLeave;
      el('statDepartments').textContent = stats.departments;
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }

  // ---------- Employees table ----------
  function initials(first, last) {
    return `${(first || '?')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  }

  function statusLabel(status) {
    return { active: 'Active', inactive: 'Inactive', on_leave: 'On Leave' }[status] || status;
  }

  function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatMoney(v) {
    if (v === null || v === undefined || v === '') return '—';
    return Number(v).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  function renderRow(emp) {
    const avatar = emp.photo_url
      ? `<img src="${escapeHtml(emp.photo_url)}" class="emp-avatar" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'emp-avatar',textContent:'${initials(emp.first_name, emp.last_name)}'}))">`
      : `<div class="emp-avatar">${initials(emp.first_name, emp.last_name)}</div>`;

    return `
      <tr data-id="${emp.id}">
        <td>
          <div class="emp-name-cell">
            ${avatar}
            <div>
              <div class="emp-name">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</div>
              <div class="emp-email">${escapeHtml(emp.email)}</div>
            </div>
          </div>
        </td>
        <td class="d-none d-md-table-cell">${escapeHtml(emp.position || '—')}</td>
        <td class="d-none d-lg-table-cell">${escapeHtml(emp.department_name || '—')}</td>
        <td class="d-none d-md-table-cell">${formatDate(emp.hire_date)}</td>
        <td><span class="status-pill status-${emp.status}">${statusLabel(emp.status)}</span></td>
        <td class="text-end row-actions">
          <button class="btn btn-sm btn-light" title="View" onclick="EmployeeApp.viewEmployee(${emp.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-light" title="Edit" onclick="EmployeeApp.editEmployee(${emp.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-light text-danger" title="Remove" onclick="EmployeeApp.confirmDelete(${emp.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function loadEmployees() {
    const tbody = el('employeeTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading employees...</td></tr>`;

    const params = new URLSearchParams({
      search: state.search,
      department: state.department,
      status: state.status,
      sort: state.sort,
      order: state.order,
      page: state.page,
      limit: state.limit
    });

    try {
      const result = await apiFetch(`/api/employees?${params.toString()}`);
      state.lastResults = result.data;

      if (!result.data.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-2"></i> No employees match your filters.
        </td></tr>`;
      } else {
        tbody.innerHTML = result.data.map(renderRow).join('');
      }

      renderPagination(result.pagination);
      renderSummary(result.pagination);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
        Couldn't reach the backend API.<br>
        <span class="small text-muted">${escapeHtml(err.message)} — check your API URL in Settings (⚙).</span>
      </td></tr>`;
      renderSummary(null);
    }
  }

  function renderSummary(pagination) {
    const summary = el('resultsSummary');
    if (!pagination || pagination.total === 0) {
      summary.textContent = 'No results';
      return;
    }
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    summary.textContent = `Showing ${start}–${end} of ${pagination.total}`;
  }

  function renderPagination(pagination) {
    const ul = el('pagination');
    ul.innerHTML = '';
    if (!pagination || pagination.totalPages <= 1) return;

    const makeItem = (label, page, disabled, active) => {
      const li = document.createElement('li');
      li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = '#';
      a.textContent = label;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (!disabled && !active) { state.page = page; loadEmployees(); }
      });
      li.appendChild(a);
      return li;
    };

    ul.appendChild(makeItem('«', pagination.page - 1, pagination.page === 1, false));

    const total = pagination.totalPages;
    const cur = pagination.page;
    const pages = new Set([1, total, cur, cur - 1, cur + 1]);
    let prev = 0;
    [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b).forEach(p => {
      if (prev && p - prev > 1) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = `<span class="page-link">…</span>`;
        ul.appendChild(li);
      }
      ul.appendChild(makeItem(String(p), p, false, p === cur));
      prev = p;
    });

    ul.appendChild(makeItem('»', pagination.page + 1, pagination.page === total, false));
  }

  // ---------- CRUD ----------
  function resetForm() {
    el('employeeForm').reset();
    el('empId').value = '';
    el('empStatus').value = 'active';
    el('employeeModalTitle').textContent = 'Add Employee';
  }

  async function viewEmployee(id) {
    try {
      const emp = await apiFetch(`/api/employees/${id}`);
      el('detailBody').innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
          ${emp.photo_url ? `<img src="${escapeHtml(emp.photo_url)}" class="emp-avatar" style="width:60px;height:60px;font-size:1.2rem;">`
            : `<div class="emp-avatar" style="width:60px;height:60px;font-size:1.2rem;">${initials(emp.first_name, emp.last_name)}</div>`}
          <div>
            <h5 class="mb-0">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</h5>
            <div class="text-muted">${escapeHtml(emp.position || '—')}</div>
          </div>
        </div>
        <dl class="row mb-0 small">
          <dt class="col-5">Email</dt><dd class="col-7">${escapeHtml(emp.email)}</dd>
          <dt class="col-5">Phone</dt><dd class="col-7">${escapeHtml(emp.phone || '—')}</dd>
          <dt class="col-5">Department</dt><dd class="col-7">${escapeHtml(emp.department_name || '—')}</dd>
          <dt class="col-5">Status</dt><dd class="col-7"><span class="status-pill status-${emp.status}">${statusLabel(emp.status)}</span></dd>
          <dt class="col-5">Hire Date</dt><dd class="col-7">${formatDate(emp.hire_date)}</dd>
          <dt class="col-5">Salary</dt><dd class="col-7">${formatMoney(emp.salary)}</dd>
          <dt class="col-5">Address</dt><dd class="col-7">${escapeHtml(emp.address || '—')}</dd>
          <dt class="col-5">Notes</dt><dd class="col-7">${escapeHtml(emp.notes || '—')}</dd>
        </dl>`;
      detailModal.show();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function editEmployee(id) {
    try {
      const emp = await apiFetch(`/api/employees/${id}`);
      el('empId').value = emp.id;
      el('empFirstName').value = emp.first_name || '';
      el('empLastName').value = emp.last_name || '';
      el('empEmail').value = emp.email || '';
      el('empPhone').value = emp.phone || '';
      el('empPosition').value = emp.position || '';
      el('empDepartment').value = emp.department_id || '';
      el('empStatus').value = emp.status || 'active';
      el('empHireDate').value = emp.hire_date ? emp.hire_date.substring(0, 10) : '';
      el('empSalary').value = emp.salary || '';
      el('empPhotoUrl').value = emp.photo_url || '';
      el('empAddress').value = emp.address || '';
      el('empNotes').value = emp.notes || '';
      el('employeeModalTitle').textContent = 'Edit Employee';
      employeeModal.show();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  let deleteId = null;
  function confirmDelete(id) {
    const emp = state.lastResults.find(e => e.id === id);
    deleteId = id;
    el('deleteEmployeeName').textContent = emp ? `${emp.first_name} ${emp.last_name}` : 'this employee';
    deleteModal.show();
  }

  async function doDelete() {
    try {
      await apiFetch(`/api/employees/${deleteId}`, { method: 'DELETE' });
      showToast('Employee removed');
      deleteModal.hide();
      loadEmployees();
      loadStats();
      loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function saveEmployee(e) {
    e.preventDefault();
    const id = el('empId').value;
    const payload = {
      first_name: el('empFirstName').value.trim(),
      last_name: el('empLastName').value.trim(),
      email: el('empEmail').value.trim(),
      phone: el('empPhone').value.trim(),
      position: el('empPosition').value.trim(),
      department_id: el('empDepartment').value || null,
      status: el('empStatus').value,
      hire_date: el('empHireDate').value || null,
      salary: el('empSalary').value || null,
      photo_url: el('empPhotoUrl').value.trim(),
      address: el('empAddress').value.trim(),
      notes: el('empNotes').value.trim()
    };

    const saveBtn = el('saveEmployeeBtn');
    saveBtn.disabled = true;
    saveBtn.querySelector('.btn-text').textContent = 'Saving...';

    try {
      if (id) {
        await apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Employee updated');
      } else {
        await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Employee added');
      }
      employeeModal.hide();
      resetForm();
      loadEmployees();
      loadStats();
      loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.querySelector('.btn-text').textContent = 'Save Employee';
    }
  }

  // ---------- CSV export ----------
  function exportCsv() {
    const rows = state.lastResults;
    if (!rows.length) { showToast('Nothing to export', 'error'); return; }
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Hire Date', 'Salary'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        r.first_name, r.last_name, r.email, r.phone || '', r.position || '',
        r.department_name || '', statusLabel(r.status), r.hire_date ? r.hire_date.substring(0, 10) : '', r.salary || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_page${state.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Sorting ----------
  function setupSorting() {
    document.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.sort === field) {
          state.order = state.order === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = field;
          state.order = 'asc';
        }
        state.page = 1;
        loadEmployees();
      });
    });
  }

  // ---------- Theme ----------
  function setupTheme() {
    const html = document.documentElement;
    const saved = localStorage.getItem('employeeDirectoryTheme') || 'light';
    html.setAttribute('data-bs-theme', saved);
    updateThemeIcon(saved);

    el('themeToggle').addEventListener('click', () => {
      const current = html.getAttribute('data-bs-theme');
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-bs-theme', next);
      localStorage.setItem('employeeDirectoryTheme', next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(theme) {
    el('themeToggle').innerHTML = theme === 'light'
      ? '<i class="bi bi-moon-stars"></i>'
      : '<i class="bi bi-sun"></i>';
  }

  // ---------- Settings ----------
  function setupSettings() {
    el('apiUrlInput').value = localStorage.getItem('employeeDirectoryApiUrl') || '';
    el('saveApiUrlBtn').addEventListener('click', () => {
      const val = el('apiUrlInput').value.trim();
      if (val) localStorage.setItem('employeeDirectoryApiUrl', val);
      else localStorage.removeItem('employeeDirectoryApiUrl');
      location.reload();
    });
  }

  // ---------- Debounce ----------
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  // ---------- Wire up ----------
  function init() {
    setupTheme();
    setupSettings();
    setupSorting();

    el('searchInput').addEventListener('input', debounce((e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadEmployees();
    }, 350));

    el('filterDepartment').addEventListener('change', (e) => {
      state.department = e.target.value;
      state.page = 1;
      loadEmployees();
    });

    el('filterStatus').addEventListener('change', (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadEmployees();
    });

    el('pageSizeSelect').addEventListener('change', (e) => {
      state.limit = Number(e.target.value);
      state.page = 1;
      loadEmployees();
    });

    el('exportBtn').addEventListener('click', exportCsv);
    el('confirmDeleteBtn').addEventListener('click', doDelete);
    el('employeeForm').addEventListener('submit', saveEmployee);
    el('employeeModal').addEventListener('hidden.bs.modal', resetForm);
    el('addEmployeeBtn').addEventListener('click', resetForm);

    checkConnection();
    loadDepartments();
    loadStats();
    loadEmployees();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Expose for inline onclick handlers
  window.EmployeeApp = { viewEmployee, editEmployee, confirmDelete };
})();
