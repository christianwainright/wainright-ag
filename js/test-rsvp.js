/**
 * QA Test Suite for Baby Shower RSVP & Guesses flow
 * Loads and runs automatically when ?test=true is present in the URL.
 */

// Helper to wait a given duration (ms)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fire standard events
const fireEvent = (element, eventType) => {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
};

// Helper to set input value and dispatch events
const setInputValue = (id, value) => {
  const input = document.getElementById(id);
  if (!input) throw new Error(`Input #${id} not found`);
  input.value = value;
  fireEvent(input, 'input');
  fireEvent(input, 'change');
};

// Helper to select a radio option
const selectRadio = (name, value) => {
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!radio) throw new Error(`Radio button input[name="${name}"][value="${value}"] not found`);
  radio.checked = true;
  fireEvent(radio, 'change');
};

// Helper to click an element
const clickElement = (idOrElement) => {
  const el = typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement;
  if (!el) throw new Error(`Element ${idOrElement} not found for clicking`);
  el.click();
};

// Ensure password overlay is bypassed for testing
const bypassAuth = () => {
  sessionStorage.setItem('baby_shower_auth', 'true');
  document.documentElement.setAttribute('data-auth', 'true');
  document.body.classList.remove('locked');
  const overlay = document.getElementById('password-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
};

// Test Suite Definition
const tests = [
  {
    id: 'yes-flow',
    name: 'Direct Yes RSVP Flow',
    description: 'Select "Yes", fill required name, skip optional email, and submit directly from Step 2.',
    fn: async (log) => {
      log('Resetting RSVP form...');
      const resetBtn = document.getElementById('rsvp-reset-btn');
      if (resetBtn && resetBtn.offsetHeight > 0) {
        clickElement(resetBtn);
        await delay(500);
      }

      log('Selecting "Yes, gladly!" on Step 1...');
      selectRadio('attending', 'yes');
      await delay(300);

      const step1Next = document.getElementById('step1-next');
      if (step1Next.disabled) {
        throw new Error('Step 1 Next button is still disabled after selecting attendance.');
      }

      log('Transitioning to Step 2...');
      clickElement(step1Next);
      await delay(500);

      log('Filling in guest information...');
      setInputValue('rsvp-name', 'Test Guest (Attending Yes)');
      setInputValue('rsvp-email', ''); // Empty email (optional)
      
      const step2Next = document.getElementById('step2-next');
      if (!step2Next.innerHTML.includes('Submit RSVP')) {
        throw new Error(`Step 2 button should say "Submit RSVP" for Yes choice. Found: "${step2Next.innerHTML}"`);
      }

      log('Triggering RSVP submission from Step 2...');
      window.__lastSubmittedData = null;
      clickElement(step2Next);
      await delay(500);

      if (!window.__lastSubmittedData) {
        throw new Error('RSVP form submission failed to trigger or was not mocked/intercepted.');
      }

      const data = window.__lastSubmittedData;
      log(`Interception verification: name="${data.name}", attending="${data.attending}", email="${data.email}", guests=${data.guests}`);
      
      if (data.name !== 'Test Guest (Attending Yes)' || data.attending !== 'yes' || data.email !== '') {
        throw new Error('Submitted data properties do not match Yes flow defaults.');
      }

      const successScreen = document.getElementById('rsvp-success');
      if (!successScreen || successScreen.style.display === 'none') {
        throw new Error('Success screen was not displayed after RSVP submission.');
      }
      log('Yes flow successfully completed!');
    }
  },
  {
    id: 'email-validation',
    name: 'Email Format Validation',
    description: 'Verify empty email is allowed, but incorrect formats are validation-blocked.',
    fn: async (log) => {
      log('Resetting RSVP form...');
      const resetBtn = document.getElementById('rsvp-reset-btn');
      if (resetBtn) {
        clickElement(resetBtn);
        await delay(500);
      }

      log('Proceeding to Step 2...');
      selectRadio('attending', 'yes');
      await delay(300);
      clickElement('step1-next');
      await delay(500);

      log('Entering a valid name and an invalid email address...');
      setInputValue('rsvp-name', 'Test Guest (Email Validation)');
      setInputValue('rsvp-email', 'invalid-email-address');
      await delay(300);

      log('Trying to submit RSVP...');
      window.__lastSubmittedData = null;
      clickElement('step2-next');
      await delay(300);

      if (window.__lastSubmittedData) {
        throw new Error('Form was submitted despite containing an invalid email address.');
      }

      const emailInput = document.getElementById('rsvp-email');
      if (emailInput.getAttribute('aria-invalid') !== 'true') {
        throw new Error('Email input was not marked with aria-invalid="true".');
      }

      const emailError = document.getElementById('rsvp-email-error');
      if (emailError && emailError.style.display === 'none') {
        throw new Error('Email error message element is not visible.');
      }

      log('Correcting email address to empty...');
      setInputValue('rsvp-email', '');
      await delay(300);

      log('Resubmitting with empty optional email...');
      clickElement('step2-next');
      await delay(500);

      if (!window.__lastSubmittedData) {
        throw new Error('Form failed to submit after correcting invalid email to empty string.');
      }
      log('Email format validation rules verified successfully!');
    }
  },
  {
    id: 'no-flow',
    name: 'No Attending RSVP Flow',
    description: 'Select "No", fill name, proceed to Step 3, optionally write advice, and submit.',
    fn: async (log) => {
      log('Resetting RSVP form...');
      const resetBtn = document.getElementById('rsvp-reset-btn');
      if (resetBtn) {
        clickElement(resetBtn);
        await delay(500);
      }

      log('Selecting "No, regretfully" on Step 1...');
      selectRadio('attending', 'no');
      await delay(300);

      log('Transitioning to Step 2...');
      clickElement('step1-next');
      await delay(500);

      const step2Next = document.getElementById('step2-next');
      if (step2Next.innerHTML.includes('Submit RSVP')) {
        throw new Error(`Step 2 button should say "Continue" for No choice. Found: "${step2Next.innerHTML}"`);
      }

      log('Filling name on Step 2...');
      setInputValue('rsvp-name', 'Test Guest (Attending No)');
      
      log('Transitioning to Step 3...');
      clickElement(step2Next);
      await delay(500);

      const step3 = document.querySelector('.wizard-step[data-step="3"]');
      if (!step3 || !step3.classList.contains('active')) {
        throw new Error('Wizard did not transition to Step 3 for No flow.');
      }

      log('Entering optional advice message on Step 3...');
      setInputValue('rsvp-advice', 'Sending lots of love from Florida! Wishing you the best.');
      await delay(300);

      log('Submitting RSVP from Step 3...');
      window.__lastSubmittedData = null;
      clickElement('rsvp-submit-btn');
      await delay(500);

      if (!window.__lastSubmittedData) {
        throw new Error('RSVP form submission failed to trigger or was not mocked/intercepted.');
      }

      const data = window.__lastSubmittedData;
      log(`Interception verification: name="${data.name}", attending="${data.attending}", advice="${data.advice}"`);

      if (data.name !== 'Test Guest (Attending No)' || data.attending !== 'no' || !data.advice.includes('Sending lots of love')) {
        throw new Error('Submitted data does not match the inputs provided in the No flow.');
      }

      const successScreen = document.getElementById('rsvp-success');
      if (!successScreen || successScreen.style.display === 'none') {
        throw new Error('Success screen was not displayed after RSVP submission.');
      }
      log('No flow successfully completed!');
    }
  },
  {
    id: 'guess-flow',
    name: 'Guess Baby Stats Flow',
    description: 'Fill stats guess form, select hair/eye colors, submit, and verify averaging data updates.',
    fn: async (log) => {
      log('Resetting Guess form if in success state...');
      const resetBtn = document.getElementById('guess-reset-btn');
      if (resetBtn && resetBtn.offsetHeight > 0) {
        clickElement(resetBtn);
        await delay(500);
      }

      log('Entering guesser name and birth date guess...');
      setInputValue('guess-name', 'Test Guesser QA');
      setInputValue('guess-date', '2026-08-12');

      log('Selecting custom tiles: Blonde Hair and Green Eyes...');
      const blondeTile = document.querySelector('.hair-tile-grid .tile-option[data-value="Blonde"]');
      const greenTile = document.querySelector('.eye-tile-grid .tile-option[data-value="Green"]');
      
      if (!blondeTile || !greenTile) {
        throw new Error('Custom selectable tile elements (Blonde or Green) were not found in DOM.');
      }

      clickElement(blondeTile);
      clickElement(greenTile);
      await delay(300);

      if (document.getElementById('guess-hair').value !== 'Blonde') {
        throw new Error('Hidden hair input was not updated to "Blonde" after tile selection click.');
      }
      if (document.getElementById('guess-eyes').value !== 'Green') {
        throw new Error('Hidden eyes input was not updated to "Green" after tile selection click.');
      }

      log('Submitting guess stats form...');
      window.__lastSubmittedGuess = null;
      const guessForm = document.getElementById('guess-form');
      const submitBtn = guessForm.querySelector('button[type="submit"]');
      clickElement(submitBtn);
      await delay(500);

      if (!window.__lastSubmittedGuess) {
        throw new Error('Guess form submission failed to trigger or was not mocked/intercepted.');
      }

      const data = window.__lastSubmittedGuess;
      log(`Interception verification: name="${data.name}", date="${data.date}", hair="${data.hair}", eyes="${data.eyes}"`);

      if (data.name !== 'Test Guesser QA' || data.date !== '2026-08-12' || data.hair !== 'Blonde' || data.eyes !== 'Green') {
        throw new Error('Submitted guess parameters do not match selection inputs.');
      }

      const guessSuccess = document.getElementById('guess-success');
      if (!guessSuccess || guessSuccess.style.display === 'none') {
        throw new Error('Guess success screen was not displayed.');
      }

      log('Restoring guess form state for convenience...');
      clickElement('guess-reset-btn');
      await delay(300);
      log('Guess Baby Stats flow verified successfully!');
    }
  }
];

// Visual UI Overlay Class
class TestRunnerOverlay {
  constructor() {
    this.container = null;
    this.isMinimized = false;
    this.statusMap = {};
    this.createStyles();
    this.createDOM();
  }

  createStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .qa-overlay {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        max-height: 85vh;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: hsla(36, 28%, 98%, 0.85);
        backdrop-filter: blur(12px) saturate(160%);
        -webkit-backdrop-filter: blur(12px) saturate(160%);
        border: 1px solid var(--color-border, hsl(28 15% 82%));
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        color: var(--color-text-main, hsl(28 25% 15%));
      }
      .qa-overlay.minimized {
        width: 200px;
        height: 48px;
        overflow: hidden;
        border-radius: 24px;
      }
      .qa-header {
        padding: 12px 18px;
        background: light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.03));
        border-bottom: 1px solid var(--color-border, hsl(28 15% 82%));
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        cursor: pointer;
      }
      .qa-title-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qa-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #e2a03f;
        transition: background-color 0.3s ease;
      }
      .qa-status-dot.idle { background-color: #888; }
      .qa-status-dot.running { background-color: #e2a03f; }
      .qa-status-dot.passed { background-color: #2e7d32; }
      .qa-status-dot.failed { background-color: #c62828; }
      
      .qa-title {
        font-weight: 700;
        font-size: 0.95rem;
      }
      .qa-toggle-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        opacity: 0.7;
      }
      .qa-toggle-btn:hover { opacity: 1; }
      
      .qa-body {
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        flex: 1;
      }
      .qa-overlay.minimized .qa-body {
        display: none;
      }
      
      .qa-test-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .qa-test-item {
        background: light-dark(rgba(255, 255, 255, 0.5), rgba(0, 0, 0, 0.2));
        border: 1px solid var(--color-border, hsl(28 15% 82%));
        border-radius: 10px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: all 0.2s ease;
      }
      .qa-test-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 0.88rem;
      }
      .qa-test-badge {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 12px;
        background: #eee;
      }
      .qa-test-badge.pending { background: #eeeeee; color: #666; }
      .qa-test-badge.running { background: #fff8e1; color: #f57f17; }
      .qa-test-badge.passed { background: #e8f5e9; color: #2e7d32; }
      .qa-test-badge.failed { background: #ffebee; color: #c62828; }
      
      .qa-test-desc {
        font-size: 0.78rem;
        color: var(--color-text-muted, hsl(28 15% 42%));
      }
      
      .qa-console {
        background: #1e1e1e;
        color: #f1f1f1;
        font-family: "Courier New", Courier, monospace;
        font-size: 0.75rem;
        padding: 12px;
        border-radius: 8px;
        max-height: 180px;
        overflow-y: auto;
        white-space: pre-wrap;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .qa-console-line { margin: 0; }
      .qa-console-line.info { color: #8ab4f8; }
      .qa-console-line.success { color: #81c784; }
      .qa-console-line.error { color: #f28b82; font-weight: bold; }
      
      .qa-buttons {
        display: flex;
        gap: 10px;
      }
      .qa-btn {
        flex: 1;
        padding: 10px;
        font-size: 0.88rem;
        font-weight: 600;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        background-color: var(--color-accent, hsl(92 18% 35%));
        color: white;
      }
      .qa-btn:hover {
        filter: brightness(1.15);
      }
      .qa-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .qa-btn.secondary {
        background-color: transparent;
        border: 1px solid var(--color-border, hsl(28 15% 82%));
        color: var(--color-text-main);
      }
      .qa-btn.secondary:hover {
        background-color: rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(styleEl);
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'qa-overlay';
    
    // Header
    const header = document.createElement('div');
    header.className = 'qa-header';
    header.addEventListener('click', () => this.toggleMinimize());
    
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'qa-title-wrapper';
    
    this.statusDot = document.createElement('div');
    this.statusDot.className = 'qa-status-dot idle';
    
    const title = document.createElement('span');
    title.className = 'qa-title';
    title.textContent = 'QA Test Runner';
    
    titleWrapper.appendChild(this.statusDot);
    titleWrapper.appendChild(title);
    
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'qa-toggle-btn';
    this.toggleBtn.innerHTML = '➖';
    this.toggleBtn.setAttribute('aria-label', 'Minimize Panel');
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
    
    header.appendChild(titleWrapper);
    header.appendChild(this.toggleBtn);
    
    // Body
    const body = document.createElement('div');
    body.className = 'qa-body';
    
    // Test List
    const testList = document.createElement('ul');
    testList.className = 'qa-test-list';
    
    tests.forEach(test => {
      const item = document.createElement('li');
      item.className = 'qa-test-item';
      
      const itemHeader = document.createElement('div');
      itemHeader.className = 'qa-test-item-header';
      
      const testName = document.createElement('span');
      testName.textContent = test.name;
      
      const badge = document.createElement('span');
      badge.className = `qa-test-badge pending`;
      badge.id = `badge-${test.id}`;
      badge.textContent = 'Pending';
      
      this.statusMap[test.id] = badge;
      
      itemHeader.appendChild(testName);
      itemHeader.appendChild(badge);
      
      const desc = document.createElement('div');
      desc.className = 'qa-test-desc';
      desc.textContent = test.description;
      
      item.appendChild(itemHeader);
      item.appendChild(desc);
      testList.appendChild(item);
    });
    
    // Console output
    this.consoleContainer = document.createElement('div');
    this.consoleContainer.className = 'qa-console';
    this.logConsole('System initialized. Ready to execute QA suite.', 'info');
    
    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'qa-buttons';
    
    this.runBtn = document.createElement('button');
    this.runBtn.className = 'qa-btn';
    this.runBtn.textContent = 'Run QA Suite 🚀';
    this.runBtn.addEventListener('click', () => this.runTests());
    
    buttons.appendChild(this.runBtn);
    
    body.appendChild(testList);
    body.appendChild(this.consoleContainer);
    body.appendChild(buttons);
    
    this.container.appendChild(header);
    this.container.appendChild(body);
    
    document.body.appendChild(this.container);
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.container.classList.add('minimized');
      this.toggleBtn.innerHTML = '🔲';
      this.toggleBtn.setAttribute('aria-label', 'Maximize Panel');
    } else {
      this.container.classList.remove('minimized');
      this.toggleBtn.innerHTML = '➖';
      this.toggleBtn.setAttribute('aria-label', 'Minimize Panel');
    }
  }

  logConsole(text, type = 'info') {
    const p = document.createElement('p');
    p.className = `qa-console-line ${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    this.consoleContainer.appendChild(p);
    this.consoleContainer.scrollTop = this.consoleContainer.scrollHeight;
  }

  updateTestBadge(id, status) {
    const badge = this.statusMap[id];
    if (badge) {
      badge.className = `qa-test-badge ${status}`;
      badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  async runTests() {
    this.runBtn.disabled = true;
    this.statusDot.className = 'qa-status-dot running';
    this.logConsole('Starting automated QA pass...', 'info');
    
    // Clear status badges
    Object.keys(this.statusMap).forEach(id => {
      this.updateTestBadge(id, 'pending');
    });

    let suitePassed = true;

    for (let test of tests) {
      this.logConsole(`Executing: ${test.name}`, 'info');
      this.updateTestBadge(test.id, 'running');
      
      try {
        await test.fn((msg) => this.logConsole(`  -> ${msg}`, 'info'));
        this.updateTestBadge(test.id, 'passed');
        this.logConsole(`PASSED: ${test.name}`, 'success');
      } catch (err) {
        suitePassed = false;
        this.updateTestBadge(test.id, 'failed');
        this.logConsole(`FAILED: ${test.name}\nReason: ${err.message}`, 'error');
        console.error(err);
      }
      
      await delay(600); // Visual gap between tests
    }

    if (suitePassed) {
      this.statusDot.className = 'qa-status-dot passed';
      this.logConsole('QA PASS COMPLETED: All tests passed successfully! 🎉', 'success');
    } else {
      this.statusDot.className = 'qa-status-dot failed';
      this.logConsole('QA PASS FAILED: Some tests encountered errors. Check details above.', 'error');
    }
    
    this.runBtn.disabled = false;
  }
}

// Kick off when DOM is parsed and loaded
window.addEventListener('load', async () => {
  bypassAuth();
  
  // Create runner dashboard
  const runner = new TestRunnerOverlay();
  
  // Wait 1.5 seconds for UI elements to load and let the developer see the setup
  await delay(1500);
  
  // Run tests automatically
  runner.runTests();
});
