/**
 * UX Improvements Module
 * 1. Auto-save/load data (localStorage)
 * 2. Currency converter
 * 3. Spending trends (multi-month)
 * 4. Budget progress bar on dashboard
 * 5. Print-friendly support
 */

// ========== 1. AUTO-SAVE / LOAD DATA ==========

const SAVE_KEY = 'finbot_user_data';
const SAVE_FIELDS = ['incomeInput', 'expenseInput', 'assetInput', 'subscriptionInput', 'budgetInput', 'savingsInput', 'adviseInput'];

/**
 * Save all input fields to localStorage
 */
function saveAllData() {
  const data = {};
  SAVE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  data._savedAt = new Date().toISOString();
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/**
 * Load saved data into input fields
 */
function loadSavedData() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    SAVE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });
    // Show saved indicator
    showSaveStatus('Data loaded from last session.');
  } catch (e) { /* ignore corrupted data */ }
}

/**
 * Clear all saved data
 */
function clearSavedData() {
  if (!confirm('Clear all saved data? This cannot be undone.')) return;
  localStorage.removeItem(SAVE_KEY);
  SAVE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  showSaveStatus('All data cleared.');
  if (typeof announce === 'function') announce('All saved data cleared.');
}

function showSaveStatus(msg) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

/**
 * Auto-save on input changes (debounced)
 */
function initAutoSave() {
  let saveTimer = null;
  SAVE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          saveAllData();
          showSaveStatus('Auto-saved ✓');
        }, 1500);
      });
    }
  });
  // Load on startup
  loadSavedData();
}

// ========== 2. CURRENCY CONVERTER ==========

// (Removed - feature was not needed)

// ========== BUDGET QUICK-SELECT ==========

/**
 * Set budget from the dropdown selector
 */
function setBudgetFromSelect() {
  const type = document.getElementById('budgetType').value;
  const amount = parseFloat(document.getElementById('budgetAmountInput').value);

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid budget amount greater than 0.');
    document.getElementById('budgetAmountInput').focus();
    return;
  }

  const typeLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  const label = typeLabels[type] || 'Monthly';

  // Build the budget text and set it in the textarea
  const budgetText = `${label} Limit: RM${amount.toFixed(2)}`;
  const textarea = document.getElementById('budgetInput');

  // Append or replace
  if (textarea.value.trim() && !textarea.value.includes('Limit:')) {
    textarea.value = budgetText + '\n' + textarea.value;
  } else {
    textarea.value = budgetText;
  }

  // Calculate breakdowns
  let daily, weekly, monthly;
  if (type === 'monthly') {
    monthly = amount;
    weekly = (amount / 4.33).toFixed(2);
    daily = (amount / 30).toFixed(2);
  } else if (type === 'weekly') {
    weekly = amount;
    monthly = (amount * 4.33).toFixed(2);
    daily = (amount / 7).toFixed(2);
  } else {
    daily = amount;
    weekly = (amount * 7).toFixed(2);
    monthly = (amount * 30).toFixed(2);
  }

  // Show the display
  const display = document.getElementById('budgetDisplay');
  display.style.display = 'block';
  display.innerHTML = `
    <strong>&#9989; Budget Set: ${label} Limit RM${amount.toFixed(2)}</strong><br>
    <span style="font-size:0.8rem;opacity:0.8;">
      Daily: RM${daily} &nbsp;|&nbsp; Weekly: RM${weekly} &nbsp;|&nbsp; Monthly: RM${monthly}
    </span>
  `;

  // Save
  if (typeof saveAllData === 'function') saveAllData();
  if (typeof announce === 'function') announce('Budget set: ' + label + ' limit RM' + amount.toFixed(2));
}

// ========== 3. SPENDING TRENDS (Multi-month) ==========

const TRENDS_KEY = 'finbot_monthly_trends';

/**
 * Save current month's data as a snapshot
 */
function saveMonthSnapshot() {
  const income = parseAmounts(document.getElementById('incomeInput').value);
  const expenses = parseAmounts(document.getElementById('expenseInput').value);

  if (income === 0 && expenses === 0) {
    alert('Please enter income and expenses data first.');
    return;
  }

  const now = new Date();
  const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthLabel = now.toLocaleDateString('en-MY', { year: 'numeric', month: 'short' });

  let trends = JSON.parse(localStorage.getItem(TRENDS_KEY) || '[]');

  // Update or add current month
  const existing = trends.findIndex(t => t.key === monthKey);
  const snapshot = { key: monthKey, label: monthLabel, income, expenses, balance: income - expenses };

  if (existing >= 0) {
    trends[existing] = snapshot;
  } else {
    trends.push(snapshot);
  }

  // Keep last 12 months
  trends = trends.sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  localStorage.setItem(TRENDS_KEY, JSON.stringify(trends));

  renderTrendsChart();
  showSaveStatus('Month snapshot saved: ' + monthLabel);
  if (typeof announce === 'function') announce('Monthly snapshot saved for ' + monthLabel);
}

/**
 * Render spending trends as a simple bar chart
 */
function renderTrendsChart() {
  const container = document.getElementById('trendsChart');
  if (!container) return;

  const trends = JSON.parse(localStorage.getItem(TRENDS_KEY) || '[]');

  if (trends.length === 0) {
    container.innerHTML = '<p class="trends-empty">No monthly data saved yet. Click "Save This Month" to start tracking.</p>';
    return;
  }

  const maxVal = Math.max(...trends.map(t => Math.max(t.income, t.expenses)));

  let html = '<div class="trends-grid">';
  trends.forEach(t => {
    const incPct = maxVal > 0 ? (t.income / maxVal) * 100 : 0;
    const expPct = maxVal > 0 ? (t.expenses / maxVal) * 100 : 0;
    html += `<div class="trends-month">
      <div class="trends-bars">
        <div class="trends-bar trends-income" style="height:${incPct}%" title="Income: RM${t.income.toLocaleString()}" aria-label="Income RM${t.income.toLocaleString()}"></div>
        <div class="trends-bar trends-expense" style="height:${expPct}%" title="Expenses: RM${t.expenses.toLocaleString()}" aria-label="Expenses RM${t.expenses.toLocaleString()}"></div>
      </div>
      <div class="trends-label">${t.label.split(' ')[0]}</div>
    </div>`;
  });
  html += '</div>';

  // Legend
  html += '<div class="trends-legend"><span class="trends-legend-item"><span class="trends-dot trends-income"></span>Income</span><span class="trends-legend-item"><span class="trends-dot trends-expense"></span>Expenses</span></div>';

  // Data table (accessible)
  html += '<details class="trends-details"><summary>View data table</summary><table class="trends-table"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Balance</th></tr></thead><tbody>';
  trends.forEach(t => {
    html += `<tr><td>${t.label}</td><td>RM${t.income.toLocaleString()}</td><td>RM${t.expenses.toLocaleString()}</td><td style="color:${t.balance >= 0 ? '#4ade80' : '#f87171'}">RM${t.balance.toLocaleString()}</td></tr>`;
  });
  html += '</tbody></table></details>';

  container.innerHTML = html;
}

/**
 * Clear all trend data
 */
function clearTrends() {
  if (!confirm('Clear all monthly trend data?')) return;
  localStorage.removeItem(TRENDS_KEY);
  renderTrendsChart();
}

// ========== 4. BUDGET PROGRESS BAR ON DASHBOARD ==========

/**
 * Update budget progress bar on dashboard
 */
function updateBudgetProgress() {
  const container = document.getElementById('budgetProgressBar');
  if (!container) return;

  const budgetText = document.getElementById('budgetInput').value;
  const expenseText = document.getElementById('expenseInput').value;

  // Parse budget limit
  let budgetLimit = 0;
  const budgetMatch = budgetText.match(/(?:monthly|budget)[:\s]*RM\s?([\d,]+)/i);
  if (budgetMatch) budgetLimit = parseFloat(budgetMatch[1].replace(/,/g, ''));

  // If no match, try plain number
  if (budgetLimit === 0) {
    const plainMatch = budgetText.match(/RM\s?([\d,]+)/i);
    if (plainMatch) budgetLimit = parseFloat(plainMatch[1].replace(/,/g, ''));
  }

  const totalExpenses = parseAmounts(expenseText);

  if (budgetLimit <= 0) {
    container.innerHTML = '<p style="font-size:0.8rem;color:rgba(255,255,255,0.4);">Set a budget in Step 3 to see progress here.</p>';
    return;
  }

  const pct = Math.min(100, (totalExpenses / budgetLimit) * 100);
  const remaining = budgetLimit - totalExpenses;

  let color, status;
  if (pct <= 50) { color = '#4ade80'; status = 'On Track'; }
  else if (pct <= 75) { color = '#fbbf24'; status = 'Moderate'; }
  else if (pct <= 100) { color = '#f87171'; status = 'Near Limit'; }
  else { color = '#ef4444'; status = 'Over Budget!'; }

  container.innerHTML = `
    <div class="budget-prog-header">
      <span>Budget Usage</span>
      <span style="color:${color};font-weight:600;">${pct.toFixed(0)}% — ${status}</span>
    </div>
    <div class="budget-prog-track">
      <div class="budget-prog-fill" style="width:${Math.min(pct, 100)}%;background:${color};" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="Budget usage ${pct.toFixed(0)} percent"></div>
    </div>
    <div class="budget-prog-info">
      <span>Spent: RM${totalExpenses.toLocaleString()}</span>
      <span>Budget: RM${budgetLimit.toLocaleString()}</span>
    </div>
    ${remaining < 0 ? '<p style="color:#f87171;font-size:0.78rem;margin-top:6px;">⚠ Over budget by RM' + Math.abs(remaining).toLocaleString() + '</p>' : '<p style="color:rgba(255,255,255,0.5);font-size:0.78rem;margin-top:6px;">Remaining: RM' + remaining.toLocaleString() + '</p>'}
  `;
}

// ========== 5. PRINT-FRIENDLY ==========

function printReport() {
  window.print();
}

// ========== INIT ==========

function initImprovements() {
  initAutoSave();
  renderTrendsChart();

  // Update budget progress when dashboard is shown
  const origShowPage = window.showPage;
  if (origShowPage) {
    window.showPage = function(pageId) {
      origShowPage(pageId);
      if (pageId === 'dashboard') {
        updateBudgetProgress();
      }
      if (pageId === 'trends') {
        renderTrendsChart();
      }
      if (pageId === 'chart' || pageId === 'analytics') {
        generatePieChart();
      }
    };
  }
}

// ========== PIE CHART (Auto-generate) ==========

function generatePieChart() {
  const container = document.getElementById('pieChart');
  if (!container) return;

  const text = document.getElementById('expenseInput').value;
  if (!text.trim()) {
    container.innerHTML = '<p style="opacity:0.4;text-align:center;padding:30px;">Add expenses in My Finances to see your chart.</p>';
    return;
  }

  const categories = {};
  text.split('\n').forEach(function(line) {
    const match = line.match(/(.+?)\s*RM\s?([\d,]+(\.\d+)?)/i);
    if (match) {
      const cat = match[1].trim();
      const amt = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(amt) && amt > 0 && cat) categories[cat] = (categories[cat] || 0) + amt;
    }
  });

  const entries = Object.entries(categories).sort(function(a, b) { return b[1] - a[1]; });
  if (entries.length === 0) {
    container.innerHTML = '<p style="opacity:0.4;text-align:center;padding:30px;">Could not parse expenses. Use format: Category RM Amount</p>';
    return;
  }

  const total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
  const colors = ['#7c6ff7','#f87171','#4ade80','#fbbf24','#60a5fa','#f472b6','#2dd4bf','#fb923c','#a78bfa','#34d399'];

  // Build SVG pie
  var cum = 0, paths = '';
  entries.forEach(function(entry, i) {
    var angle = (entry[1] / total) * 360;
    var s = cum, e2 = cum + angle;
    var la = angle > 180 ? 1 : 0;
    var x1 = 110 + 90 * Math.cos((s - 90) * Math.PI / 180);
    var y1 = 110 + 90 * Math.sin((s - 90) * Math.PI / 180);
    var x2 = 110 + 90 * Math.cos((e2 - 90) * Math.PI / 180);
    var y2 = 110 + 90 * Math.sin((e2 - 90) * Math.PI / 180);
    paths += '<path d="M110,110 L' + x1 + ',' + y1 + ' A90,90 0 ' + la + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + colors[i % colors.length] + '"/>';
    cum = e2;
  });

  var legend = '<ul style="list-style:none;padding:0;">';
  entries.forEach(function(e, i) {
    var pct = ((e[1] / total) * 100).toFixed(1);
    legend += '<li style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.82rem;">' +
      '<span style="width:12px;height:12px;border-radius:3px;background:' + colors[i % colors.length] + ';display:inline-block;"></span>' +
      e[0] + ' — RM' + e[1].toLocaleString() + ' (' + pct + '%)</li>';
  });
  legend += '</ul>';

  container.innerHTML = '<div style="display:flex;align-items:center;gap:30px;flex-wrap:wrap;justify-content:center;">' +
    '<svg viewBox="0 0 220 220" style="width:200px;height:200px;">' + paths + '</svg>' + legend + '</div>';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImprovements);
} else {
  initImprovements();
}
