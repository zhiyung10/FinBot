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
  if (pageId === 'insights') { renderTrendsChart(); }
  announce('Navigated to ' + pageId);
}

function showMoneyTab(tab) {
  document.querySelectorAll('.money-tab').forEach(t => t.style.display = 'none');
  document.getElementById('moneyTab-' + tab).style.display = 'block';
  document.querySelectorAll('#moneyTabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

// FAB
function toggleFab() { document.getElementById('fabMenu').classList.toggle('open'); }
function closeFab() { document.getElementById('fabMenu').classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.fab') && !e.target.closest('.fab-menu')) closeFab(); });

// Parse amounts
function parseAmounts(text) {
  const matches = text.match(/RM\s?[\d,]+(\.\d+)?|\d[\d,]*(\.\d+)?/gi) || [];
  return matches.reduce((sum, m) => { const n = parseFloat(m.replace(/[RM,\s]/gi, '')); return sum + (isNaN(n) ? 0 : n); }, 0);
}

// Dashboard calculations
function updateLocalDashboard() {
  const income = parseAmounts(document.getElementById('incomeInput').value);
  const expenses = parseAmounts(document.getElementById('expenseInput').value);
  const assets = parseAmounts(document.getElementById('assetInput').value);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : '0';

  document.getElementById('scIncome').textContent = 'RM ' + income.toLocaleString();
  document.getElementById('scExpenses').textContent = 'RM ' + expenses.toLocaleString();
  document.getElementById('scBalance').textContent = 'RM ' + balance.toLocaleString();
  document.getElementById('scAssets').textContent = 'RM ' + assets.toLocaleString();
  document.getElementById('scSavingsRate').textContent = savingsRate + '%';

  // Mini bar chart for balance card
  const barsEl = document.getElementById('balanceMiniBars');
  if (barsEl) {
    const vals = [income * 0.7, income * 0.85, income, income * 0.9, balance, balance * 1.1, balance];
    const max = Math.max(...vals, 1);
    barsEl.innerHTML = vals.map(v => '<div class="mini-bar" style="height:' + Math.max(4, (v / max) * 36) + 'px;"></div>').join('');
  }

  // Mini line for income card
  const incLine = document.getElementById('incomeLineChart');
  if (incLine && income > 0) {
    incLine.innerHTML = '<svg viewBox="0 0 100 40"><polyline points="0,35 15,28 30,30 45,20 60,22 75,15 100,10" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  // Mini line for expense card
  const expLine = document.getElementById('expenseLineChart');
  if (expLine && expenses > 0) {
    expLine.innerHTML = '<svg viewBox="0 0 100 40"><polyline points="0,30 15,25 30,28 45,20 60,30 75,25 100,22" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  updateBudgetProgress();
  updateHomePieChart();
}

function updateHomePieChart() {
  const text = document.getElementById('expenseInput').value;
  if (!text.trim()) return;
  const categories = {};
  text.split('\n').forEach(line => {
    const match = line.match(/(.+?)\s*RM\s?([\d,]+(\.\d+)?)/i);
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

// Markdown
function renderMarkdown(text) {
  return text.split('\n').map(line => {
    if (line.match(/^---+$/)) return '<hr>';
    if (line.match(/^### /)) return '<h3>'+rl(line.slice(4))+'</h3>';
    if (line.match(/^## /)) return '<h2>'+rl(line.slice(3))+'</h2>';
    if (line.match(/^# /)) return '<h1>'+rl(line.slice(2))+'</h1>';
    if (line.match(/^\d+\.\s/)) return '<li>'+rl(line.replace(/^\d+\.\s/,''))+'</li>';
    if (line.match(/^[-*]\s/)) return '<li>'+rl(line.slice(2))+'</li>';
    if (line.trim()==='') return '<br>';
    return '<p>'+rl(line)+'</p>';
  }).join('');
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
    announce('Error: AI backend not configured.');
    return;
  }

  panel.innerHTML = '<div class="loading-msg"><span class="spinner"></span>Generating AI response...</div>';
  announce('Generating AI response.');
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
    panel.innerHTML = renderMarkdown(data.response||'');
    panel.setAttribute('aria-busy','false');
    announce('AI analysis complete.');
  } catch (err) {
    panel.innerHTML = '<div class="error">⚠ Error: '+err.message+'</div>';
    panel.setAttribute('aria-busy','false');
    announce('Error: '+err.message);
  }
}

// Run features
function runFeature(feature) {
  const income=document.getElementById('incomeInput').value, expenses=document.getElementById('expenseInput').value;
  const assets=document.getElementById('assetInput').value, subs=document.getElementById('subscriptionInput').value;
  const budget=document.getElementById('budgetInput').value, savings=document.getElementById('savingsInput').value;
  const question=document.getElementById('adviseInput').value;

  switch(feature) {
    case 'dashboard': fetchAI(STREAM_URLS.financial_dashboard,{income,expenses,assets},'outputDashboard'); break;
    case 'budget': fetchAI(STREAM_URLS.budget_monitor,{expenses,budget_plan:budget},'outputBudget'); break;
    case 'recommendation': fetchAI(STREAM_URLS.ai_financial_recommendation,{income,expenses,assets,budget_plan:budget},'outputRecommendation'); break;
    case 'health': fetchAI(STREAM_URLS.financial_health_report,{income,expenses,assets,budget_plan:budget,savings_goal:savings},'outputHealthReport'); break;
    case 'subscription': fetchAI(STREAM_URLS.subscription_reminder,{subscriptions:subs},'outputSubscription'); break;
    case 'advisor':
      if(!question){alert('Please enter a question.');return;}
      fetchAI(STREAM_URLS.ai_financial_advisor_discussions,{income,expenses,assets,budget_plan:budget,savings_goal:savings,subscriptions:subs,question},'outputAdvisor'); break;
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
  announce('Theme set to ' + theme + ' mode.');
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
  const income = document.getElementById('incomeInput') ? document.getElementById('incomeInput').value : '';
  const expenses = document.getElementById('expenseInput') ? document.getElementById('expenseInput').value : '';
  const assets = document.getElementById('assetInput') ? document.getElementById('assetInput').value : '';

  // Not enough data?
  if (!income.trim() && !expenses.trim() && !assets.trim()) {
    document.getElementById('aiInsightContent').innerHTML = '<p style="font-size:0.85rem;color:var(--text-secondary);">Not enough financial data yet.<br><br>Add your income and expenses in the <strong>Money</strong> section so FinBot can provide personalized insights.</p>';
    return;
  }

  // Check if data changed since last insight
  const dataHash = (income + expenses + assets).length.toString() + '_' + income.slice(0,20) + expenses.slice(0,20);
  const savedHash = localStorage.getItem(INSIGHT_DATA_KEY);
  const savedInsight = localStorage.getItem(INSIGHT_KEY);

  if (!forceRefresh && savedHash === dataHash && savedInsight) {
    // Show cached insight
    document.getElementById('aiInsightContent').innerHTML = savedInsight;
    return;
  }

  // Show loading
  document.getElementById('aiInsightContent').innerHTML = '<p style="font-size:0.85rem;color:var(--text-secondary);"><span class="spinner"></span> Analyzing your latest finances...</p>';

  // Call AI
  const url = (typeof STREAM_URLS !== 'undefined' && STREAM_URLS.financial_dashboard) ? STREAM_URLS.financial_dashboard : '';
  if (!url || url.includes('__URL_')) {
    // No API configured - generate local insight
    const inc = parseAmounts(income);
    const exp = parseAmounts(expenses);
    const rate = inc > 0 ? ((inc - exp) / inc * 100).toFixed(0) : 0;
    let insight = '';
    if (exp > inc && inc > 0) {
      insight = '<strong style="color:var(--red);">âš  Spending Alert</strong><br>Your expenses (RM' + exp.toLocaleString() + ') exceed your income (RM' + inc.toLocaleString() + ').<br><br><em>Recommendation:</em> Review non-essential expenses and reduce spending by at least RM' + (exp - inc).toLocaleString() + ' to avoid debt.';
    } else if (rate < 10 && inc > 0) {
      insight = '<strong style="color:var(--yellow);">ðŸ’¡ Low Savings Rate</strong><br>Your savings rate is ' + rate + '%. Financial experts recommend saving at least 20%.<br><br><em>Recommendation:</em> Try to save an additional RM' + Math.round(inc * 0.1).toLocaleString() + '/month.';
    } else if (inc > 0) {
      insight = '<strong style="color:var(--green);">âœ“ On Track</strong><br>You\'re saving ' + rate + '% of your income this month. Balance: RM' + (inc - exp).toLocaleString() + '.<br><br><em>Tip:</em> Consider allocating surplus to investments or emergency fund.';
    } else {
      insight = '<strong>ðŸ“Š Data Received</strong><br>FinBot has your financial data. Use the AI Advisor for a detailed analysis.';
    }
    const html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;">' + insight + '</p>';
    document.getElementById('aiInsightContent').innerHTML = html;
    localStorage.setItem(INSIGHT_KEY, html);
    localStorage.setItem(INSIGHT_DATA_KEY, dataHash);
    return;
  }

  // Call real API
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ income, expenses, assets })
  }).then(r => r.json()).then(data => {
    if (data.error) throw new Error(data.error);
    // Extract first 3-4 sentences as insight
    const fullText = data.response || '';
    const sentences = fullText.split(/[.!]\s/).slice(0, 4).join('. ') + '.';
    const html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;">' + sentences + '</p>';
    document.getElementById('aiInsightContent').innerHTML = html;
    localStorage.setItem(INSIGHT_KEY, html);
    localStorage.setItem(INSIGHT_DATA_KEY, dataHash);
  }).catch(err => {
    // Fallback to local insight on error
    generateHomeInsight.localFallback = true;
    const inc = parseAmounts(income);
    const exp = parseAmounts(expenses);
    const balance = inc - exp;
    const html = '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;"><strong>ðŸ“Š Financial Summary</strong><br>Income: RM' + inc.toLocaleString() + ' | Expenses: RM' + exp.toLocaleString() + ' | Balance: RM' + balance.toLocaleString() + '</p>';
    document.getElementById('aiInsightContent').innerHTML = html;
  });
}

// Announce
function announce(msg) { const el=document.getElementById('a11y-announce'); if(el){el.textContent='';setTimeout(()=>{el.textContent=msg;},50);} }

// Accessibility toggles
function toggleA11y(mode) {
  if(mode==='large-text'&&document.body.classList.contains('xl-text')){document.body.classList.remove('xl-text');updateSwitch('toggleXLText',false);localStorage.removeItem('a11y-xl-text');}
  if(mode==='xl-text'&&document.body.classList.contains('large-text')){document.body.classList.remove('large-text');updateSwitch('toggleLargeText',false);localStorage.removeItem('a11y-large-text');}
  document.body.classList.toggle(mode);
  const isActive=document.body.classList.contains(mode);
  const map={'high-contrast':'toggleHighContrast','color-blind':'toggleColorBlind','enhanced-focus':'toggleEnhancedFocus','large-text':'toggleLargeText','xl-text':'toggleXLText','reduced-motion':'toggleReducedMotion','simplified':'toggleSimplified','sr-optimized':'toggleScreenReader'};
  updateSwitch(map[mode],isActive);
  if(isActive)localStorage.setItem('a11y-'+mode,'1');else localStorage.removeItem('a11y-'+mode);
  announce(mode.replace(/-/g,' ')+(isActive?' enabled':' disabled'));
}
function updateSwitch(id,active){const el=document.getElementById(id);if(!el)return;if(active){el.classList.add('active');el.setAttribute('aria-checked','true');}else{el.classList.remove('active');el.setAttribute('aria-checked','false');}}
function toggleVoiceFeature(){const bar=document.getElementById('voiceCommandBar');const btn=document.getElementById('toggleVoice');if(bar.style.display!=='none'&&bar.style.display!==''){bar.style.display='none';if(btn){btn.classList.remove('active');btn.setAttribute('aria-checked','false');}localStorage.removeItem('a11y-voice');announce('Voice disabled.');}else{bar.style.display='block';if(btn){btn.classList.add('active');btn.setAttribute('aria-checked','true');}localStorage.setItem('a11y-voice','1');announce('Voice enabled.');}}

// Load a11y prefs
(function(){
  const modes=['high-contrast','color-blind','enhanced-focus','large-text','xl-text','reduced-motion','simplified','sr-optimized'];
  const map={'high-contrast':'toggleHighContrast','color-blind':'toggleColorBlind','enhanced-focus':'toggleEnhancedFocus','large-text':'toggleLargeText','xl-text':'toggleXLText','reduced-motion':'toggleReducedMotion','simplified':'toggleSimplified','sr-optimized':'toggleScreenReader'};
  modes.forEach(m=>{if(localStorage.getItem('a11y-'+m)==='1'){document.body.classList.add(m);updateSwitch(map[m],true);}});
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)document.body.classList.add('reduced-motion');
  const bar=document.getElementById('voiceCommandBar');if(bar){if(localStorage.getItem('a11y-voice')==='1'){bar.style.display='block';updateSwitch('toggleVoice',true);}else{bar.style.display='none';}}
})();

// Keyboard nav
document.querySelectorAll('.sidebar-nav a[role="button"],.mobile-nav a').forEach(a=>{a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();a.click();}});});

// Auto-generate insight on page load
updateLocalDashboard();
generateHomeInsight(false);