const STREAM_URLS = {
  financial_dashboard: '__URL_FINANCIAL_DASHBOARD__',
  budget_monitor: '__URL_BUDGET_MONITOR__',
  ai_financial_recommendation: '__URL_AI_FINANCIAL_RECOMMENDATION__',
  financial_health_report: '__URL_FINANCIAL_HEALTH_REPORT__',
  subscription_reminder: '__URL_SUBSCRIPTION_REMINDER__',
  ai_financial_advisor_discussions: '__URL_AI_FINANCIAL_ADVISOR_DISCUSSIONS__',
};

// Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.sidebar-nav a, .mobile-nav a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
  document.querySelectorAll('[data-page="' + pageId + '"]').forEach(a => { a.classList.add('active'); a.setAttribute('aria-current', 'page'); });
  window.scrollTo(0, 0);
  if (pageId === 'home') { updateLocalDashboard(); generateHomeInsight(false); }
  if (pageId === 'insights') { renderTrendsChart(); generatePieChart(); }
  if (pageId === 'calendar') { renderCalendar(); }
}

function showMoneyTab(tab) {
  document.querySelectorAll('.money-tab').forEach(t => t.style.display = 'none');
  document.getElementById('moneyTab-' + tab).style.display = 'block';
  document.querySelectorAll('#moneyTabs .tab').forEach(t => t.classList.remove('active'));
  // Find the correct tab button and activate it
  const tabs = document.querySelectorAll('#moneyTabs .tab');
  const tabNames = ['income', 'expenses', 'assets', 'subscriptions'];
  const idx = tabNames.indexOf(tab);
  if (idx >= 0 && tabs[idx]) { tabs[idx].classList.add('active'); }
  else if (typeof event !== 'undefined' && event && event.target) { event.target.classList.add('active'); }
}

/** Navigate to Money page and open a specific tab */
function goToMoneyTab(tab) {
  showPage('money');
  showMoneyTab(tab);
}

// FAB
function toggleFab() { document.getElementById('fabMenu').classList.toggle('open'); }
function closeFab() { document.getElementById('fabMenu').classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.fab') && !e.target.closest('.fab-menu')) closeFab(); });

// Parse amounts - extracts RM values, ignores dates in [YYYY-MM-DD] format
function parseAmounts(text) {
  // Remove date markers before parsing to avoid counting date digits as amounts
  const cleaned = text.replace(/\[\d{4}-\d{2}-\d{2}\]/g, '');
  const matches = cleaned.match(/RM\s?[\d,]+(\.\d+)?/gi) || [];
  return matches.reduce((sum, m) => { const n = parseFloat(m.replace(/[RM,\s]/gi, '')); return sum + (isNaN(n) ? 0 : n); }, 0);
}

// ========== CENTRAL FINANCIAL SUMMARY ==========
// Single source of truth for all financial calculations
function getFinancialSummary() {
  const incomeText = document.getElementById('incomeInput') ? document.getElementById('incomeInput').value : '';
  const expenseText = document.getElementById('expenseInput') ? document.getElementById('expenseInput').value : '';
  const assetText = document.getElementById('assetInput') ? document.getElementById('assetInput').value : '';
  const subsText = document.getElementById('subscriptionInput') ? document.getElementById('subscriptionInput').value : '';
  const budgetText = document.getElementById('budgetInput') ? document.getElementById('budgetInput').value : '';
  const savingsText = document.getElementById('savingsInput') ? document.getElementById('savingsInput').value : '';

  const totalIncome = Math.round(parseAmounts(incomeText) * 100) / 100;
  const totalExpenses = Math.round(parseAmounts(expenseText) * 100) / 100;
  const totalAssets = Math.round(parseAmounts(assetText) * 100) / 100;
  const currentBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round(((currentBalance / totalIncome) * 100) * 10) / 10 : 0;
  const expensePercentage = totalIncome > 0 ? Math.round(((totalExpenses / totalIncome) * 100) * 10) / 10 : 0;

  return {
    totalIncome,
    totalExpenses,
    totalAssets,
    currentBalance,
    savingsRate,
    expensePercentage,
    // Raw text for AI context
    incomeText,
    expenseText,
    assetText,
    subsText,
    budgetText,
    savingsText
  };
}


/**
 * Parse transactions with dates from textarea text.
 * Format: "Category RM123.45 [2026-08-25]" or "Category RM123.45" (no date = today)
 * Returns array of { category, amount, date } objects.
 */
function parseTransactions(text) {
  if (!text || !text.trim()) return [];
  var today = new Date().toISOString().split('T')[0];
  var transactions = [];
  text.split('\n').forEach(function(line) {
    if (!line.trim()) return;
    var dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/);
    var txDate = dateMatch ? dateMatch[1] : today;
    var amtMatch = line.match(/(.+?)\s*RM\s?([\d,]+(\.\d+)?)/i);
    if (amtMatch) {
      var category = amtMatch[1].trim();
      var amount = parseFloat(amtMatch[2].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && category) {
        transactions.push({ category: category, amount: Math.round(amount * 100) / 100, date: txDate });
      }
    }
  });
  return transactions;
}

/**
 * Get transactions grouped by date. Used by future Calendar feature.
 * Returns: { "2026-08-25": { income: [...], expenses: [...] }, ... }
 */
function getTransactionsByDate() {
  var incomeTransactions = parseTransactions(document.getElementById('incomeInput') ? document.getElementById('incomeInput').value : '');
  var expenseTransactions = parseTransactions(document.getElementById('expenseInput') ? document.getElementById('expenseInput').value : '');

  var grouped = {};

  incomeTransactions.forEach(function(tx) {
    if (!grouped[tx.date]) grouped[tx.date] = { income: [], expenses: [] };
    grouped[tx.date].income.push(tx);
  });

  expenseTransactions.forEach(function(tx) {
    if (!grouped[tx.date]) grouped[tx.date] = { income: [], expenses: [] };
    grouped[tx.date].expenses.push(tx);
  });

  return grouped;
}

/**
 * Get transactions for a specific month (YYYY-MM format).
 * Returns { income: [...], expenses: [...], totalIncome, totalExpenses }
 */
function getTransactionsForMonth(yearMonth) {
  var allByDate = getTransactionsByDate();
  var income = [], expenses = [];

  Object.keys(allByDate).forEach(function(date) {
    if (date.startsWith(yearMonth)) {
      income = income.concat(allByDate[date].income);
      expenses = expenses.concat(allByDate[date].expenses);
    }
  });

  return {
    income: income,
    expenses: expenses,
    totalIncome: Math.round(income.reduce(function(s, t) { return s + t.amount; }, 0) * 100) / 100,
    totalExpenses: Math.round(expenses.reduce(function(s, t) { return s + t.amount; }, 0) * 100) / 100
  };
}

// ========== FINANCIAL CALENDAR ==========
var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth(); // 0-indexed
var calSelectedDate = null;

function calPrevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar().textContent + ' shown.' }
function calNextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar().textContent + ' shown.' }
function calToday() { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); calSelectedDate = new Date().toISOString().split('T')[0]; renderCalendar().textContent + '.' }

function renderCalendar() {
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var yearMonth = calYear + '-' + String(calMonth + 1).padStart(2, '0');

  // Update title
  document.getElementById('calMonthTitle').textContent = monthNames[calMonth] + ' ' + calYear;

  // Get transactions for this month
  var monthData = getTransactionsForMonth(yearMonth);

  // Update monthly summary
  document.getElementById('calTotalIncome').textContent = 'RM ' + monthData.totalIncome.toFixed(2);
  document.getElementById('calTotalExpenses').textContent = 'RM ' + monthData.totalExpenses.toFixed(2);
  var net = monthData.totalIncome - monthData.totalExpenses;
  var netEl = document.getElementById('calTotalNet');
  netEl.textContent = (net >= 0 ? '+' : '') + 'RM ' + net.toFixed(2);
  netEl.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';

  // Group by day
  var dayMap = {};
  monthData.income.forEach(function(tx) {
    var day = parseInt(tx.date.split('-')[2]);
    if (!dayMap[day]) dayMap[day] = { income: 0, expenses: 0, count: 0 };
    dayMap[day].income += tx.amount;
    dayMap[day].count++;
  });
  monthData.expenses.forEach(function(tx) {
    var day = parseInt(tx.date.split('-')[2]);
    if (!dayMap[day]) dayMap[day] = { income: 0, expenses: 0, count: 0 };
    dayMap[day].expenses += tx.amount;
    dayMap[day].count++;
  });

  // Show/hide empty message
  var hasActivity = Object.keys(dayMap).length > 0;
  document.getElementById('calEmptyMsg').style.display = hasActivity ? 'none' : 'block';

  // Build calendar grid
  var firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var today = new Date().toISOString().split('T')[0];

  // Adjust so Monday is first (0=Mon)
  var startOffset = (firstDay + 6) % 7;

  var html = '';
  // Headers
  var dayNames = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  dayNames.forEach(function(d) { html += '<div class="cal-header">' + d + '</div>'; });

  // Empty cells before first day
  for (var i = 0; i < startOffset; i++) {
    html += '<div class="cal-cell cal-empty"></div>';
  }

  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = yearMonth + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === today;
    var isSelected = dateStr === calSelectedDate;
    var dayData = dayMap[d];

    var classes = 'cal-cell';
    if (isToday) classes += ' cal-today';
    if (isSelected) classes += ' cal-selected';

    // Build accessible label
    var ariaLabel = d + ' ' + monthNames[calMonth] + ' ' + calYear;
    if (isToday) ariaLabel += '. Today';
    if (isSelected) ariaLabel += '. Selected';
    if (dayData) {
      var dayNet = dayData.income - dayData.expenses;
      ariaLabel += '. Income RM' + dayData.income.toFixed(0) + '. Expenses RM' + dayData.expenses.toFixed(0) + '. Net ' + (dayNet >= 0 ? 'RM' : 'negative RM') + Math.abs(dayNet).toFixed(0) + '. ' + dayData.count + ' transaction' + (dayData.count !== 1 ? 's' : '');
    } else {
      ariaLabel += '. No transactions';
    }

    html += '<div class="' + classes + '" onclick="calSelectDay(\'' + dateStr + '\')" tabindex="0" role="button" aria-label="' + ariaLabel + '"';
    if (isToday) html += ' aria-current="date"';
    if (isSelected) html += ' aria-pressed="true"';
    html += '>';

    html += '<div class="cal-day-num">' + d + '</div>';

    if (dayData) {
      if (dayData.income > 0) html += '<div class="cal-day-income">+RM' + (dayData.income >= 1000 ? (dayData.income/1000).toFixed(1) + 'K' : dayData.income.toFixed(0)) + '</div>';
      if (dayData.expenses > 0) html += '<div class="cal-day-expense">-RM' + (dayData.expenses >= 1000 ? (dayData.expenses/1000).toFixed(1) + 'K' : dayData.expenses.toFixed(0)) + '</div>';
      if (dayData.count > 1) html += '<div class="cal-day-count">' + dayData.count + ' txns</div>';
    }

    html += '</div>';
  }

  document.getElementById('calGrid').innerHTML = html;

  // Add keyboard support to cal cells
  document.querySelectorAll('.cal-cell:not(.cal-empty)').forEach(function(cell) {
    cell.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cell.click(); } });
  });

  // Refresh detail if a date is selected
  if (calSelectedDate) calShowDayDetail(calSelectedDate);
}

function calSelectDay(dateStr) {
  calSelectedDate = dateStr;
  // Update visual selection and aria-pressed
  document.querySelectorAll('.cal-cell').forEach(function(c) { c.classList.remove('cal-selected'); c.removeAttribute('aria-pressed'); });
  if (event && event.currentTarget) { event.currentTarget.classList.add('cal-selected'); event.currentTarget.setAttribute('aria-pressed', 'true'); }
  calShowDayDetail(dateStr);
}

function calShowDayDetail(dateStr) {
  var detail = document.getElementById('calDayDetail');
  var content = document.getElementById('calDayContent');

  var allByDate = getTransactionsByDate();
  var dayTx = allByDate[dateStr];

  if (!dayTx || (dayTx.income.length === 0 && dayTx.expenses.length === 0)) {
    detail.style.display = 'block';
    var parts = dateStr.split('-');
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var displayDate = parseInt(parts[2]) + ' ' + monthNames[parseInt(parts[1])-1] + ' ' + parts[0];
    content.innerHTML = '<h2 style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:8px;">' + displayDate + '</h2><p style="color:var(--text-secondary);font-size:0.85rem;">No transactions on this date.</p>';
    return;
  }

  var totalInc = dayTx.income.reduce(function(s,t){ return s + t.amount; }, 0);
  var totalExp = dayTx.expenses.reduce(function(s,t){ return s + t.amount; }, 0);
  var net = totalInc - totalExp;

  var parts = dateStr.split('-');
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var displayDate = parseInt(parts[2]) + ' ' + monthNames[parseInt(parts[1])-1] + ' ' + parts[0];

  var html = '<h2 style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">' + displayDate + '</h2>';

  // Summary
  html += '<div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">';
  html += '<div style="font-size:0.82rem;"><span style="color:var(--text-secondary);">Income</span><br><strong style="color:var(--green);">RM' + totalInc.toFixed(2) + '</strong></div>';
  html += '<div style="font-size:0.82rem;"><span style="color:var(--text-secondary);">Expenses</span><br><strong style="color:var(--red);">RM' + totalExp.toFixed(2) + '</strong></div>';
  html += '<div style="font-size:0.82rem;"><span style="color:var(--text-secondary);">Net</span><br><strong style="color:' + (net >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + (net >= 0 ? '+' : '') + 'RM' + net.toFixed(2) + '</strong></div>';
  html += '</div>';

  // Transactions list
  if (dayTx.income.length > 0) {
    html += '<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px;">Income</div>';
    dayTx.income.forEach(function(tx) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.83rem;"><span style="color:var(--text);">' + tx.category + '</span><span style="color:var(--green);font-weight:600;">+RM' + tx.amount.toFixed(2) + '</span></div>';
    });
  }

  if (dayTx.expenses.length > 0) {
    html += '<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-top:12px;margin-bottom:6px;">Expenses</div>';
    dayTx.expenses.forEach(function(tx) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.83rem;"><span style="color:var(--text);">' + tx.category + '</span><span style="color:var(--red);font-weight:600;">-RM' + tx.amount.toFixed(2) + '</span></div>';
    });
  }

  detail.style.display = 'block';
  content.innerHTML = html;
}

// Dashboard calculations — uses central summary
function updateLocalDashboard() {
  const s = getFinancialSummary();

  document.getElementById('scIncome').textContent = 'RM ' + s.totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('scExpenses').textContent = 'RM ' + s.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('scBalance').textContent = 'RM ' + s.currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('scAssets').textContent = 'RM ' + s.totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('scSavingsRate').textContent = s.savingsRate + '%';

  // Mini bar chart for balance card
  const barsEl = document.getElementById('balanceMiniBars');
  if (barsEl) {
    const vals = [s.totalIncome * 0.7, s.totalIncome * 0.85, s.totalIncome, s.totalIncome * 0.9, s.currentBalance, s.currentBalance * 1.1, s.currentBalance];
    const max = Math.max(...vals, 1);
    barsEl.innerHTML = vals.map(v => '<div class="mini-bar" style="height:' + Math.max(4, (v / max) * 36) + 'px;"></div>').join('');
  }

  // Mini line for income card
  const incLine = document.getElementById('incomeLineChart');
  if (incLine && s.totalIncome > 0) {
    incLine.innerHTML = '<svg viewBox="0 0 100 40"><polyline points="0,35 15,28 30,30 45,20 60,22 75,15 100,10" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  // Mini line for expense card
  const expLine = document.getElementById('expenseLineChart');
  if (expLine && s.totalExpenses > 0) {
    expLine.innerHTML = '<svg viewBox="0 0 100 40"><polyline points="0,30 15,25 30,28 45,20 60,30 75,25 100,22" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  if (typeof updateBudgetProgress === 'function') updateBudgetProgress();
  updateHomePieChart();
  updateHomeExpenseBreakdown();
  updateHomeMonthlyOverview();
}

function updateHomePieChart() {
  const text = document.getElementById('expenseInput').value;
  if (!text.trim()) return;
  const categories = {};
  text.split('\n').forEach(line => {
    var cleanLine = line.replace(/\[\d{4}-\d{2}-\d{2}\]/g, '').trim();
    const match = cleanLine.match(/(.+?)\s*RM\s?([\d,]+(\.\d+)?)/i);
    if (match) { const cat = match[1].trim(); const amt = parseFloat(match[2].replace(/,/g,'')); if (!isNaN(amt)&&cat) categories[cat]=(categories[cat]||0)+amt; }
  });
  const entries = Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if (entries.length===0) return;
  const total = entries.reduce((s,e)=>s+e[1],0);
  const colors = ['#6366f1','#ef4444','#10b981','#f59e0b','#ec4899'];
  let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  entries.forEach((e,i) => {
    const pct = ((e[1]/total)*100).toFixed(0);
    html += `<div style="display:flex;align-items:center;gap:10px;"><div style="width:10px;height:10px;border-radius:3px;background:${colors[i%5]}"></div><span style="flex:1;font-size:0.82rem;">${e[0]}</span><span style="font-size:0.82rem;font-weight:600;">RM${e[1].toLocaleString()}</span><span style="font-size:0.75rem;color:var(--text-secondary);">${pct}%</span></div>`;
  });
  html += '</div>';
  document.getElementById('homePieChart').innerHTML = html;
}

// Compact Expense Breakdown for Home (reuses same data as Insights pieChart)
function updateHomeExpenseBreakdown() {
  var container = document.getElementById('homeExpenseBreakdown');
  if (!container) return;
  var text = document.getElementById('expenseInput').value;
  if (!text.trim()) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.82rem;text-align:center;padding:20px;">No expense data for this month yet.</p>';
    return;
  }
  var categories = {};
  text.split('\n').forEach(function(line) {
    var cleanLine = line.replace(/\[\d{4}-\d{2}-\d{2}\]/g, '').trim();
    var match = cleanLine.match(/(.+?)\s*RM\s?([\d,]+(\.\d+)?)/i);
    if (match) { var cat = match[1].trim(); var amt = parseFloat(match[2].replace(/,/g,'')); if (!isNaN(amt) && amt > 0 && cat) categories[cat] = (categories[cat] || 0) + amt; }
  });
  var entries = Object.entries(categories).sort(function(a,b){ return b[1]-a[1]; });
  if (entries.length === 0) { container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.82rem;text-align:center;padding:20px;">Could not parse expenses.</p>'; return; }
  var total = entries.reduce(function(s,e){ return s + e[1]; }, 0);
  var colors = ['#6366f1','#ef4444','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];

  // Build compact horizontal bars
  var html = '<div style="display:flex;flex-direction:column;gap:6px;">';
  entries.slice(0, 5).forEach(function(e, i) {
    var pct = ((e[1] / total) * 100).toFixed(1);
    html += '<div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;">';
    html += '<span style="flex:1;color:var(--text);">' + e[0] + '</span>';
    html += '<span style="font-weight:600;color:var(--text);min-width:70px;text-align:right;">RM' + e[1].toFixed(2) + '</span>';
    html += '<div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + colors[i % colors.length] + ';border-radius:3px;"></div></div>';
    html += '<span style="min-width:36px;text-align:right;color:var(--text-secondary);font-size:0.72rem;">' + pct + '%</span>';
    html += '</div>';
  });
  if (entries.length > 5) {
    html += '<p style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px;">+ ' + (entries.length - 5) + ' more categories</p>';
  }
  html += '<p style="font-size:0.75rem;color:var(--text-secondary);margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">Total: <strong style="color:var(--text);">RM' + total.toFixed(2) + '</strong></p>';
  html += '</div>';
  container.innerHTML = html;
}

// Monthly Overview bar chart for Home (reuses centralized summary)
function updateHomeMonthlyOverview() {
  var container = document.getElementById('homeMonthlyOverview');
  if (!container) return;
  var s = getFinancialSummary();
  if (s.totalIncome === 0 && s.totalExpenses === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.82rem;text-align:center;padding:20px;">Add your first transaction to see your monthly overview.</p>';
    return;
  }
  var max = Math.max(s.totalIncome, s.totalExpenses, 1);

  var html = '<div style="display:flex;flex-direction:column;gap:12px;">';

  // Income bar
  html += '<div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--text-secondary);">Income</span><span style="font-weight:600;color:var(--green, #10b981);">RM' + s.totalIncome.toFixed(2) + '</span></div>';
  html += '<div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + ((s.totalIncome / max) * 100) + '%;background:var(--green, #10b981);border-radius:4px;"></div></div>';
  html += '</div>';

  // Expenses bar
  html += '<div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--text-secondary);">Expenses</span><span style="font-weight:600;color:var(--red, #ef4444);">RM' + s.totalExpenses.toFixed(2) + '</span></div>';
  html += '<div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + ((s.totalExpenses / max) * 100) + '%;background:var(--red, #ef4444);border-radius:4px;"></div></div>';
  html += '</div>';

  // Balance
  var balColor = s.currentBalance >= 0 ? 'var(--green, #10b981)' : 'var(--red, #ef4444)';
  html += '<div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px;">';
  html += '<div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="color:var(--text-secondary);">Balance</span><span style="font-weight:700;color:' + balColor + ';">RM' + s.currentBalance.toFixed(2) + '</span></div>';
  html += '<div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">Savings Rate: ' + s.savingsRate + '%</div>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

// Markdown
function renderMarkdown(text) {
  if (!text) return '<p style="color:var(--text-secondary);">No response received.</p>';
  
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect table rows (lines starting and ending with |)
    if (line.trim().match(/^\|.*\|$/)) {
      // Skip separator rows like |---|---|
      if (line.trim().match(/^\|[\s\-:|]+\|$/)) continue;
      
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Parse cells
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      continue;
    }

    // If we were in a table and hit a non-table line, flush the table
    if (inTable) {
      html += buildTable(tableRows);
      inTable = false;
      tableRows = [];
    }

    // Regular markdown rendering
    if (line.match(/^---+$/)) { html += '<hr>'; continue; }
    if (line.match(/^### /)) { html += '<h3>' + rl(line.slice(4)) + '</h3>'; continue; }
    if (line.match(/^## /)) { html += '<h2>' + rl(line.slice(3)) + '</h2>'; continue; }
    if (line.match(/^# /)) { html += '<h1>' + rl(line.slice(2)) + '</h1>'; continue; }
    if (line.match(/^\d+\.\s/)) { html += '<li>' + rl(line.replace(/^\d+\.\s/, '')) + '</li>'; continue; }
    if (line.match(/^[-*]\s/)) { html += '<li>' + rl(line.slice(2)) + '</li>'; continue; }
    if (line.trim() === '') { html += '<br>'; continue; }
    html += '<p>' + rl(line) + '</p>';
  }

  // Flush any remaining table
  if (inTable) {
    html += buildTable(tableRows);
  }

  return html;
}

function buildTable(rows) {
  if (rows.length === 0) return '';
  let html = '<table class="ai-table"><thead><tr>';
  // First row is header
  rows[0].forEach(cell => { html += '<th>' + rl(cell) + '</th>'; });
  html += '</tr></thead><tbody>';
  for (let i = 1; i < rows.length; i++) {
    html += '<tr>';
    rows[i].forEach(cell => { html += '<td>' + rl(cell) + '</td>'; });
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function rl(t) { return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>'); }

// AI Fetch
async function fetchAI(url, body, panelId) {
  const panel = document.getElementById(panelId);
  panel.style.display = 'block';
  panel.setAttribute('aria-busy','true');

  // Validate URL before making request
  if (!url || url.includes('__URL_') || url === 'undefined' || url === '') {
    panel.innerHTML = '<div class="error">⚠ AI backend not configured. The API URL placeholder has not been replaced during deployment.<br><br>This usually means:<br>• The GitHub Actions deploy workflow has not run yet<br>• The CloudFormation stack outputs are not available<br><br>Please re-run the deployment workflow or manually upload the frontend after deployment.</div>';
    panel.setAttribute('aria-busy','false');
    console.error('[FinBot] fetchAI failed: URL is a placeholder or empty.', { url, panelId });
   
    return;
  }

  panel.innerHTML = '<div class="loading-msg"><span class="spinner"></span>Generating AI response...</div>';
 
  try {
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[FinBot] API Error:', { status: res.status, url: url.replace(/https?:\/\/[^/]+/, '[endpoint]'), body: errorBody.slice(0, 500) });
      throw new Error('HTTP '+res.status+' - '+errorBody.slice(0,200));
    }
    const data = await res.json();
    if (data.error) {
      console.error('[FinBot] AI Error:', { url: url.replace(/https?:\/\/[^/]+/, '[endpoint]'), error: data.error });
      throw new Error(data.error);
    }

    // Handle structured insight (from dashboard)
    if (data.insight && panelId === 'outputDashboard') {
      panel.innerHTML = renderInsight(data.insight);
    } else {
      // Other AI features still use markdown
      panel.innerHTML = renderMarkdown(data.response || '');
    }

    panel.setAttribute('aria-busy','false');
   
  } catch (err) {
    panel.innerHTML = '<div class="error">⚠ Error: '+err.message+'</div>';
    panel.setAttribute('aria-busy','false');
   
  }
}

/**
 * Render structured AI insight (no Markdown)
 */
function renderInsight(insight) {
  try {
    const score = insight.healthScore || 50;
    const status = insight.healthStatus || 'Fair';
    const summary = insight.summary || 'Financial data received.';
    const priority = insight.priorityInsight || null;
    const recs = (insight.recommendations || []).slice(0, 3);

    // Score color
    let scoreColor = 'var(--green)';
    if (score < 40) scoreColor = 'var(--red)';
    else if (score < 60) scoreColor = 'var(--yellow)';
    else if (score < 75) scoreColor = 'var(--accent)';

    // Priority type icon
    let prIcon = '✓', prColor = 'var(--green)';
    if (priority && priority.type === 'warning') { prIcon = '⚠'; prColor = 'var(--yellow)'; }
    if (priority && priority.type === 'critical') { prIcon = '⛔'; prColor = 'var(--red)'; }

    let html = '<div class="insight-result">';

    // Health score
    html += '<div class="insight-score" style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">';
    html += '<div style="width:56px;height:56px;border-radius:50%;border:3px solid '+scoreColor+';display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;color:'+scoreColor+';">'+score+'</div>';
    html += '<div><div style="font-size:0.9rem;font-weight:600;color:var(--text);">Financial Health: '+status+'</div>';
    html += '<div style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px;">'+summary+'</div></div>';
    html += '</div>';

    // Priority insight
    if (priority && priority.title) {
      html += '<div style="padding:12px 16px;border-radius:10px;background:var(--insight-bg);border:1px solid var(--insight-border);margin-bottom:14px;">';
      html += '<div style="font-size:0.85rem;font-weight:600;color:'+prColor+';margin-bottom:4px;">'+prIcon+' '+priority.title+'</div>';
      html += '<div style="font-size:0.82rem;color:var(--text-secondary);">'+(priority.message || '')+'</div>';
      html += '</div>';
    }

    // Recommendations
    if (recs.length > 0) {
      html += '<div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Recommendations</div>';
      html += '<ul style="list-style:none;padding:0;margin:0;">';
      recs.forEach(r => {
        html += '<li style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.83rem;">';
        html += '<strong style="color:var(--text);">'+r.title+'</strong><br>';
        html += '<span style="color:var(--text-secondary);">'+(r.description || '')+'</span>';
        html += '</li>';
      });
      html += '</ul>';
    }

    html += '</div>';
    return html;
  } catch (e) {
    console.error('[FinBot] renderInsight error:', e);
    return '<p style="font-size:0.85rem;color:var(--text-secondary);">FinBot is preparing your financial insight.</p>';
  }
}

// Run features — all use centralized financial summary
function runFeature(feature) {
  const s = getFinancialSummary();
  const question = document.getElementById('adviseInput') ? document.getElementById('adviseInput').value : '';

  // Pre-calculated summary string sent to AI so it doesn't recalculate
  const calculatedSummary = `[PRE-CALCULATED TOTALS - Use these exact values, do not recalculate]\nTotal Income: RM${s.totalIncome.toFixed(2)}\nTotal Expenses: RM${s.totalExpenses.toFixed(2)}\nCurrent Balance: RM${s.currentBalance.toFixed(2)}\nTotal Assets: RM${s.totalAssets.toFixed(2)}\nSavings Rate: ${s.savingsRate}%\nExpense Ratio: ${s.expensePercentage}%`;

  switch(feature) {
    case 'dashboard':
      fetchAI(STREAM_URLS.financial_dashboard, {
        income: s.incomeText, expenses: s.expenseText, assets: s.assetText,
        calculated_summary: calculatedSummary
      }, 'outputDashboard');
      break;
    case 'budget':
      fetchAI(STREAM_URLS.budget_monitor, {
        expenses: s.expenseText, budget_plan: s.budgetText,
        calculated_summary: calculatedSummary
      }, 'outputBudget');
      break;
    case 'recommendation':
      fetchAI(STREAM_URLS.ai_financial_recommendation, {
        income: s.incomeText, expenses: s.expenseText, assets: s.assetText, budget_plan: s.budgetText,
        calculated_summary: calculatedSummary
      }, 'outputRecommendation');
      break;
    case 'health':
      fetchAI(STREAM_URLS.financial_health_report, {
        income: s.incomeText, expenses: s.expenseText, assets: s.assetText,
        budget_plan: s.budgetText, savings_goal: s.savingsText,
        calculated_summary: calculatedSummary
      }, 'outputHealthReport');
      break;
    case 'subscription':
      fetchAI(STREAM_URLS.subscription_reminder, { subscriptions: s.subsText }, 'outputSubscription');
      break;
    case 'advisor':
      if (!question) { alert('Please enter a question.'); return; }
      fetchAI(STREAM_URLS.ai_financial_advisor_discussions, {
        income: s.incomeText, expenses: s.expenseText, assets: s.assetText,
        budget_plan: s.budgetText, savings_goal: s.savingsText,
        subscriptions: s.subsText, question: question,
        calculated_summary: calculatedSummary
      }, 'outputAdvisor');
      break;
  }
}

// Theme
function setTheme(theme) {
  document.body.classList.remove('light', 'dark', 'system');
  if (theme === 'dark') { document.body.classList.add('dark'); }
  else if (theme === 'system') { document.body.classList.add('system'); }
  localStorage.setItem('theme', theme);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeBtn === theme);
    btn.setAttribute('aria-pressed', btn.dataset.themeBtn === theme ? 'true' : 'false');
  });
 
}
function toggleTheme() {
  const current = localStorage.getItem('theme') || 'light';
  if (current === 'light') setTheme('dark');
  else if (current === 'dark') setTheme('system');
  else setTheme('light');
}
// Load saved theme immediately
(function() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') document.body.classList.add('dark');
  else if (saved === 'system') document.body.classList.add('system');
  // Update theme label
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = saved.charAt(0).toUpperCase() + saved.slice(1);
})();

// ========== AUTO HOME INSIGHT ==========
const INSIGHT_KEY = 'finbot_insight';
const INSIGHT_DATA_KEY = 'finbot_insight_data_hash';

function generateHomeInsight(forceRefresh) {
  const s = getFinancialSummary();

  if (!s.incomeText.trim() && !s.expenseText.trim() && !s.assetText.trim()) {
    document.getElementById('aiInsightContent').innerHTML = '<p style="font-size:0.85rem;color:var(--text-secondary);">Not enough financial data yet.<br><br>Add your income and expenses in the <strong>Money</strong> section so FinBot can provide personalized insights.</p>';
    return;
  }

  var dataHash = s.totalIncome.toFixed(2) + '_' + s.totalExpenses.toFixed(2) + '_' + s.totalAssets.toFixed(2);
  var savedHash = localStorage.getItem(INSIGHT_DATA_KEY);
  var savedInsight = localStorage.getItem(INSIGHT_KEY);

  if (!forceRefresh && savedHash === dataHash && savedInsight) {
    document.getElementById('aiInsightContent').innerHTML = savedInsight;
    return;
  }

  document.getElementById('aiInsightContent').innerHTML = '<p style="font-size:0.85rem;color:var(--text-secondary);"><span class="spinner"></span> Analyzing your latest finances...</p>';

  var url = (typeof STREAM_URLS !== 'undefined' && STREAM_URLS.financial_dashboard) ? STREAM_URLS.financial_dashboard : '';
  if (!url || url.includes('__URL_')) {
    var insight = '';
    if (s.totalExpenses > s.totalIncome && s.totalIncome > 0) {
      insight = '<strong style="color:var(--red);">Warning: Overspending</strong><br>Your expenses (RM' + s.totalExpenses.toFixed(2) + ') exceed your income (RM' + s.totalIncome.toFixed(2) + ').<br><br>Recommendation: Reduce spending by at least RM' + (s.totalExpenses - s.totalIncome).toFixed(2) + '.';
    } else if (s.savingsRate < 10 && s.totalIncome > 0) {
      insight = '<strong style="color:var(--yellow);">Low Savings Rate: ' + s.savingsRate + '%</strong><br>Financial experts recommend saving at least 20%.<br><br>Recommendation: Save an additional RM' + (s.totalIncome * 0.1).toFixed(2) + '/month.';
    } else if (s.totalIncome > 0) {
      insight = '<strong style="color:var(--green);">On Track (' + s.savingsRate + '% savings rate)</strong><br>Balance: RM' + s.currentBalance.toFixed(2) + '.<br><br>Tip: Consider allocating surplus to investments or emergency fund.';
    } else {
      insight = '<strong>Data Received</strong><br>FinBot has your financial data. Use the AI Advisor for a detailed analysis.';
    }
    var html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;">' + insight + '</p>';
    document.getElementById('aiInsightContent').innerHTML = html;
    localStorage.setItem(INSIGHT_KEY, html);
    localStorage.setItem(INSIGHT_DATA_KEY, dataHash);
    return;
  }

  var calculatedSummary = '[PRE-CALCULATED TOTALS]\nTotal Income: RM' + s.totalIncome.toFixed(2) + '\nTotal Expenses: RM' + s.totalExpenses.toFixed(2) + '\nCurrent Balance: RM' + s.currentBalance.toFixed(2) + '\nTotal Assets: RM' + s.totalAssets.toFixed(2) + '\nSavings Rate: ' + s.savingsRate + '%';

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ income: s.incomeText, expenses: s.expenseText, assets: s.assetText, calculated_summary: calculatedSummary })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) throw new Error(data.error);
    var html = '';
    if (data.insight) {
      var i = data.insight;
      var scoreColor = i.healthScore >= 75 ? 'var(--green)' : i.healthScore >= 50 ? 'var(--yellow)' : 'var(--red)';
      html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;"><strong style="color:' + scoreColor + ';">Health Score: ' + i.healthScore + '/100 - ' + (i.healthStatus || '') + '</strong><br>' + (i.summary || '') + '</p>';
    } else {
      var fullText = (data.response || '').replace(/[#*|`]/g, '').replace(/---+/g, '').trim();
      html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;">' + fullText.split(/[.!]\s/).slice(0, 3).join('. ') + '.</p>';
    }
    document.getElementById('aiInsightContent').innerHTML = html;
    localStorage.setItem(INSIGHT_KEY, html);
    localStorage.setItem(INSIGHT_DATA_KEY, dataHash);
  }).catch(function(err) {
    var html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;"><strong>Summary</strong><br>Income: RM' + s.totalIncome.toFixed(2) + ' | Expenses: RM' + s.totalExpenses.toFixed(2) + ' | Balance: RM' + s.currentBalance.toFixed(2) + '</p>';
    document.getElementById('aiInsightContent').innerHTML = html;
  });
}

// Accessibility toggles
function toggleA11y(mode) {
  if(mode==='large-text'&&document.body.classList.contains('xl-text')){document.body.classList.remove('xl-text');document.documentElement.classList.remove('xl-text');updateSwitch('toggleXLText',false);localStorage.removeItem('a11y-xl-text');}
  if(mode==='xl-text'&&document.body.classList.contains('large-text')){document.body.classList.remove('large-text');document.documentElement.classList.remove('large-text');updateSwitch('toggleLargeText',false);localStorage.removeItem('a11y-large-text');}
  document.body.classList.toggle(mode);
  if(mode==='large-text'||mode==='xl-text'){document.documentElement.classList.toggle(mode);}
  const isActive=document.body.classList.contains(mode);
  const map={'high-contrast':'toggleHighContrast','enhanced-focus':'toggleEnhancedFocus','large-text':'toggleLargeText','xl-text':'toggleXLText','reduced-motion':'toggleReducedMotion','simplified':'toggleSimplified'};
  updateSwitch(map[mode],isActive);
  if(isActive)localStorage.setItem('a11y-'+mode,'1');else localStorage.removeItem('a11y-'+mode);
}
function updateSwitch(id,active){const el=document.getElementById(id);if(!el)return;if(active){el.classList.add('active');el.setAttribute('aria-checked','true');}else{el.classList.remove('active');el.setAttribute('aria-checked','false');}}
function toggleVoiceFeature(){const bar=document.getElementById('voiceCommandBar');const btn=document.getElementById('toggleVoice');if(bar.style.display!=='none'&&bar.style.display!==''){bar.style.display='none';if(btn){btn.classList.remove('active');btn.setAttribute('aria-checked','false');}localStorage.removeItem('a11y-voice');}else{bar.style.display='block';if(btn){btn.classList.add('active');btn.setAttribute('aria-checked','true');}localStorage.setItem('a11y-voice','1');}}

// Load a11y prefs
(function(){
  const modes=['high-contrast','enhanced-focus','large-text','xl-text','reduced-motion','simplified'];
  const map={'high-contrast':'toggleHighContrast','enhanced-focus':'toggleEnhancedFocus','large-text':'toggleLargeText','xl-text':'toggleXLText','reduced-motion':'toggleReducedMotion','simplified':'toggleSimplified'};
  modes.forEach(m=>{if(localStorage.getItem('a11y-'+m)==='1'){document.body.classList.add(m);if(m==='large-text'||m==='xl-text'){document.documentElement.classList.add(m);}updateSwitch(map[m],true);}});
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)document.body.classList.add('reduced-motion');
  const bar=document.getElementById('voiceCommandBar');if(bar){if(localStorage.getItem('a11y-voice')==='1'){bar.style.display='block';updateSwitch('toggleVoice',true);}else{bar.style.display='none';}}
})();

// Keyboard nav
document.querySelectorAll('.sidebar-nav a[role="button"],.mobile-nav a').forEach(a=>{a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();a.click();}});});
// Keyboard support for dashboard KPI cards with role="button"
document.querySelectorAll('.card[role="button"]').forEach(c=>{c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}});});

// Auto-generate insight on page load
updateLocalDashboard();
generateHomeInsight(false);
