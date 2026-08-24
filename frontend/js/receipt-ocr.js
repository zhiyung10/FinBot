/**
 * Receipt OCR Scanner Module
 * Uses Tesseract.js to extract text and amounts from receipt images.
 * Extracted amounts can be added to the Expense Input.
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

  // Announce to screen reader
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

    // Extract amounts
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
  // Match patterns like: RM 12.50, RM12.50, 12.50, MYR 12.50
  const pattern = /(?:RM|MYR|rm|Rm)?\s?(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2})?)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const cleaned = match[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0.5 && num < 100000) {
      amounts.push(num);
    }
  }

  // Remove duplicates and sort descending
  return [...new Set(amounts)].sort(function (a, b) { return b - a; });
}

/**
 * Try to find the total amount (usually the largest or has "TOTAL" nearby)
 */
function findTotal(text, amounts) {
  const totalPattern = /(?:total|grand total|amount|jumlah|bayar|subtotal)[:\s]*(?:RM|MYR)?\s?(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2})?)/gi;
  const match = totalPattern.exec(text);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }
  // Fallback: largest amount
  return amounts.length > 0 ? amounts[0] : null;
}

/**
 * Display OCR results
 */
function displayOCRResults(rawText, amounts) {
  const resultsEl = document.getElementById('ocrResults');
  const total = findTotal(rawText, amounts);
  ocrSelectedAmount = total;

  let html = '';

  // Show detected total
  if (total) {
    html += '<div class="ocr-total">';
    html += '<div class="ocr-total-label">Detected Total</div>';
    html += '<div class="ocr-total-value">RM' + total.toFixed(2) + '</div>';
    html += '</div>';
  }

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

  // Add to expenses form
  html += '<div class="ocr-add-section">';
  html += '<label for="ocrDescription" class="ocr-form-label">Description (optional)</label>';
  html += '<input type="text" id="ocrDescription" class="ocr-input" placeholder="e.g., Lunch at restaurant" aria-label="Expense description">';
  html += '<label for="ocrAmount" class="ocr-form-label">Amount (RM)</label>';
  html += '<input type="number" id="ocrAmount" class="ocr-input" step="0.01" min="0.01" value="' + (ocrSelectedAmount || '') + '" aria-label="Expense amount in Ringgit">';
  html += '<button class="btn btn-primary" onclick="addOCRToExpenses()" aria-label="Add scanned amount to expenses">Add to Expenses</button>';
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
  // Update chip styles
  document.querySelectorAll('.ocr-chip').forEach(function (chip) {
    chip.classList.remove('selected');
    if (chip.textContent === 'RM' + amt.toFixed(2)) chip.classList.add('selected');
  });
}

/**
 * Add the selected amount to the Expense Input textarea
 */
function addOCRToExpenses() {
  const amountInput = document.getElementById('ocrAmount');
  const descInput = document.getElementById('ocrDescription');
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    showOCRError('Please enter a valid amount greater than 0.');
    return;
  }

  const description = descInput.value.trim() || 'Receipt Item';
  const expenseEntry = description + ' RM' + amount.toFixed(2);

  // Append to expense input
  const expenseInput = document.getElementById('expenseInput');
  if (expenseInput.value.trim()) {
    expenseInput.value += '\n' + expenseEntry;
  } else {
    expenseInput.value = expenseEntry;
  }

  // Show success
  const statusEl = document.getElementById('ocrStatus');
  statusEl.textContent = 'Added "' + expenseEntry + '" to your expenses.';
  statusEl.style.display = 'block';

  if (typeof announce === 'function') announce('Added ' + expenseEntry + ' to expenses.');

  // Reset form
  descInput.value = '';
  amountInput.value = '';
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
