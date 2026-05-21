// CONFIGURATION: Add your Google Apps Script Web App URL here to enable email notifications
const GOOGLE_APPS_SCRIPT_URL = ''; // e.g., 'https://script.google.com/macros/s/.../exec'

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initRSVPWizard();
  initStatsGame();
});

/**
 * Countdown Timer
 * Target: July 12, 2026 at 2:00 PM (14:00)
 */
function initCountdown() {
  const targetDate = new Date('August 9, 2026 14:00:00').getTime();
  
  const daysVal = document.getElementById('days-val');
  const hoursVal = document.getElementById('hours-val');
  const minsVal = document.getElementById('mins-val');
  const secsVal = document.getElementById('secs-val');

  if (!daysVal || !hoursVal || !minsVal || !secsVal) return;

  function updateTimer() {
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      document.getElementById('countdown-timer').innerHTML = `
        <div class="countdown-card" style="grid-column: 1 / -1; width: 100%; min-width: 250px;">
          <span class="countdown-value" style="font-size: 1.5rem;">The Celebration Has Begun! 🎉</span>
        </div>
      `;
      clearInterval(timerInterval);
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    daysVal.textContent = String(days).padStart(2, '0');
    hoursVal.textContent = String(hours).padStart(2, '0');
    minsVal.textContent = String(minutes).padStart(2, '0');
    secsVal.textContent = String(seconds).padStart(2, '0');
  }

  // Run initially and then set interval
  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

/**
 * RSVP Multi-step Wizard
 */
function initRSVPWizard() {
  const form = document.getElementById('rsvp-form');
  const wizard = document.getElementById('rsvp-wizard');
  const successScreen = document.getElementById('rsvp-success');
  const progressFill = document.getElementById('progress-fill');
  const progressBar = document.querySelector('.wizard-progress-bar');
  const resetBtn = document.getElementById('rsvp-reset-btn');

  if (!form || !wizard || !successScreen) return;

  const steps = wizard.querySelectorAll('.wizard-step');
  const nextBtns = wizard.querySelectorAll('.btn-next');
  const prevBtns = wizard.querySelectorAll('.btn-prev');
  const attendRadios = form.querySelectorAll('input[name="attending"]');
  const step1Next = document.getElementById('step1-next');
  const attendeeFields = form.querySelectorAll('.attendee-only-field');

  let currentStep = 1;
  let attendingChoice = null; // 'yes' or 'no'

  // Step 1: Radio Card interaction
  attendRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      attendingChoice = e.target.value;
      step1Next.removeAttribute('disabled');
      
      // Customize step 2 & 3 based on attending state
      if (attendingChoice === 'no') {
        attendeeFields.forEach(el => el.style.display = 'none');
      } else {
        attendeeFields.forEach(el => el.style.display = '');
      }
    });
  });

  // Next Buttons
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    });
  });

  // Prev Buttons
  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(currentStep - 1);
    });
  });

  // Submit RSVP Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    // Build data object
    const rsvpData = {
      type: 'rsvp',
      attending: attendingChoice === 'yes' ? 'yes' : 'no',
      name: document.getElementById('rsvp-name').value.trim(),
      guests: attendingChoice === 'yes' ? parseInt(document.getElementById('rsvp-count').value, 10) : 0,
      diet: attendingChoice === 'yes' ? document.getElementById('rsvp-diet').value.trim() : '',
      song: attendingChoice === 'yes' ? document.getElementById('rsvp-song').value.trim() : '',
      advice: document.getElementById('rsvp-advice').value.trim(),
      date: new Date().toISOString()
    };

    // Save to LocalStorage
    let rsvps = JSON.parse(localStorage.getItem('wainright_rsvps')) || [];
    rsvps.push(rsvpData);
    localStorage.setItem('wainright_rsvps', JSON.stringify(rsvps));

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending RSVP... ✉️';

    // Submit to Google Apps Script Web App if URL is configured
    if (typeof GOOGLE_APPS_SCRIPT_URL !== 'undefined' && GOOGLE_APPS_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Avoids CORS preflight blockages on redirects
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rsvpData)
        });
      } catch (err) {
        console.error('Error sending RSVP email:', err);
      }
    }

    // Restore button state (in case user updates later)
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;

    // Show Success Screen
    form.style.display = 'none';
    progressBar.style.display = 'none';
    successScreen.style.display = 'flex';

    const successMsg = document.getElementById('success-msg');
    if (rsvpData.attending === 'yes') {
      successMsg.textContent = `Yay! We've registered your RSVP, ${rsvpData.name}. We can't wait to see you on August 9th!`;
    } else {
      successMsg.textContent = `Thank you for letting us know, ${rsvpData.name}. We'll miss you, but appreciate your warm thoughts!`;
    }
  });

  // Reset Button (Update RSVP)
  resetBtn.addEventListener('click', () => {
    form.reset();
    attendingChoice = null;
    step1Next.setAttribute('disabled', 'true');
    attendeeFields.forEach(el => el.style.display = '');
    
    form.style.display = 'block';
    progressBar.style.display = 'block';
    successScreen.style.display = 'none';
    
    goToStep(1);
  });

  function goToStep(step) {
    steps.forEach(s => s.classList.remove('active'));
    currentStep = step;
    
    const targetStep = wizard.querySelector(`.wizard-step[data-step="${currentStep}"]`);
    if (targetStep) {
      targetStep.classList.add('active');
    }

    // Update Progress Bar
    const percent = (currentStep / 3) * 100;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', currentStep);
  }

  function validateStep(step) {
    let isValid = true;

    if (step === 1) {
      isValid = attendingChoice !== null;
    } 
    else if (step === 2) {
      const nameInput = document.getElementById('rsvp-name');
      const nameError = document.getElementById('rsvp-name-error');
      
      if (!nameInput.value.trim()) {
        nameError.style.display = 'block';
        nameInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        nameError.style.display = 'none';
        nameInput.removeAttribute('aria-invalid');
      }
    }

    return isValid;
  }
}

/**
 * Guess Baby Stats Game & LocalStorage Analytics
 */
const DEFAULT_GUESSES = [
  {
    name: 'Aunt Linda',
    date: '2026-08-08',
    weightLbs: 7,
    weightOz: 4,
    hair: 'Brown',
    eyes: 'Blue'
  },
  {
    name: 'Uncle Bob',
    date: '2026-08-14',
    weightLbs: 8,
    weightOz: 2,
    hair: 'Blonde',
    eyes: 'Green'
  },
  {
    name: 'Grandma Joan',
    date: '2026-08-06',
    weightLbs: 6,
    weightOz: 12,
    hair: 'Brown',
    eyes: 'Blue'
  },
  {
    name: 'Kelly\'s Sister',
    date: '2026-08-11',
    weightLbs: 7,
    weightOz: 10,
    hair: 'Bald',
    eyes: 'Blue'
  },
  {
    name: 'Christian\'s Brother',
    date: '2026-08-18',
    weightLbs: 8,
    weightOz: 6,
    hair: 'Brown',
    eyes: 'Brown'
  }
];

function initStatsGame() {
  const form = document.getElementById('guess-form');
  const guessesList = document.getElementById('recent-guesses-list');

  if (!form || !guessesList) return;

  // Retrieve guesses or seed
  let guesses = JSON.parse(localStorage.getItem('wainright_baby_guesses'));
  if (!guesses) {
    guesses = DEFAULT_GUESSES;
    localStorage.setItem('wainright_baby_guesses', JSON.stringify(guesses));
  }

  // Update Stats & Render List
  updateStatsDashboard(guesses);
  renderGuessesList(guesses);

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('guess-name');
    const nameError = document.getElementById('guess-name-error');

    if (!nameInput.value.trim()) {
      nameError.style.display = 'block';
      nameInput.setAttribute('aria-invalid', 'true');
      return;
    } else {
      nameError.style.display = 'none';
      nameInput.removeAttribute('aria-invalid');
    }

    const newGuess = {
      type: 'guess',
      name: nameInput.value.trim(),
      date: document.getElementById('guess-date').value,
      weightLbs: parseInt(document.getElementById('guess-weight-lbs').value, 10),
      weightOz: parseInt(document.getElementById('guess-weight-oz').value, 10),
      hair: document.getElementById('guess-hair').value,
      eyes: document.getElementById('guess-eyes').value
    };

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Guess... 🎲';

    // Submit to Google Apps Script Web App if URL is configured
    if (typeof GOOGLE_APPS_SCRIPT_URL !== 'undefined' && GOOGLE_APPS_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newGuess)
        });
      } catch (err) {
        console.error('Error sending Guess email:', err);
      }
    }

    // Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;

    // Save locally
    guesses.unshift(newGuess);
    localStorage.setItem('wainright_baby_guesses', JSON.stringify(guesses));

    // Update Dashboard & List
    updateStatsDashboard(guesses);
    renderGuessesList(guesses);

    // Reset Form & Show Success Alert
    form.reset();
    alert('Thank you! Your guess has been recorded and Christian has been notified! 👶✨');
  });
}

function updateStatsDashboard(guesses) {
  if (!guesses.length) return;

  // 1. Average Due Date
  let totalTime = 0;
  guesses.forEach(g => {
    totalTime += new Date(g.date).getTime();
  });
  const avgTime = totalTime / guesses.length;
  const avgDate = new Date(avgTime);
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('stat-avg-date').textContent = avgDate.toLocaleDateString('en-US', dateOptions);

  // 2. Average Weight
  let totalOunces = 0;
  guesses.forEach(g => {
    totalOunces += (g.weightLbs * 16) + g.weightOz;
  });
  const avgOunces = totalOunces / guesses.length;
  const finalLbs = Math.floor(avgOunces / 16);
  const finalOz = Math.round(avgOunces % 16);
  document.getElementById('stat-avg-weight').textContent = `${finalLbs} lbs ${finalOz} oz`;

  // 3. Mode of Hair Color
  const hairCounts = {};
  guesses.forEach(g => {
    hairCounts[g.hair] = (hairCounts[g.hair] || 0) + 1;
  });
  const topHair = Object.keys(hairCounts).reduce((a, b) => hairCounts[a] > hairCounts[b] ? a : b);
  document.getElementById('stat-top-hair').textContent = topHair;

  // 4. Mode of Eye Color
  const eyeCounts = {};
  guesses.forEach(g => {
    eyeCounts[g.eyes] = (eyeCounts[g.eyes] || 0) + 1;
  });
  const topEyes = Object.keys(eyeCounts).reduce((a, b) => eyeCounts[a] > eyeCounts[b] ? a : b);
  document.getElementById('stat-top-eyes').textContent = topEyes;
}

function renderGuessesList(guesses) {
  const list = document.getElementById('recent-guesses-list');
  list.innerHTML = '';

  guesses.forEach(g => {
    const item = document.createElement('li');
    item.className = 'recent-guess-item';
    
    // Formatting guess date
    const gDate = new Date(g.date);
    const dateStr = gDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    item.innerHTML = `
      <div class="recent-guess-header">
        <span>${escapeHTML(g.name)}</span>
        <span style="color: var(--color-accent); font-weight: 700;">${escapeHTML(dateStr)}</span>
      </div>
      <div class="recent-guess-details">
        Weight: ${g.weightLbs} lbs ${g.weightOz} oz &middot; 
        Hair: ${escapeHTML(g.hair)} &middot; 
        Eyes: ${escapeHTML(g.eyes)}
      </div>
    `;
    list.appendChild(item);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
