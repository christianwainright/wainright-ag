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
      const step2Next = document.getElementById('step2-next');
      if (attendingChoice === 'no') {
        attendeeFields.forEach(el => el.style.display = 'none');
        if (step2Next) {
          step2Next.innerHTML = 'Continue &rarr;';
        }
      } else {
        attendeeFields.forEach(el => el.style.display = '');
        if (step2Next) {
          step2Next.innerHTML = 'Submit RSVP ✨';
        }
      }
    });
  });

  // Next Buttons
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep === 2 && attendingChoice === 'yes') {
          form.requestSubmit();
        } else {
          goToStep(currentStep + 1);
        }
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

    if (!validateStep(currentStep)) return;

    // Build data object
    const rsvpData = {
      type: 'rsvp',
      attending: attendingChoice === 'yes' ? 'yes' : 'no',
      name: document.getElementById('rsvp-name').value.trim(),
      email: document.getElementById('rsvp-email').value.trim(),
      guests: attendingChoice === 'yes' ? parseInt(document.getElementById('rsvp-count').value, 10) : 0,
      diet: '',
      song: '',
      advice: attendingChoice === 'no' ? document.getElementById('rsvp-advice').value.trim() : '',
      date: new Date().toISOString()
    };

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending RSVP... ✉️';

    try {
      if (window.__testMode) {
        window.__lastSubmittedData = rsvpData;
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
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
      }
      
      // Show Success Screen
      form.style.display = 'none';
      progressBar.style.display = 'none';
      successScreen.style.display = 'flex';
      
      triggerConfetti();

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

    const step2Next = document.getElementById('step2-next');
    if (step2Next) {
      step2Next.innerHTML = 'Continue &rarr;';
    }
    
    form.style.display = 'block';
    progressBar.style.display = 'block';
    successScreen.style.display = 'none';
    
    goToStep(1);
  });

  function goToStep(step) {
    const prevStep = currentStep;
    currentStep = step;

    const currentActive = wizard.querySelector('.wizard-step.active');
    const targetStep = wizard.querySelector(`.wizard-step[data-step="${currentStep}"]`);

    if (currentActive && targetStep && currentActive !== targetStep) {
      const goingForward = step > prevStep;
      
      // Determine classes
      const exitClass = goingForward ? 'exiting-left' : 'exiting-right';
      const enterClass = goingForward ? 'entering-right' : 'entering-left';
      
      // Apply transitions
      currentActive.classList.add(exitClass);
      currentActive.classList.remove('active');
      
      targetStep.classList.add(enterClass);
      targetStep.classList.add('active');
      
      // Clean up after animation finishes (350ms)
      setTimeout(() => {
        currentActive.classList.remove(exitClass);
        targetStep.classList.remove(enterClass);
      }, 350);
    } else if (targetStep) {
      targetStep.classList.add('active');
    }

    // Update Progress Bar
    const totalSteps = attendingChoice === 'yes' ? 2 : 3;
    const percent = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', currentStep);
    progressBar.setAttribute('aria-valuemax', totalSteps);
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
        if (nameError) nameError.style.display = 'block';
        nameInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        if (nameError) nameError.style.display = 'none';
        nameInput.removeAttribute('aria-invalid');
      }

      // Validate email (optional, validate format only if filled)
      const emailValue = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailValue && !emailRegex.test(emailValue)) {
        if (emailError) emailError.style.display = 'block';
        emailInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        if (emailError) emailError.style.display = 'none';
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
  const guessSuccess = document.getElementById('guess-success');
  const guessResetBtn = document.getElementById('guess-reset-btn');

  if (!form || !guessesList) return;

  // Initialize Custom Selectable Tiles
  const setupCustomTiles = (gridClass, hiddenInputId) => {
    const grid = form.querySelector(`.${gridClass}`);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!grid || !hiddenInput) return;

    const options = grid.querySelectorAll('.tile-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        // Deselect all
        options.forEach(opt => opt.classList.remove('selected'));
        // Select current
        option.classList.add('selected');
        // Update value of hidden input
        hiddenInput.value = option.dataset.value;
      });
    });
  };

  setupCustomTiles('hair-tile-grid', 'guess-hair');
  setupCustomTiles('eye-tile-grid', 'guess-eyes');

  if (guessResetBtn && guessSuccess) {
    guessResetBtn.addEventListener('click', () => {
      form.reset();
      
      // Reset custom tiles selection to defaults
      form.querySelectorAll('.tile-option').forEach(opt => opt.classList.remove('selected'));
      const defaultHair = form.querySelector('.hair-tile-grid .tile-option[data-value="Brown"]');
      const defaultEyes = form.querySelector('.eye-tile-grid .tile-option[data-value="Blue"]');
      if (defaultHair) defaultHair.classList.add('selected');
      if (defaultEyes) defaultEyes.classList.add('selected');
      document.getElementById('guess-hair').value = 'Brown';
      document.getElementById('guess-eyes').value = 'Blue';

      form.style.display = 'block';
      guessSuccess.style.display = 'none';
    });
  }

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
      if (nameError) nameError.style.display = 'block';
      nameInput.setAttribute('aria-invalid', 'true');
      return;
    } else {
      if (nameError) nameError.style.display = 'none';
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
      if (window.__testMode) {
        window.__lastSubmittedGuess = newGuess;
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Save directly to Cloud Firestore
        await addDoc(collection(db, 'guesses'), newGuess);
      }
      
      // Hide form and show success screen
      form.style.display = 'none';
      if (guessSuccess) {
        guessSuccess.style.display = 'flex';
      }
      triggerConfetti();
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

  // Update Mini Calendar Icon
  const monthVal = avgDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayVal = avgDate.getDate();
  const calendarDayVal = document.getElementById('calendar-day-val');
  const calendarIcon = document.getElementById('calendar-icon');
  if (calendarIcon && calendarDayVal) {
    calendarIcon.querySelector('.calendar-month').textContent = monthVal;
    calendarDayVal.textContent = dayVal;
  }

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

  // Update Hair Swatch
  const hairDisplay = document.getElementById('hair-swatch-display');
  if (hairDisplay) {
    const cleanHair = topHair.toLowerCase().split(' ')[0]; // 'blonde', 'brown', 'black', 'red', 'bald'
    hairDisplay.innerHTML = `<span class="color-dot hair-${cleanHair}"></span>`;
  }

  // 4. Mode of Eye Color
  const eyeCounts = {};
  guesses.forEach(g => {
    eyeCounts[g.eyes] = (eyeCounts[g.eyes] || 0) + 1;
  });
  const topEyes = Object.keys(eyeCounts).reduce((a, b) => eyeCounts[a] > eyeCounts[b] ? a : b);
  document.getElementById('stat-top-eyes').textContent = topEyes;

  // Update Eye Swatch
  const eyesDisplay = document.getElementById('eyes-swatch-display');
  if (eyesDisplay) {
    const cleanEyes = topEyes.toLowerCase(); // 'blue', 'brown', 'green', 'hazel'
    eyesDisplay.innerHTML = `<span class="color-dot eye-${cleanEyes}"></span>`;
  }
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

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationFrameId;

  // Set canvas size to screen
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();

  const colors = [
    '#E2C068', // Honey Gold
    '#5C4033', // Brown
    '#4A90E2', // Blue
    '#4B905F', // Green
    '#C04000', // Red-Orange
    '#2E5A44'  // Forest Green
  ];

  const particles = [];
  const particleCount = 120;

  // Confetti Particle class
  class Particle {
    constructor() {
      this.x = canvas.width / 2;
      this.y = canvas.height * 0.7; // Erupt from card height area
      this.size = Math.random() * 8 + 6;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      
      // Velocity vector (fountain shoot up)
      const angle = Math.random() * Math.PI * 0.6 + Math.PI * 1.2; // Angle between 216 and 324 deg
      const speed = Math.random() * 15 + 10;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      
      this.gravity = 0.35;
      this.drag = 0.97;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 6 - 3;
      this.opacity = 1;
      this.fadeOut = Math.random() * 0.01 + 0.005;
      this.shape = Math.random() > 0.4 ? 'rect' : 'circle';
    }

    update() {
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;
      this.opacity -= this.fadeOut;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;

      if (this.shape === 'rect') {
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Populate particles
  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      if (particles.length < particleCount) {
        particles.push(new Particle());
      }
    }, i * 8);
  }

  // Animation Loop
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();

      // Remove dead particles
      if (p.opacity <= 0 || p.y > canvas.height) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrameId);
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}
