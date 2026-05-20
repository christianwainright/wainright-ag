document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
});

/**
 * Theme management using CSS color-scheme and light-dark()
 */
function initTheme() {
  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
  
  // Set theme from localStorage or default to system
  const savedTheme = localStorage.getItem('theme') || 'system';
  applyTheme(savedTheme);

  toggleButtons.forEach(btn => {
    // Render initial state
    updateToggleIcon(btn, localStorage.getItem('theme') || 'system');

    btn.addEventListener('click', () => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      let nextTheme = 'light';
      
      if (currentTheme === 'light') {
        nextTheme = 'dark';
      } else if (currentTheme === 'dark') {
        nextTheme = 'system';
      } else {
        nextTheme = 'light';
      }

      localStorage.setItem('theme', nextTheme);
      applyTheme(nextTheme);
      
      // Update all toggle buttons on the page (in case there are duplicates)
      document.querySelectorAll('.theme-toggle-btn').forEach(b => {
        updateToggleIcon(b, nextTheme);
      });
    });
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.colorScheme = 'dark';
  } else if (theme === 'light') {
    root.style.colorScheme = 'light';
  } else {
    // Reset to system default 'light dark' which relies on prefers-color-scheme media query
    root.style.colorScheme = 'light dark';
  }
}

function updateToggleIcon(btn, theme) {
  // We'll swap the SVG contents or class for the button based on the theme
  const sunPath = `<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.02 0-1.41z"/>`;
  const moonPath = `<path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10C2.2 6.8 6.5 2.5 11.7 2.1c.6-.1 1.2.4 1.1 1-.1.4-.4.8-.8 1-2.9 1.5-4.7 4.5-4.7 7.9 0 4.8 4 8.8 8.8 8.8 3.4 0 6.4-1.8 7.9-4.7.3-.4.7-.7 1.1-.8.6-.1 1.1.4 1 1-.4 5.2-4.7 9.5-9.9 9.7z"/>`;
  const autoPath = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86z"/>`;

  let selectedPath = autoPath;
  let label = "System Theme";

  if (theme === 'light') {
    selectedPath = sunPath;
    label = "Light Theme";
  } else if (theme === 'dark') {
    selectedPath = moonPath;
    label = "Dark Theme";
  }

  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${selectedPath}</svg>`;
  btn.setAttribute('aria-label', `Switch theme, current: ${label}`);
}

/**
 * Mobile navigation menu toggling
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const menu = document.querySelector('.nav-menu');
  
  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    menu.classList.toggle('open');
    
    // Toggle menu icon between burger and close X
    if (!isExpanded) {
      toggleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
      toggleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    }
  });

  // Close menu if a link is clicked
  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });
  });
}
