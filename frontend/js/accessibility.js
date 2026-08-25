/**
 * FinBot Accessibility Module — Phase 1
 * 
 * Provides a reliable screen-reader announcement system using ARIA live regions.
 * Works with NVDA, Windows Narrator, JAWS, VoiceOver, TalkBack.
 * 
 * Usage:
 *   FinBotAccessibility.announce("Expense saved successfully.");
 *   FinBotAccessibility.announce("Error: could not save.", "assertive");
 * 
 * Does NOT use SpeechSynthesis (text-to-speech).
 * Does NOT add external libraries.
 * Uses native ARIA live regions for real screen reader support.
 */

(function () {
  'use strict';

  // Prevent double-initialization
  if (window.FinBotAccessibility && window.FinBotAccessibility._initialized) {
    return;
  }

  var POLITE_ID = 'finbot-live-announcer';
  var ASSERTIVE_ID = 'finbot-live-announcer-assertive';
  var politeEl = null;
  var assertiveEl = null;
  var clearTimer = null;

  /**
   * Initialize the accessibility system.
   * Creates persistent ARIA live regions if they don't already exist.
   * Safe to call multiple times (idempotent).
   */
  function init() {
    // Create polite announcer
    politeEl = document.getElementById(POLITE_ID);
    if (!politeEl) {
      politeEl = document.createElement('div');
      politeEl.id = POLITE_ID;
      politeEl.setAttribute('role', 'status');
      politeEl.setAttribute('aria-live', 'polite');
      politeEl.setAttribute('aria-atomic', 'true');
      politeEl.className = 'finbot-sr-only';
      document.body.appendChild(politeEl);
    }

    // Create assertive announcer
    assertiveEl = document.getElementById(ASSERTIVE_ID);
    if (!assertiveEl) {
      assertiveEl = document.createElement('div');
      assertiveEl.id = ASSERTIVE_ID;
      assertiveEl.setAttribute('role', 'alert');
      assertiveEl.setAttribute('aria-live', 'assertive');
      assertiveEl.setAttribute('aria-atomic', 'true');
      assertiveEl.className = 'finbot-sr-only';
      document.body.appendChild(assertiveEl);
    }

    FinBotAccessibility._initialized = true;
  }

  /**
   * Announce a message to screen readers via ARIA live region.
   * 
   * @param {string} message - The message to announce.
   * @param {string} [priority='polite'] - 'polite' or 'assertive'.
   *   - polite: waits for the user's current interaction to finish
   *   - assertive: interrupts immediately (use for errors/urgent)
   */
  function announce(message, priority) {
    if (!message || typeof message !== 'string') return;

    // Validate priority
    if (priority !== 'polite' && priority !== 'assertive') {
      priority = 'polite';
    }

    // Ensure initialized
    if (!politeEl || !assertiveEl) {
      init();
    }

    var targetEl = (priority === 'assertive') ? assertiveEl : politeEl;

    // Handle repeated messages:
    // Clear first, then set after a brief delay so the accessibility tree
    // detects the change even if the same text is announced again.
    clearTimeout(clearTimer);
    targetEl.textContent = '';

    clearTimer = setTimeout(function () {
      targetEl.textContent = message;
    }, 60);
  }

  /**
   * Clear any active announcement.
   */
  function clear() {
    if (politeEl) politeEl.textContent = '';
    if (assertiveEl) assertiveEl.textContent = '';
  }

  // Expose public API
  window.FinBotAccessibility = {
    init: init,
    announce: announce,
    clear: clear,
    _initialized: false
  };

  // ========== COMPATIBILITY ==========
  // The existing FinBot codebase calls window.announce() in many places.
  // Route through FinBotAccessibility.announce() for reliability.
  // This preserves backward compatibility without a large refactor.
  var _existingAnnounce = window.announce;
  window.announce = function (message, priority) {
    // Call the new reliable system
    FinBotAccessibility.announce(message, priority);

    // Also update the old #a11y-announce element for any code that reads it directly
    var oldEl = document.getElementById('a11y-announce');
    if (oldEl) {
      oldEl.textContent = '';
      setTimeout(function () { oldEl.textContent = message || ''; }, 50);
    }
  };

  // ========== AUTO-INIT ==========
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
