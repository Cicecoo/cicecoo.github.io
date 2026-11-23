(() => {
  'use strict';

  const choices = {
    theme: ['system', 'light', 'dark'],
    font: ['mixed', 'cambria', 'serif', 'sans'],
    size: ['16', '18', '20', '22', '24']
  };
  const settings = { theme: 'system', font: 'mixed', size: '18' };
  const storageKey = 'icebox.reading.v1';
  const isFile = location.protocol === 'file:';

  function apply(values) {
    for (const [key, allowed] of Object.entries(choices)) {
      if (allowed.includes(values?.[key])) settings[key] = values[key];
      document.documentElement.dataset[key] = settings[key];
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // Some browsers disable storage for local files or private tabs.
    }
  }

  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    // Use the system appearance and default typography.
  }
  apply(stored);

  // Different file:// pages can have separate storage. Carry settings on local navigation.
  if (isFile) {
    const here = new URL(location.href);
    if (here.searchParams.has('reading')) {
      const [theme, font, size] = here.searchParams.get('reading').split('.');
      apply({ theme, font, size });
      save();
      here.searchParams.delete('reading');
      try { history.replaceState(null, '', here); } catch { /* Browser restricts local history. */ }
    }
  }

  function updateFileLinks() {
    if (!isFile) return;
    const value = [settings.theme, settings.font, settings.size].join('.');
    for (const link of document.querySelectorAll('a[data-blog-link]')) {
      const url = new URL(link.href);
      url.searchParams.set('reading', value);
      link.href = url.href;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const outline = document.querySelector('.article-outline details');
    if (outline) {
      const wide = matchMedia('(min-width: 62rem)');
      const fitOutline = () => { outline.open = wide.matches; };
      fitOutline();
      wide.addEventListener('change', fitOutline);
      const sections = Array.from(outline.querySelectorAll('a[href^="#"]'), link => ({
        link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1)))
      })).filter(item => item.heading);
      let current;
      let pending = false;
      function markSection() {
        pending = false;
        const threshold = Math.min(120, window.innerHeight * .2);
        let next;
        for (const item of sections) {
          if (item.heading.getBoundingClientRect().top > threshold) break;
          next = item.link;
        }
        if (next !== current) {
          current?.removeAttribute('aria-current');
          next?.setAttribute('aria-current', 'location');
          current = next;
        }
      }
      function scheduleMark() {
        if (!pending) {
          pending = true;
          requestAnimationFrame(markSection);
        }
      }
      window.addEventListener('scroll', scheduleMark, { passive: true });
      window.addEventListener('resize', scheduleMark);
      window.addEventListener('load', scheduleMark);
      document.fonts?.ready.then(scheduleMark);
      markSection();
      outline.addEventListener('click', event => {
        if (!wide.matches && event.target.closest('a')) outline.open = false;
      });
    }
    const panel = document.querySelector('.reading-settings');
    for (const field of panel.querySelectorAll('select[data-setting]')) {
      const key = field.dataset.setting;
      field.value = settings[key];
      field.addEventListener('change', () => {
        apply({ [key]: field.value });
        save();
        updateFileLinks();
      });
    }
    updateFileLinks();
    document.addEventListener('click', event => {
      if (panel.open && !panel.contains(event.target)) panel.open = false;
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        panel.open = false;
        panel.querySelector('summary').focus();
      }
    });
  });
})();
