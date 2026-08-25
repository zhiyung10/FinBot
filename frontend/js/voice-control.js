/**
 * Voice Recognition & Control Module
 * Uses the Web Speech API (SpeechRecognition) - fully client-side, no audio uploads.
 * Provides: voice commands for navigation, speech-to-text for input fields, 
 * and integration with the existing accessibility system.
 */

// ========== STATE ==========
let voiceEnabled = false;
let voiceListening = false;
let voiceRecognition = null;
let voiceTargetInput = null; // Which input field to fill
let voiceMode = 'command'; // 'command' or 'dictation'
let pendingAction = null; // For confirmation flow

// ========== INITIALIZATION ==========

/**
 * Check if Web Speech API is supported
 */
function isVoiceSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Initialize voice recognition instance
 */
function initVoiceRecognition() {
  if (!isVoiceSupported()) return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-MY'; // English (Malaysia)
  recognition.maxAlternatives = 1;

  recognition.onstart = function () {
    voiceListening = true;
    updateVoiceUI('listening');
  };

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript.trim();
    const confidence = event.results[0][0].confidence;
    handleVoiceResult(transcript, confidence);
  };

  recognition.onerror = function (event) {
    voiceListening = false;
    updateVoiceUI('error');

    let msg = 'Voice recognition error.';
    switch (event.error) {
      case 'no-speech': msg = 'No speech detected. Please try again.'; break;
      case 'audio-capture': msg = 'No microphone found. Check your device settings.'; break;
      case 'not-allowed': msg = 'Microphone permission denied. Enable it in browser settings.'; break;
      case 'network': msg = 'Network error during recognition.'; break;
      case 'aborted': msg = 'Voice input cancelled.'; break;
    }

    showVoiceFeedback(msg, 'error');
  };

  recognition.onend = function () {
    voiceListening = false;
    updateVoiceUI('idle');
  };

  return recognition;
}

// ========== VOICE CONTROL ==========

/**
 * Start voice listening
 */
function startVoiceInput(mode, targetInputId) {
  if (!isVoiceSupported()) {
    showVoiceFeedback('Voice recognition is not supported in this browser. Try Chrome or Edge.', 'error');
    return;
  }

  if (voiceListening) {
    stopVoiceInput();
    return;
  }

  voiceMode = mode || 'command';
  voiceTargetInput = targetInputId || null;

  if (!voiceRecognition) {
    voiceRecognition = initVoiceRecognition();
  }

  if (!voiceRecognition) return;

  try {
    voiceRecognition.start();
  } catch (e) {
    // Already started
    voiceRecognition.stop();
    setTimeout(function () { voiceRecognition.start(); }, 100);
  }
}

/**
 * Stop voice listening
 */
function stopVoiceInput() {
  if (voiceRecognition && voiceListening) {
    voiceRecognition.stop();
  }
  voiceListening = false;
  updateVoiceUI('idle');
}

/**
 * Handle recognized speech
 */
function handleVoiceResult(transcript, confidence) {
  updateVoiceUI('processing');
  showVoiceFeedback('Recognized: "' + transcript + '"', 'success');

  if (voiceMode === 'dictation' && voiceTargetInput) {
    handleDictation(transcript);
  } else if (voiceMode === 'command') {
    handleVoiceCommand(transcript);
  }
}

// ========== DICTATION (Speech-to-Text for inputs) ==========

/**
 * Insert recognized text into target input field
 */
function handleDictation(text) {
  const input = document.getElementById(voiceTargetInput);
  if (!input) {
    showVoiceFeedback('No input field selected.', 'error');
    return;
  }

  // Show confirmation for financial inputs
  const isFinancial = ['incomeInput', 'expenseInput', 'assetInput', 'budgetInput'].includes(voiceTargetInput);

  if (isFinancial) {
    showVoiceConfirmation(
      'Add to input: "' + text + '"',
      function () {
        appendToInput(input, text);
        showVoiceFeedback('Added: ' + text, 'success');
      }
    );
  } else {
    appendToInput(input, text);
    showVoiceFeedback('Added: ' + text, 'success');
  }
}

function appendToInput(input, text) {
  if (input.tagName === 'TEXTAREA') {
    if (input.value.trim()) {
      input.value += '\n' + text;
    } else {
      input.value = text;
    }
  } else {
    input.value = text;
  }
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// ========== VOICE COMMANDS ==========

/**
 * Parse and execute voice commands.
 * Uses normalized alias matching against actual page IDs.
 */
function handleVoiceCommand(transcript) {
  // Normalize: lowercase, trim, strip punctuation, collapse spaces
  const cmd = transcript.toLowerCase().trim()
    .replace(/[.,!?;:'"。，！？；：]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ---- NAVIGATION COMMANDS ----
  // Maps phrases (normalized) → actual page IDs used by showPage()
  const navAliases = [
    // Home
    { phrases: ['home', 'go home', 'go to home', 'open home', 'show home', 'homepage', 'dashboard', 'go to dashboard', '去 home', '打开 home'], page: 'home' },
    // Money
    { phrases: ['money', 'go to money', 'open money', 'show money', 'finances', 'open finances', 'my finances', '去 money', '打开 money'], page: 'money' },
    // Plan
    { phrases: ['plan', 'go to plan', 'open plan', 'show plan', 'budget', 'open budget', '去 plan', '打开 plan'], page: 'plan' },
    // AI Advisor
    { phrases: ['ai advisor', 'advisor', 'open advisor', 'open ai advisor', 'go to advisor', 'go to ai advisor', 'ai', 'open ai', '去 advisor', '打开 advisor'], page: 'ai' },
    // Insights
    { phrases: ['insights', 'open insights', 'go to insights', 'show insights', '去 insights', '打开 insights'], page: 'insights' },
    // Calendar
    { phrases: ['calendar', 'open calendar', 'go to calendar', 'show calendar', 'financial calendar', '去 calendar', '打开 calendar'], page: 'calendar' },
    // Receipt OCR
    { phrases: ['receipt', 'receipt ocr', 'open receipt', 'open receipt ocr', 'scan receipt', 'receipt scanner', 'open receipt scanner', '去 receipt', '打开 receipt'], page: 'receipt' },
    // Accessibility
    { phrases: ['accessibility', 'open accessibility', 'accessibility settings', 'settings', 'open settings', '去 accessibility', '打开 accessibility'], page: 'accessibility' },
  ];

  // Try exact match first, then includes match (longer phrases first to avoid partial hits)
  for (const group of navAliases) {
    // Sort phrases longest first so "go to home" matches before "home"
    const sorted = group.phrases.slice().sort(function(a, b) { return b.length - a.length; });
    for (const phrase of sorted) {
      if (cmd === phrase || cmd === 'go to ' + phrase || cmd === 'open ' + phrase) {
        if (typeof showPage === 'function') {
          showPage(group.page);
          showVoiceFeedback('Opening ' + group.page + '.', 'success');
          return;
        }
      }
    }
  }

  // Second pass: check if command contains a navigation phrase
  // Only match if the command is short (≤5 words) to avoid false positives from sentences
  var wordCount = cmd.split(' ').length;
  if (wordCount <= 5) {
    for (const group of navAliases) {
      const sorted = group.phrases.slice().sort(function(a, b) { return b.length - a.length; });
      for (const phrase of sorted) {
        if (cmd.includes(phrase)) {
          if (typeof showPage === 'function') {
            showPage(group.page);
            showVoiceFeedback('Opening ' + group.page + '.', 'success');
            return;
          }
        }
      }
    }
  }

  // ---- UTILITY COMMANDS ----
  if (cmd === 'go back' || cmd === 'back') {
    window.history.back();
    showVoiceFeedback('Going back.', 'success');
    return;
  }
  if (cmd.includes('scroll down')) {
    window.scrollBy(0, 300);
    showVoiceFeedback('Scrolling down.', 'success');
    return;
  }
  if (cmd.includes('scroll up')) {
    window.scrollBy(0, -300);
    showVoiceFeedback('Scrolling up.', 'success');
    return;
  }

  // ---- ACTION COMMANDS ----
  if (cmd.includes('generate dashboard') || cmd.includes('run dashboard')) {
    if (typeof runFeature === 'function') { runFeature('dashboard'); showVoiceFeedback('Generating dashboard.', 'success'); return; }
  }
  if (cmd.includes('analyze budget') || cmd.includes('run budget')) {
    if (typeof runFeature === 'function') { runFeature('budget'); showVoiceFeedback('Analyzing budget.', 'success'); return; }
  }
  if (cmd.includes('get recommendation') || cmd.includes('run recommendation')) {
    if (typeof runFeature === 'function') { runFeature('recommendation'); showVoiceFeedback('Getting recommendations.', 'success'); return; }
  }
  if (cmd.includes('generate report') || cmd.includes('health report')) {
    if (typeof runFeature === 'function') { runFeature('health'); showVoiceFeedback('Generating health report.', 'success'); return; }
  }
  if (cmd.includes('analyze subscription') || cmd.includes('run subscription')) {
    if (typeof runFeature === 'function') { runFeature('subscription'); showVoiceFeedback('Analyzing subscriptions.', 'success'); return; }
  }
  if (cmd.includes('dark mode') || cmd.includes('light mode') || cmd.includes('toggle theme')) {
    if (typeof toggleTheme === 'function') { toggleTheme(); showVoiceFeedback('Theme toggled.', 'success'); return; }
  }

  // ---- NOT RECOGNIZED ----
  showVoiceFeedback('Command not recognized: "' + transcript + '". Try "go home" or "open money".', 'info');
}

// ========== CONFIRMATION FLOW ==========

function showVoiceConfirmation(message, onConfirm) {
  pendingAction = onConfirm;
  const modal = document.getElementById('voiceConfirmModal');
  const msgEl = document.getElementById('voiceConfirmMessage');
  msgEl.textContent = message;
  modal.style.display = 'flex';
  modal.querySelector('.voice-confirm-yes').focus();
}

function confirmVoiceAction() {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  document.getElementById('voiceConfirmModal').style.display = 'none';
}

function cancelVoiceAction() {
  pendingAction = null;
  document.getElementById('voiceConfirmModal').style.display = 'none';
  showVoiceFeedback('Action cancelled.', 'info');
}

// ========== UI FEEDBACK ==========

function updateVoiceUI(state) {
  const indicators = document.querySelectorAll('.voice-indicator');
  indicators.forEach(function (el) {
    el.className = 'voice-indicator voice-' + state;
    switch (state) {
      case 'listening': el.textContent = '🎤 Listening...'; break;
      case 'processing': el.textContent = '⏳ Processing...'; break;
      case 'error': el.textContent = '❌ Error'; break;
      default: el.textContent = '🎤'; break;
    }
  });

  // Update all mic buttons
  document.querySelectorAll('.voice-mic-btn').forEach(function (btn) {
    if (state === 'listening') {
      btn.classList.add('voice-active');
      btn.setAttribute('aria-label', 'Stop voice input');
    } else {
      btn.classList.remove('voice-active');
      btn.setAttribute('aria-label', 'Start voice input');
    }
  });
}

function showVoiceFeedback(message, type) {
  const feedbackEl = document.getElementById('voiceFeedback');
  if (!feedbackEl) return;

  feedbackEl.textContent = message;
  feedbackEl.className = 'voice-feedback voice-feedback-' + type;
  feedbackEl.style.display = 'block';

  clearTimeout(feedbackEl._timeout);
  feedbackEl._timeout = setTimeout(function () {
    feedbackEl.style.display = 'none';
  }, 4000);
}

// ========== HELPER: Add mic button to a textarea ==========

function addMicButton(textareaId, label) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const wrapper = textarea.parentElement;
  if (wrapper.querySelector('.voice-mic-btn')) return; // Already added

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'voice-mic-btn btn btn-secondary';
  btn.innerHTML = '🎤';
  btn.setAttribute('aria-label', 'Voice input for ' + (label || textareaId));
  btn.setAttribute('title', 'Click to speak into this field');
  btn.style.marginTop = '8px';
  btn.onclick = function () {
    startVoiceInput('dictation', textareaId);
  };

  wrapper.appendChild(btn);
}

// ========== INIT ON LOAD ==========

function initVoiceModule() {
  if (!isVoiceSupported()) return;

  // Add mic buttons to input textareas
  addMicButton('incomeInput', 'monthly income');
  addMicButton('expenseInput', 'monthly expenses');
  addMicButton('assetInput', 'current assets');
  addMicButton('subscriptionInput', 'subscriptions');
  addMicButton('budgetInput', 'budget plan');
  addMicButton('savingsInput', 'savings goal');
  addMicButton('adviseInput', 'financial question');
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoiceModule);
} else {
  initVoiceModule();
}
