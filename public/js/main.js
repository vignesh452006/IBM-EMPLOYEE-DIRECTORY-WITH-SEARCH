(function () {
  'use strict';

  /* ============================================================
     THEME SWITCHER (persisted in localStorage)
     ============================================================ */
  const THEME_KEY = 'td_theme';
  const root = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'light') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    document.querySelectorAll('.theme-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.theme === theme);
    });
    localStorage.setItem(THEME_KEY, theme);
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
  });

  /* ============================================================
     TOASTS - auto dismiss + manual close
     ============================================================ */
  function wireToasts() {
    document.querySelectorAll('.toast[data-autohide]').forEach((toast) => {
      const closeBtn = toast.querySelector('.toast-close');
      const remove = () => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 280);
      };
      if (closeBtn) closeBtn.addEventListener('click', remove);
      setTimeout(remove, 4500);
    });
  }
  wireToasts();

  /* ============================================================
     SCROLL REVEAL for elements appearing later
     ============================================================ */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
  }

  /* ============================================================
     VIEW TOGGLE (grid / list) - directory page only
     ============================================================ */
  const grid = document.getElementById('employeeGrid');
  const viewButtons = document.querySelectorAll('.view-btn');
  if (grid && viewButtons.length) {
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        viewButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        grid.classList.toggle('list-mode', view === 'list');
        grid.dataset.view = view;
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.replaceState({}, '', url);
      });
    });
  }

  /* ============================================================
     LIVE AJAX SEARCH & FILTER - directory page only
     ============================================================ */
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const departmentFilter = document.getElementById('departmentFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortSelect = document.getElementById('sortSelect');
  const resultCount = document.getElementById('resultCount');

  function statusLabel(s) {
    return { active: 'active', on_leave: 'on leave', inactive: 'inactive' }[s] || s;
  }

  function renderEmployeeCard(emp, index) {
    const avatar = emp.avatar_url || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(emp.full_name)}`;
    const badge = emp.department_name
      ? `<span class="dept-badge" style="--badge-color:${emp.department_color}">${emp.department_name}</span>`
      : '';
    return `
      <a href="/employee/${emp.id}" class="employee-card fade-up" style="animation-delay:${Math.min(index * 0.05, 0.5)}s">
        <div class="card-top">
          <img src="${avatar}" alt="${emp.full_name}" class="avatar" loading="lazy">
          <span class="status-dot status-${emp.status}" title="${statusLabel(emp.status)}"></span>
        </div>
        <h3 class="emp-name">${emp.full_name}</h3>
        <p class="emp-role">${emp.job_title || 'Team Member'}</p>
        ${badge}
        <div class="card-footer"><span class="emp-location">📍 ${emp.location || '—'}</span></div>
      </a>`;
  }

  function showSkeletons() {
    grid.innerHTML = Array.from({ length: 6 })
      .map(() => '<div class="skeleton-card"></div>')
      .join('');
  }

  let debounceTimer;
  async function fetchAndRender() {
    if (!grid) return;
    showSkeletons();

    const params = new URLSearchParams({
      q: searchInput ? searchInput.value : '',
      department: departmentFilter ? departmentFilter.value : '',
      status: statusFilter ? statusFilter.value : '',
      sort: sortSelect ? sortSelect.value : 'name_asc',
    });

    try {
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error('Request failed');

      if (resultCount) {
        resultCount.innerHTML = `<strong>${data.total}</strong> team member${data.total === 1 ? '' : 's'} found`;
      }

      if (!data.employees.length) {
        grid.innerHTML = `
          <div class="empty-state fade-up">
            <div class="empty-icon">🔍</div>
            <h3>No employees match your search</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>`;
        return;
      }

      grid.innerHTML = data.employees.map(renderEmployeeCard).join('');

      // update URL so the page is shareable/bookmarkable
      const url = new URL(window.location);
      Object.entries({ q: params.get('q'), department: params.get('department'), status: params.get('status'), sort: params.get('sort') })
        .forEach(([k, v]) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k)));
      window.history.replaceState({}, '', url);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state fade-up"><div class="empty-icon">⚠️</div><h3>Something went wrong</h3><p>Please try again.</p></div>`;
    }
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => e.preventDefault());

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchAndRender, 350);
      });
    }
    [departmentFilter, statusFilter, sortSelect].forEach((el) => {
      if (el) el.addEventListener('change', fetchAndRender);
    });
  }
})();
