(() => {
  'use strict';
  const config = window.DosenLeadConfig || {};
  const enabled = location.origin === config.productionOrigin;
  const allowed = new Set(['generate_lead', 'email_click', 'price_view', 'works_view', 'works_click', 'contact_click', 'form_start']);
  const seen = new Set();
  const safeParams = params => {
    const output = { service: 'lp_production', page_location: location.origin + location.pathname };
    for (const key of ['placement', 'section_id']) {
      if (params && /^[a-z0-9_]{1,32}$/.test(params[key] || '')) output[key] = params[key];
    }
    return output;
  };
  if (enabled && typeof window.gtag === 'function' && config.googleAdsId) {
    window.gtag('config', config.googleAdsId, { send_page_view: false, allow_enhanced_conversions: false });
  }
  window.DosenLeadTracking = Object.freeze({
    event(name, params = {}) {
      if (!enabled || !allowed.has(name) || name === 'generate_lead' || typeof window.gtag !== 'function') return;
      window.gtag('event', name, { ...safeParams(params), send_to: 'G-6W72X3ZKMM', transport_type: 'beacon' });
      const label = config.conversions && config.conversions[name];
      if (label && !seen.has(name)) {
        seen.add(name);
        window.gtag('event', 'conversion', { send_to: label, ...safeParams(params), transport_type: 'beacon' });
      }
    },
    lead(receipt, done) {
      let finished = false;
      const finish = () => { if (!finished) { finished = true; done(); } };
      if (!receipt || !/^[A-Za-z0-9_-]{8,100}$/.test(receipt.receiptId || '') || receipt.isTest || !enabled || typeof window.gtag !== 'function') { finish(); return; }
      const key = 'dosen_conversion_' + receipt.receiptId;
      let recorded = seen.has(key);
      try { recorded = recorded || sessionStorage.getItem(key) === '1'; } catch (_) {}
      if (recorded) { finish(); return; }
      seen.add(key);
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
      window.setTimeout(finish, 1200);
      try {
        window.gtag('event', 'generate_lead', { ...safeParams(), send_to: 'G-6W72X3ZKMM', transaction_id: receipt.receiptId, transport_type: 'beacon' });
        const label = config.conversions && config.conversions.generate_lead;
        if (label) window.gtag('event', 'conversion', { send_to: label, transaction_id: receipt.receiptId, ...safeParams(), event_callback: finish, event_timeout: 1000, transport_type: 'beacon' });
        else finish();
      } catch (_) { finish(); }
    }
  });

  // The optional "現在のサイト・SNS" field accepts "example.jp" or "@account".
  // The value is rewritten to a URL before lp-form.js reads it, so the receiver
  // keeps getting a URL (or an empty value) as before. This runs on every origin
  // and sends nothing to analytics.
  const WEBSITE_HINT = 'URL（例：example.jp）か @アカウント名 でご入力ください。無い場合は空欄のまま送信できます。';
  // Returns '' for a blank value, a URL string, or null when no URL can be formed.
  const normalizeWebsite = raw => {
    if (typeof raw !== 'string') return '';
    // Full-width letters, digits, symbols and spaces become their ASCII forms.
    const value = raw.replace(/[！-～]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').trim();
    if (!value) return '';
    if (/\s/.test(value)) return null;
    let candidate;
    let needsDomain = true;
    if (/^https?:\/\//i.test(value)) {
      // Already a URL: sent exactly as typed, as the former type="url" field did.
      candidate = value;
      needsDomain = false;
    } else if (value.startsWith('@')) {
      const account = value.slice(1);
      if (!/^[A-Za-z0-9._]{1,30}$/.test(account)) return null;
      candidate = 'https://www.instagram.com/' + account;
    } else {
      // An e-mail address or another scheme (mailto:, javascript: ...) is not a site.
      if (value.includes('@') || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;
      candidate = 'https://' + value.replace(/^\/+/, '');
    }
    if (candidate.length > 500) return null;
    try {
      const url = new URL(candidate);
      // A value typed without a scheme must at least look like a domain name.
      if (needsDomain && (url.username || url.password || !/^[^.]+(?:\.[^.]+)+$/.test(url.hostname))) return null;
    } catch (_) { return null; }
    return candidate;
  };
  const applyWebsite = field => {
    if (!field || typeof field.value !== 'string') return;
    const next = normalizeWebsite(field.value);
    const setMessage = message => { if (typeof field.setCustomValidity === 'function') field.setCustomValidity(message); };
    if (next === null) { setMessage(WEBSITE_HINT); return; }
    setMessage('');
    if (next !== field.value) field.value = next;
  };
  const isWebsiteField = target => Boolean(target) && target.id === 'lp-website';
  // Capture-phase listeners on the document always run before the form's own
  // submit handler in lp-form.js, whatever the script order.
  document.addEventListener('input', event => {
    if (isWebsiteField(event.target) && typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
  }, true);
  document.addEventListener('change', event => {
    if (isWebsiteField(event.target)) { try { applyWebsite(event.target); } catch (_) { /* Never block the form. */ } }
  }, true);
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form || form.id !== 'lp-inquiry-form' || !form.elements) return;
    try { applyWebsite(form.elements.website); } catch (_) { /* Never block the form. */ }
  }, true);
})();
