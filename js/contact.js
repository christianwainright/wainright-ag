import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
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

// State for captcha
let captchaSum = 0;

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
});

/**
 * Initialize contact form event listeners and captcha
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Generate initial math captcha
  generateCaptcha();

  // Clear errors on input
  const inputs = form.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      clearError(input);
    });
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide any previous status alerts
    const successAlert = document.getElementById('form-success');
    const errorAlert = document.getElementById('form-error');
    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';

    // Retrieve fields
    const honeypot = document.getElementById('contact-honeypot').value;
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    const captchaInput = document.getElementById('contact-captcha');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    const captcha = captchaInput.value.trim();

    let isValid = true;

    // 1. Honeypot check (robot protection layer 1)
    if (honeypot) {
      // Robot detected: simulate success but do not write to Firestore
      console.warn("Honeypot filled. Simulating success response.");
      setSubmittingState(true);
      setTimeout(() => {
        setSubmittingState(false);
        form.reset();
        successAlert.style.display = 'block';
        generateCaptcha();
      }, 1000);
      return;
    }

    // 2. Client side validations
    if (!name) {
      showError(nameInput, "Please enter your name.");
      isValid = false;
    }
    if (!email) {
      showError(emailInput, "Please enter your email address.");
      isValid = false;
    } else if (!validateEmail(email)) {
      showError(emailInput, "Please enter a valid email address.");
      isValid = false;
    }
    if (!subject) {
      showError(subjectInput, "Please enter a subject.");
      isValid = false;
    }
    if (!message) {
      showError(messageInput, "Please enter your message.");
      isValid = false;
    }

    // 3. Captcha check (robot protection layer 2)
    const captchaParsed = parseInt(captcha, 10);
    if (!captcha) {
      showError(captchaInput, "Please solve the math puzzle.");
      isValid = false;
    } else if (isNaN(captchaParsed) || captchaParsed !== captchaSum) {
      showError(captchaInput, "Incorrect answer. Please try again.");
      isValid = false;
      // Refresh captcha on failure
      generateCaptcha();
    }

    if (!isValid) return;

    // 4. Submit to Firestore
    try {
      setSubmittingState(true);

      await addDoc(collection(db, "contacts"), {
        name,
        email,
        subject,
        message,
        createdAt: serverTimestamp()
      });

      // Clear form and display success
      form.reset();
      successAlert.style.display = 'block';
      generateCaptcha();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      errorAlert.style.display = 'block';
    } finally {
      setSubmittingState(false);
    }
  });
}

/**
 * Generate a new random math captcha
 */
function generateCaptcha() {
  const num1Span = document.getElementById('captcha-num1');
  const num2Span = document.getElementById('captcha-num2');
  const captchaInput = document.getElementById('contact-captcha');
  
  if (!num1Span || !num2Span) return;

  // Numbers between 1 and 9
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  
  captchaSum = n1 + n2;
  
  num1Span.textContent = n1;
  num2Span.textContent = n2;
  
  if (captchaInput) {
    captchaInput.value = '';
    clearError(captchaInput);
  }
}

/**
 * Utility to validate email pattern
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Utility to display form field error message
 */
function showError(inputElement, message) {
  inputElement.classList.add('invalid');
  const errorSpanId = `${inputElement.id.replace('contact-', '')}-error`;
  const errorSpan = document.getElementById(errorSpanId);
  if (errorSpan) {
    errorSpan.textContent = message;
  }
}

/**
 * Utility to clear form field error message
 */
function clearError(inputElement) {
  inputElement.classList.remove('invalid');
  const errorSpanId = `${inputElement.id.replace('contact-', '')}-error`;
  const errorSpan = document.getElementById(errorSpanId);
  if (errorSpan) {
    errorSpan.textContent = '';
  }
}

/**
 * Manage the submitting visual state (disabling controls/showing spinner)
 */
function setSubmittingState(isSubmitting) {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit-btn');
  const spinner = document.getElementById('contact-spinner');
  
  if (!form || !submitBtn || !spinner) return;

  const btnText = submitBtn.querySelector('span:not(.spinner)');
  
  // Disable/enable inputs and textarea
  const inputs = form.querySelectorAll('input:not(#contact-honeypot), textarea');
  inputs.forEach(input => {
    input.disabled = isSubmitting;
  });

  submitBtn.disabled = isSubmitting;

  if (isSubmitting) {
    spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Sending...';
  } else {
    spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Send Message';
  }
}
