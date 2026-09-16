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
})();
