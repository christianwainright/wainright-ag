import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy2b733okQ7y9Tih5_75dvJ3YbgZ3lv4k",
  authDomain: "wainright-family-site.firebaseapp.com",
  projectId: "wainright-family-site",
  storageBucket: "wainright-family-site.firebasestorage.app",
  messagingSenderId: "556395754798",
  appId: "1:556395754798:web:f89fc483c269926defb6bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
      email: document.getElementById('rsvp-email').value.trim(),
      guests: attendingChoice === 'yes' ? parseInt(document.getElementById('rsvp-count').value, 10) : 0,
      diet: attendingChoice === 'yes' ? document.getElementById('rsvp-diet').value.trim() : '',
      song: attendingChoice === 'yes' ? document.getElementById('rsvp-song').value.trim() : '',
      advice: document.getElementById('rsvp-advice').value.trim(),
      date: new Date().toISOString()
    };

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending RSVP... ✉️';

    try {
      // Save directly to Firebase Firestore
      await addDoc(collection(db, 'rsvps'), {
        name: rsvpData.name,
        email: rsvpData.email,
        attending: rsvpData.attending,
        guests: rsvpData.guests,
        diet: rsvpData.diet,
        song: rsvpData.song,
        advice: rsvpData.advice,
        timestamp: serverTimestamp()
      });
      
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
    } catch (err) {
      console.error('Error submitting RSVP to Firestore:', err);
      alert('Oops! There was an issue sending your RSVP. Please try again or email Kiki directly.');
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
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
      const emailInput = document.getElementById('rsvp-email');
      const emailError = document.getElementById('rsvp-email-error');
      
      // Validate name
      if (!nameInput.value.trim()) {
        nameError.style.display = 'block';
        nameInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        nameError.style.display = 'none';
        nameInput.removeAttribute('aria-invalid');
      }

      // Validate email
      const emailValue = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailValue || !emailRegex.test(emailValue)) {
        emailError.style.display = 'block';
        emailInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        emailError.style.display = 'none';
        emailInput.removeAttribute('aria-invalid');
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

  // Real-time Firestore Listener
  const q = query(collection(db, 'guesses'), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    let guesses = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      guesses.push({
        name: data.name,
        date: data.date,
        weightLbs: data.weightLbs,
        weightOz: data.weightOz,
        hair: data.hair,
        eyes: data.eyes
      });
    });

    // If Firestore has no guesses yet, seed with defaults
    if (guesses.length === 0) {
      guesses = DEFAULT_GUESSES;
    }

    // Update Stats Dashboard & Recent List in real-time
    updateStatsDashboard(guesses);
    renderGuessesList(guesses);
  }, (err) => {
    console.error('Error loading guesses from Firestore:', err);
    // Fallback to local storage or defaults on error
    const local = JSON.parse(localStorage.getItem('wainright_baby_guesses')) || DEFAULT_GUESSES;
    updateStatsDashboard(local);
    renderGuessesList(local);
  });

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
      name: nameInput.value.trim(),
      date: document.getElementById('guess-date').value,
      weightLbs: parseInt(document.getElementById('guess-weight-lbs').value, 10),
      weightOz: parseInt(document.getElementById('guess-weight-oz').value, 10),
      hair: document.getElementById('guess-hair').value,
      eyes: document.getElementById('guess-eyes').value,
      timestamp: serverTimestamp()
    };

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Guess... 🎲';

    try {
      // Save directly to Cloud Firestore
      await addDoc(collection(db, 'guesses'), newGuess);
      
      // Reset Form & Show Success Alert
      form.reset();
      alert('Thank you! Your guess has been recorded and Christian has been notified! 👶✨');
    } catch (err) {
      console.error('Error saving guess to Firestore:', err);
      alert('Oops! There was an issue submitting your guess. Please try again.');
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
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
