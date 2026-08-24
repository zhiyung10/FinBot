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
    if (typeof announce === 'function') announce('Listening for your voice input.');
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
    if (typeof announce === 'function') announce(msg);
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
    if (typeof announce === 'function') announce('Voice recognition not supported in this browser.');
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
        if (typeof announce === 'function') announce('Added to input: ' + text);
      }
    );
  } else {
    appendToInput(input, text);
    showVoiceFeedback('Added: ' + text, 'success');
    if (typeof announce === 'function') announce('Text entered: ' + text);
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
 * Parse and execute voice commands
 */
function handleVoiceCommand(transcript) {
  const cmd = transcript.toLowerCase().trim();

  // Navigation commands
  const navMap = {
    'open home': 'welcome',
    'go home': 'welcome',
    'open dashboard': 'dashboard',
    'go to dashboard': 'dashboard',
    'open my finances': 'inputs',
    'open finances': 'inputs',
    'open budget': 'budget',
    'open budget monitor': 'budget',
    'open recommendations': 'recommendation',
    'open recommendation': 'recommendation',
    'open health report': 'health',
    'open health': 'health',
    'open subscriptions': 'subscription',
    'open subscription': 'subscription',
    'open advisor': 'advisor',
    'open ai advisor': 'advisor',
    'open chart': 'chart',
    'open expense chart': 'chart',
    'open savings progress': 'savingsprogress',
    'open savings': 'savingsprogress',
    'open comparison': 'comparison',
    'open monthly compare': 'comparison',
    'open export': 'export',
    'open receipt': 'receipt',
    'open receipt scanner': 'receipt',
    'open accessibility': 'accessibility',
    'open settings': 'accessibility',
    'go back': null, // special
    'scroll down': null,
    'scroll up': null,
  };

  // Check navigation commands
  for (const [phrase, page] of Object.entries(navMap)) {
    if (cmd.includes(phrase) || cmd === phrase) {
      if (phrase === 'go back') {
        window.history.back();
        showVoiceFeedback('Going back.', 'success');
        if (typeof announce === 'function') announce('Going back.');
        return;
      }
      if (phrase === 'scroll down') {
        window.scrollBy(0, 300);
        showVoiceFeedback('Scrolling down.', 'success');
        return;
      }
      if (phrase === 'scroll up') {
        window.scrollBy(0, -300);
        showVoiceFeedback('Scrolling up.', 'success');
        return;
      }
      if (page && typeof showPage === 'function') {
        showPage(page);
        showVoiceFeedback('Navigated to ' + page + '.', 'success');
        return;
      }
    }
  }

  // Action commands
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
  if (cmd.includes('scan receipt')) {
    if (typeof scanReceipt === 'function') { scanReceipt(); showVoiceFeedback('Scanning receipt.', 'success'); return; }
  }
  if (cmd.includes('export report') || cmd.includes('download report')) {
    if (typeof exportReport === 'function') { exportReport(); showVoiceFeedback('Exporting report.', 'success'); return; }
  }
  if (cmd.includes('dark mode') || cmd.includes('light mode') || cmd.includes('toggle theme')) {
    if (typeof toggleTheme === 'function') { toggleTheme(); showVoiceFeedback('Theme toggled.', 'success'); return; }
  }

  // If nothing matched, show what was heard
  showVoiceFeedback('Command not recognized: "' + transcript + '". Try "Open dashboard" or "Analyze budget".', 'info');
  if (typeof announce === 'function') announce('Command not recognized: ' + transcript);
}

// ========== CONFIRMATION FLOW ==========

function showVoiceConfirmation(message, onConfirm) {
  pendingAction = onConfirm;
  const modal = document.getElementById('voiceConfirmModal');
  const msgEl = document.getElementById('voiceConfirmMessage');
  msgEl.textContent = message;
  modal.style.display = 'flex';
  modal.querySelector('.voice-confirm-yes').focus();
  if (typeof announce === 'function') announce(message + '. Say Confirm or Cancel.');
}

function confirmVoiceAction() {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  document.getElementById('voiceConfirmModal').style.display = 'none';
}

function cancelVoiceAction() {
  pendingAction = null;
  document.getElementById('voiceConfirmModal').style.display = 'none';
  showVoiceFeedback('Action cancelled.', 'info');
  if (typeof announce === 'function') announce('Action cancelled.');
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
