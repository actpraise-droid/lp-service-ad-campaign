(() => {
  'use strict';

  // Only campaign identifiers are retained. Form answers, arbitrary URL parameters,
  // and the visitor's raw referrer are never copied into this record or GA4 events.
  const STORAGE_KEY = 'dosen_attribution_v1';
  const TTL_MS = 90 * 24 * 60 * 60 * 1000;
  const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const CLICK_KEYS = ['gclid', 'gbraid', 'wbraid'];
  const ALL_KEYS = CAMPAIGN_KEYS.concat(CLICK_KEYS);
  const CAMPAIGN_PATTERN = /^[\p{L}\p{N} _.\/:~()\-]+$/u;
  const CLICK_PATTERN = /^[A-Za-z0-9_.-]+$/;

  const cleanValue = (key, value) => {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    const isClick = CLICK_KEYS.includes(key);
    if (!cleaned || cleaned.length > (isClick ? 512 : 200)) return null;
    return (isClick ? CLICK_PATTERN : CAMPAIGN_PATTERN).test(cleaned) ? cleaned : null;
  };

  const cleanPath = value => {
    if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/')) return '/';
    // This module serves fixed public pages; never persist a query, fragment or email.
    return /^[A-Za-z0-9_./%-]+$/.test(value) ? value : '/';
  };

  const cleanTouch = (candidate, now) => {
    if (!candidate || typeof candidate !== 'object') return null;
    const captured = Date.parse(candidate.capturedAt);
    if (!Number.isFinite(captured) || captured > now || now - captured >= TTL_MS) return null;
    const touch = { capturedAt: new Date(captured).toISOString(), landingPath: cleanPath(candidate.landingPath) };
    ALL_KEYS.forEach(key => {
      const value = cleanValue(key, candidate[key]);
      if (value) touch[key] = value;
    });
    return ALL_KEYS.some(key => touch[key]) ? touch : null;
  };

  const readStorage = (name, now) => {
    try {
      const stored = JSON.parse(window[name].getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.version !== 1) return [];
      return [cleanTouch(stored.firstTouch, now), cleanTouch(stored.lastTouch, now)].filter(Boolean);
    } catch (_) {
      // Some browsers expose storage but throw when it is accessed.
      return [];
    }
  };

  const normalize = touches => {
    touches.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
    return { firstTouch: touches[0] || null, lastTouch: touches[touches.length - 1] || null };
  };

  const now = Date.now();
  let state = normalize(readStorage('localStorage', now).concat(readStorage('sessionStorage', now)));
  const params = new URLSearchParams(window.location.search);
  const arriving = { capturedAt: new Date(now).toISOString(), landingPath: cleanPath(window.location.pathname) };
  ALL_KEYS.forEach(key => {
    // Reject ambiguous duplicate values instead of choosing an attacker-controlled one.
    const values = params.getAll(key);
    const value = values.length === 1 ? cleanValue(key, values[0]) : null;
    if (value) arriving[key] = value;
  });
  if (ALL_KEYS.some(key => arriving[key])) {
    state.firstTouch = state.firstTouch || arriving;
    state.lastTouch = arriving;
  }

  const persist = () => {
    ['localStorage', 'sessionStorage'].forEach(name => {
      try {
        if (state.firstTouch || state.lastTouch) {
          window[name].setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
        } else {
          window[name].removeItem(STORAGE_KEY);
        }
      } catch (_) {
        // The current page still has the in-memory attribution if both stores fail.
      }
    });
  };
  persist();

  window.DosenAttribution = Object.freeze({
    get() {
      const currentTime = Date.now();
      state = normalize([cleanTouch(state.firstTouch, currentTime), cleanTouch(state.lastTouch, currentTime)].filter(Boolean));
      persist();
      // Returning a copy prevents consumers from mutating future submissions.
      return JSON.parse(JSON.stringify(state));
    }
  });

  const observeSections = () => {
    const definitions = [{ id: 'price', event: 'price_view' }, { id: 'cases', event: 'works_view' }];
    const watched = definitions.map(definition => {
      const section = document.getElementById(definition.id);
      return section ? { ...definition, target: section.querySelector('h2') || section, visible: false, sent: false, timer: null } : null;
    }).filter(Boolean);
    if (!watched.length) return;

    const cancel = item => {
      if (item.timer !== null) window.clearTimeout(item.timer);
      item.timer = null;
    };
    const queue = item => {
      if (!item.visible || document.visibilityState === 'hidden' || item.sent) {
        cancel(item);
        return;
      }
      if (item.timer !== null) return;
      // A heading must remain at least half visible for a full second. Watching
      // its heading allows even a long section to qualify on a small screen.
      item.timer = window.setTimeout(() => {
        item.timer = null;
        if (!item.visible || document.visibilityState === 'hidden' || item.sent) return;
        try {
          if (window.DosenLeadTracking && typeof window.DosenLeadTracking.event === 'function') {
            window.DosenLeadTracking.event(item.event, { section_id: item.id });
          } else if (typeof window.gtag === 'function') {
            window.gtag('event', item.event, {
              service: 'lp_production',
              section_id: item.id,
              page_location: window.location.origin + window.location.pathname,
              transport_type: 'beacon'
            });
          } else return;
          item.sent = true;
        } catch (_) { /* Analytics must not interfere with the form. */ }
      }, 1000);
    };

    if (typeof window.IntersectionObserver === 'function') {
      const observer = new window.IntersectionObserver(entries => {
        entries.forEach(entry => {
          const item = watched.find(candidate => candidate.target === entry.target);
          if (!item) return;
          item.visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
          queue(item);
        });
      }, { threshold: [0, 0.5] });
      watched.forEach(item => observer.observe(item.target));
    } else {
      // Compatibility fallback measures visibility; it never treats a page load
      // or anchor click as proof that a section has actually been viewed.
      let scheduled = false;
      const measure = () => {
        scheduled = false;
        const height = window.innerHeight || document.documentElement.clientHeight;
        const width = window.innerWidth || document.documentElement.clientWidth;
        watched.forEach(item => {
          const rect = item.target.getBoundingClientRect();
          const visibleWidth = Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));
          const visibleHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
          item.visible = rect.width > 0 && rect.height > 0 && visibleWidth * visibleHeight / (rect.width * rect.height) >= 0.5;
          queue(item);
        });
      };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(measure);
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      measure();
    }
    document.addEventListener('visibilitychange', () => watched.forEach(queue));
    window.addEventListener('pagehide', () => watched.forEach(cancel));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeSections, { once: true });
  else observeSections();
})();
