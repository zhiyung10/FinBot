/**
 * Receipt OCR Scanner Module
 * Uses Tesseract.js to extract text and amounts from receipt images.
 * Extracted amounts can be added to the Expense Input with transaction date.
 */

// State
let ocrImage = null;
let ocrExtractedAmounts = [];
let ocrSelectedAmount = null;

/**
 * Handle file selection from input
 */
function handleReceiptFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showOCRError('Please select an image file (JPG, PNG, WEBP).');
    return;
  }

  clearOCRResults();

  const reader = new FileReader();
  reader.onload = function (e) {
    ocrImage = e.target.result;
    showOCRPreview(ocrImage);
  };
  reader.readAsDataURL(file);
}

/**
 * Show image preview
 */
function showOCRPreview(src) {
  const preview = document.getElementById('ocrPreview');
  const scanBtn = document.getElementById('ocrScanBtn');
  preview.innerHTML = '<img src="' + src + '" alt="Receipt preview" style="max-height:250px;max-width:100%;border-radius:10px;object-fit:contain;">';
  preview.style.display = 'block';
  scanBtn.style.display = 'inline-flex';
}

/**
 * Run OCR scan on the uploaded image
 */
async function scanReceipt() {
  if (!ocrImage) {
    showOCRError('Please upload a receipt image first.');
    return;
  }

  const statusEl = document.getElementById('ocrStatus');
  const progressEl = document.getElementById('ocrProgress');
  const scanBtn = document.getElementById('ocrScanBtn');

  statusEl.textContent = 'Scanning receipt... This may take 10-30 seconds.';
  statusEl.style.display = 'block';
  progressEl.style.display = 'block';
  progressEl.querySelector('.progress-fill').style.width = '0%';
  scanBtn.disabled = true;

  if (typeof announce === 'function') announce('Scanning receipt, please wait.');

  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: function (m) {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          progressEl.querySelector('.progress-fill').style.width = pct + '%';
          statusEl.textContent = 'Scanning... ' + pct + '%';
        }
      }
    });

    const result = await worker.recognize(ocrImage);
    const text = result.data.text;
    await worker.terminate();

    // Extract amounts and date
    const amounts = extractAmounts(text);
    ocrExtractedAmounts = amounts;

    displayOCRResults(text, amounts);

    statusEl.textContent = 'Scan complete! Found ' + amounts.length + ' amount(s).';
    if (typeof announce === 'function') announce('Scan complete. Found ' + amounts.length + ' amounts.');

  } catch (err) {
    showOCRError('Scan failed: ' + err.message);
    if (typeof announce === 'function') announce('Receipt scan failed.');
  } finally {
    scanBtn.disabled = false;
    progressEl.style.display = 'none';
  }
}

/**
 * Extract RM amounts from OCR text
 */
function extractAmounts(text) {
  const amounts = [];
  const pattern = /(?:RM|MYR|rm|Rm)?\s?(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2})?)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const cleaned = match[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0.5 && num < 100000) {
      amounts.push(num);
    }
  }

  return [...new Set(amounts)].sort(function (a, b) { return b - a; });
}

/**
 * Detect receipt transaction date from OCR text.
 * Supports formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD Mon YYYY, DD Month YYYY
 * Returns ISO date string (YYYY-MM-DD) or null if not detected.
 */
function detectReceiptDate(text) {
  const months = {
    'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
    'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
    'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
    'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
    'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };

  // Try DD/MM/YYYY or DD-MM-YYYY
  var match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    var day = match[1].padStart(2, '0');
    var month = match[2].padStart(2, '0');
    var year = match[3];
    // Validate
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return year + '-' + month + '-' + day;
    }
  }

  // Try YYYY-MM-DD
  match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    var year = match[1], month = match[2], day = match[3];
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return year + '-' + month + '-' + day;
    }
  }

  // Try DD Mon YYYY or DD Month YYYY
  match = text.match(/(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{4})/i);
  if (match) {
    var day = match[1].padStart(2, '0');
    var monthName = match[2].toLowerCase();
    var month = months[monthName];
    var year = match[3];
    if (month && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return year + '-' + month + '-' + day;
    }
  }

  // Try Mon DD, YYYY
  match = text.match(/(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    var monthName = match[1].toLowerCase();
    var month = months[monthName];
    var day = match[2].padStart(2, '0');
    var year = match[3];
    if (month && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return year + '-' + month + '-' + day;
    }
  }

  return null; // Could not detect date
}

/**
 * Try to find the total amount
 */
function findTotal(text, amounts) {
  const totalPattern = /(?:total|grand total|amount|jumlah|bayar|subtotal|total amount)[:\s]*(?:RM|MYR)?\s?(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2})?)/gi;
  const match = totalPattern.exec(text);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }
  return amounts.length > 0 ? amounts[0] : null;
}

/**
 * Display OCR results with date field
 */
function displayOCRResults(rawText, amounts) {
  const resultsEl = document.getElementById('ocrResults');
  const total = findTotal(rawText, amounts);
  ocrSelectedAmount = total;

  // Detect receipt date
  const detectedDate = detectReceiptDate(rawText);
  const today = new Date().toISOString().split('T')[0];
  const proposedDate = detectedDate || today;

  let html = '';

  // Show detected total
  if (total) {
    html += '<div class="ocr-total">';
    html += '<div class="ocr-total-label">Detected Total</div>';
    html += '<div class="ocr-total-value">RM' + total.toFixed(2) + '</div>';
    html += '</div>';
  }

  // Show detected date
  html += '<div style="margin-bottom:12px;padding:8px 12px;border-radius:8px;background:' + (detectedDate ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)') + ';border:1px solid ' + (detectedDate ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)') + ';">';
  html += '<span style="font-size:0.78rem;color:var(--text-secondary);">' + (detectedDate ? '&#9989; Date detected from receipt' : '&#9888; Date not detected - defaulting to today') + '</span>';
  html += '</div>';

  // Show all amounts as selectable chips
  if (amounts.length > 0) {
    html += '<div class="ocr-amounts-label">All detected amounts (click to select):</div>';
    html += '<div class="ocr-chips">';
    amounts.forEach(function (amt) {
      const isSelected = amt === ocrSelectedAmount;
      html += '<button class="ocr-chip' + (isSelected ? ' selected' : '') + '" onclick="selectOCRAmount(' + amt + ')" aria-label="Select amount RM' + amt.toFixed(2) + '">RM' + amt.toFixed(2) + '</button>';
    });
    html += '</div>';
  } else {
    html += '<p class="ocr-no-results">No amounts detected. Try a clearer image.</p>';
  }

  // Save form with date field
  html += '<div class="ocr-add-section">';
  html += '<label for="ocrDescription" class="ocr-form-label">Description / Merchant</label>';
  html += '<input type="text" id="ocrDescription" class="ocr-input" placeholder="e.g., FamilyMart, Lunch" aria-label="Expense description">';

  html += '<label for="ocrAmount" class="ocr-form-label">Amount (RM)</label>';
  html += '<input type="number" id="ocrAmount" class="ocr-input" step="0.01" min="0.01" value="' + (ocrSelectedAmount || '') + '" aria-label="Expense amount in Ringgit">';

  html += '<label for="ocrDate" class="ocr-form-label">Transaction Date</label>';
  html += '<input type="date" id="ocrDate" class="ocr-input" value="' + proposedDate + '" aria-label="Transaction date for this expense">';

  html += '<label for="ocrCategory" class="ocr-form-label">Category</label>';
  html += '<select id="ocrCategory" class="ocr-input" aria-label="Expense category">';
  html += '<option value="Receipt Item">Receipt Item</option>';
  html += '<option value="Food">Food</option>';
  html += '<option value="Groceries">Groceries</option>';
  html += '<option value="Shopping">Shopping</option>';
  html += '<option value="Transport">Transport</option>';
  html += '<option value="Healthcare">Healthcare</option>';
  html += '<option value="Utilities">Utilities</option>';
  html += '<option value="Other">Other</option>';
  html += '</select>';

  html += '<button class="btn btn-primary" onclick="addOCRToExpenses()" aria-label="Save scanned expense" style="margin-top:8px;">Save Expense</button>';
  html += '</div>';

  // Raw text (collapsible)
  html += '<details class="ocr-raw-details"><summary>View raw scanned text</summary><pre class="ocr-raw-text">' + escapeHTML(rawText) + '</pre></details>';

  resultsEl.innerHTML = html;
  resultsEl.style.display = 'block';
}

/**
 * Select a specific amount from chips
 */
function selectOCRAmount(amt) {
  ocrSelectedAmount = amt;
  document.getElementById('ocrAmount').value = amt.toFixed(2);
  document.querySelectorAll('.ocr-chip').forEach(function (chip) {
    chip.classList.remove('selected');
    if (chip.textContent === 'RM' + amt.toFixed(2)) chip.classList.add('selected');
  });
}

/**
 * Add the confirmed OCR expense to the Expense Input textarea with date
 */
function addOCRToExpenses() {
  const amountInput = document.getElementById('ocrAmount');
  const descInput = document.getElementById('ocrDescription');
  const dateInput = document.getElementById('ocrDate');
  const catInput = document.getElementById('ocrCategory');

  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    showOCRError('Please enter a valid amount greater than 0.');
    return;
  }

  const description = descInput.value.trim() || catInput.value || 'Receipt Item';
  const txDate = dateInput.value || new Date().toISOString().split('T')[0];

  // Format: Description RM123.45 [2026-08-25]
  const expenseEntry = description + ' RM' + amount.toFixed(2) + ' [' + txDate + ']';

  // Append to expense input
  const expenseInput = document.getElementById('expenseInput');
  if (expenseInput.value.trim()) {
    expenseInput.value += '\n' + expenseEntry;
  } else {
    expenseInput.value = expenseEntry;
  }

  // Auto-save if available
  if (typeof saveAllData === 'function') saveAllData();

  // Show success
  const statusEl = document.getElementById('ocrStatus');
  statusEl.textContent = 'Saved: ' + description + ' RM' + amount.toFixed(2) + ' on ' + txDate;
  statusEl.style.display = 'block';

  if (typeof announce === 'function') announce('Expense saved: ' + description + ' RM' + amount.toFixed(2) + ' on ' + txDate);

  // Reset form fields but keep results visible for multiple receipts
  descInput.value = '';
  amountInput.value = '';
  // Reset date to today for next receipt
  dateInput.value = new Date().toISOString().split('T')[0];
}

/**
 * Show OCR error message
 */
function showOCRError(msg) {
  const statusEl = document.getElementById('ocrStatus');
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
  statusEl.style.color = '#f87171';
  setTimeout(function () { statusEl.style.color = ''; }, 3000);
}

/**
 * Clear OCR results and reset
 */
function clearOCRResults() {
  ocrImage = null;
  ocrExtractedAmounts = [];
  ocrSelectedAmount = null;
  document.getElementById('ocrPreview').style.display = 'none';
  document.getElementById('ocrPreview').innerHTML = '';
  document.getElementById('ocrResults').style.display = 'none';
  document.getElementById('ocrResults').innerHTML = '';
  document.getElementById('ocrStatus').style.display = 'none';
  document.getElementById('ocrProgress').style.display = 'none';
  document.getElementById('ocrScanBtn').style.display = 'none';
  const fileInput = document.getElementById('ocrFileInput');
  if (fileInput) fileInput.value = '';
}

/**
 * Escape HTML for safe display
 */
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
