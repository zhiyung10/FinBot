/**
 * Quick Input Module
 * Provides predefined category dropdowns for income, expenses, assets, and subscriptions.
 * Users select a category, enter an amount, and click Add to append to the textarea.
 */

// Predefined categories
const CATEGORIES = {
  income: [
    'Salary', 'Freelance', 'Part-time Job', 'Business Income', 'Passive Income',
    'Rental Income', 'Investment Returns', 'Commission', 'Bonus', 'Allowance',
    'Side Hustle', 'Dividends', 'Royalties', 'Other Income'
  ],
  expenses: [
    'Food', 'Transport', 'Rental', 'Utilities', 'Entertainment',
    'Insurance', 'Shopping', 'Healthcare', 'Education', 'Phone Bill',
    'Internet', 'Groceries', 'Petrol', 'Parking', 'Toll',
    'Clothing', 'Personal Care', 'Gym', 'Car Loan', 'House Loan',
    'PTPTN', 'Credit Card', 'Maintenance', 'Donations', 'Other Expenses'
  ],
  assets: [
    'Savings Account', 'Fixed Deposit', 'EPF', 'Stocks', 'Unit Trust',
    'Gold', 'Cryptocurrency', 'Property', 'Vehicle', 'Cash',
    'ASB', 'ASNB', 'Tabung Haji', 'Bonds', 'Retirement Fund',
    'Business Assets', 'Jewelry', 'Other Assets'
  ],
  subscriptions: [
    'Netflix', 'Spotify', 'Disney+', 'YouTube Premium', 'Apple Music',
    'Adobe Creative Cloud', 'Microsoft 365', 'Google One', 'iCloud',
    'Amazon Prime', 'Gym Membership', 'VPN Service', 'Cloud Storage',
    'Canva Pro', 'ChatGPT Plus', 'Other Subscription'
  ]
};

// Billing frequency options for subscriptions
const FREQUENCIES = ['Monthly', 'Yearly', 'Weekly', 'Quarterly'];

/**
 * Create quick-add UI for a specific input field
 */
function createQuickAdd(textareaId, type) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const container = textarea.parentElement;
  
  // Don't add twice
  if (container.querySelector('.quick-add-bar')) return;

  const categories = CATEGORIES[type] || [];
  const isSubscription = type === 'subscriptions';

  // Build HTML
  const bar = document.createElement('div');
  bar.className = 'quick-add-bar';
  bar.innerHTML = `
    <div class="quick-add-row">
      <select class="quick-add-select" id="qa-select-${textareaId}" aria-label="Select ${type} category">
        <option value="">-- Select Category --</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        <option value="__custom__">Custom (type your own)</option>
      </select>
      <input type="text" class="quick-add-custom" id="qa-custom-${textareaId}" placeholder="Custom category" style="display:none;" aria-label="Enter custom category name">
      <input type="number" class="quick-add-amount" id="qa-amount-${textareaId}" placeholder="Amount (RM)" min="0" step="0.01" aria-label="Enter amount in Ringgit">
      ${isSubscription ? `<select class="quick-add-freq" id="qa-freq-${textareaId}" aria-label="Billing frequency">
        ${FREQUENCIES.map(f => `<option value="${f}">${f}</option>`).join('')}
      </select>` : ''}
      <button type="button" class="btn btn-primary quick-add-btn" onclick="quickAdd('${textareaId}', '${type}')" aria-label="Add entry to ${type} list">+ Add</button>
    </div>
  `;

  // Insert before the textarea
  container.insertBefore(bar, textarea);

  // Handle custom category toggle
  const select = bar.querySelector(`#qa-select-${textareaId}`);
  const customInput = bar.querySelector(`#qa-custom-${textareaId}`);
  select.addEventListener('change', function() {
    if (this.value === '__custom__') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
    }
  });
}

/**
 * Add the selected category and amount to the textarea
 */
function quickAdd(textareaId, type) {
  const select = document.getElementById(`qa-select-${textareaId}`);
  const customInput = document.getElementById(`qa-custom-${textareaId}`);
  const amountInput = document.getElementById(`qa-amount-${textareaId}`);
  const textarea = document.getElementById(textareaId);

  // Get category
  let category = select.value;
  if (category === '__custom__') {
    category = customInput.value.trim();
  }
  if (!category) {
    alert('Please select or enter a category.');
    select.focus();
    return;
  }

  // Get amount
  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than 0.');
    amountInput.focus();
    return;
  }

  // Format the entry
  let entry = '';
  if (type === 'subscriptions') {
    const freqSelect = document.getElementById(`qa-freq-${textareaId}`);
    const freq = freqSelect ? freqSelect.value : 'Monthly';
    entry = `${category} RM${amount.toFixed(2)} ${freq}`;
  } else {
    entry = `${category} RM${amount.toFixed(2)}`;
  }

  // Append to textarea
  if (textarea.value.trim()) {
    textarea.value += '\n' + entry;
  } else {
    textarea.value = entry;
  }

  // Scroll textarea to bottom
  textarea.scrollTop = textarea.scrollHeight;

  // Announce
  if (typeof announce === 'function') announce('Added: ' + entry);

  // Show brief feedback
  const btn = document.querySelector(`[onclick="quickAdd('${textareaId}', '${type}')"]`);
  if (btn) {
    const original = btn.textContent;
    btn.textContent = '✓ Added';
    btn.style.background = '#22c55e';
    setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 1000);
  }

  // Reset inputs
  amountInput.value = '';
  select.value = '';
  customInput.style.display = 'none';
  customInput.value = '';
  amountInput.focus();
}

/**
 * Initialize quick-add bars for all input fields
 */
function initQuickInputs() {
  createQuickAdd('incomeInput', 'income');
  createQuickAdd('expenseInput', 'expenses');
  createQuickAdd('assetInput', 'assets');
  createQuickAdd('subscriptionInput', 'subscriptions');
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuickInputs);
} else {
  initQuickInputs();
}
