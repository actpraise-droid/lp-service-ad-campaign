(() => {
  'use strict';
  const form = document.getElementById('lp-inquiry-form');
  if (!form) return;
  const config = window.DosenLeadConfig || {};
  const status = document.getElementById('lp-form-status');
  const button = form.querySelector('button[type="submit"]');
  const fieldset = form.querySelector('fieldset');
  const keys = ['company', 'email', 'website', 'purpose', 'timing', 'budget'];
  let startedAt = Date.now();
  let active = null;
  let timer = null;
  let busy = false;
  let completed = false;
  let formStarted = false;
  const frames = new Map();
  const pendingKey = 'dosen_pending_lead_v1';
  const hash = async text => {
    if (!crypto.subtle) return null;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
  };
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    return Array.from(bytes, (byte, i) => ([4,6,8,10].includes(i) ? '-' : '') + byte.toString(16).padStart(2, '0')).join('');
  };
  const show = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', error);
    status.hidden = false;
  };
  const setBusy = value => {
    busy = value; button.disabled = value; fieldset.disabled = value;
    button.textContent = value ? '送信しています…' : 'この内容で相談する';
    form.setAttribute('aria-busy', value ? 'true' : 'false');
  };
  const isEndpoint = url => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url || '');
  const backendOrigin = value => /^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$/.test(value) || /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(value);
  const cleanFrames = () => {
    frames.forEach(({iframe, transport}) => { iframe.remove(); transport.remove(); });
    frames.clear();
  };
  form.addEventListener('input', () => {
    if (!formStarted) {
      formStarted = true;
      if (window.DosenLeadTracking) window.DosenLeadTracking.event('form_start');
    }
  }, { once: true });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed) return;
    if (!form.reportValidity()) return;
    if (!isEndpoint(config.endpoint)) {
      show('フォームの受付を準備しています。下記のメールアドレスへご相談ください。', true);
      return;
    }
    const values = {};
    keys.forEach(key => { values[key] = form.elements[key].value.trim(); });
    if (!values.company || !values.purpose) { show('会社・店舗名とご相談内容をご入力ください。', true); return; }
    setBusy(true);
    let fingerprint;
    try { fingerprint = await hash(JSON.stringify(values)); } catch (_) { fingerprint = null; }
    if (!fingerprint) {
      setBusy(false); show('このブラウザでは安全な送信を開始できません。下記のメールアドレスへご相談ください。', true); return;
    }
    if (!active) {
      try {
        const pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
        if (pending && /^[a-f0-9-]{36}$/i.test(pending.id || '') && pending.fingerprint === fingerprint && Number.isFinite(pending.createdAt) && Date.now() >= pending.createdAt && Date.now() - pending.createdAt < 86400000) active = pending;
      } catch (_) {}
    }
    // Keep the same id for retries after a lost acknowledgement. The server
    // returns the saved receipt instead of creating another lead.
    if (!active || active.fingerprint !== fingerprint) active = { id: uuid(), fingerprint, createdAt: Date.now(), attribution: window.DosenAttribution ? window.DosenAttribution.get() : { firstTouch: null, lastTouch: null }, succeeded: false };
    try { sessionStorage.setItem(pendingKey, JSON.stringify(active)); } catch (_) {}
    const id = active.id;
    const payload = {
      ...values, request_id: id, privacy_consent: 'yes',
      parent_origin: location.origin, started_at: String(startedAt),
      website_confirm: form.elements.website_confirm.value,
      attribution: JSON.stringify(active.attribution)
    };
    // Only internal test contexts may supply a QA token. It is never part of
    // public configuration, URLs, analytics or persisted browser storage.
    if (form.elements.test_token && location.hostname === '127.0.0.1') payload.test_token = form.elements.test_token.value;
    cleanFrames();
    const iframe = document.createElement('iframe');
    iframe.name = 'dosen-receiver-' + uuid(); iframe.hidden = true;
    iframe.title = '問い合わせの送信結果'; iframe.setAttribute('aria-hidden', 'true');
    const transport = document.createElement('form');
    transport.method = 'POST'; transport.action = config.endpoint;
    transport.target = iframe.name; transport.hidden = true;
    Object.entries(payload).forEach(([name, value]) => {
      const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value;
      transport.appendChild(input);
    });
    document.body.append(iframe, transport);
    frames.set(id, { iframe, transport });
    setBusy(true); show('送信しています。このままお待ちください。');
    timer = window.setTimeout(() => {
      setBusy(false);
      show('送信結果を確認できませんでした。入力内容を変えずに再送すると、同じ受付として確認します。お急ぎの場合は下記へメールでご連絡ください。', true);
    }, 45000);
    // iframe load is intentionally not treated as success: an error page or
    // blocked request can also load. Only the matching server ack succeeds.
    transport.submit();
  });
  window.addEventListener('message', event => {
    const result = event.data;
    if (!backendOrigin(event.origin) || !result || result.type !== 'dosen:lead-result' || !active || result.requestId !== active.id || !frames.has(result.requestId) || completed) return;
    // Apps Script nests the receiver in its own sandbox frame. A random request
    // id binds that trusted-origin acknowledgement to this pending submission.
    if (result.ok === true && /^[A-Za-z0-9_-]{8,100}$/.test(result.receiptId || '')) {
      clearTimeout(timer); completed = true; active.succeeded = true;
      const receipt = { receiptId: result.receiptId, receivedAt: Date.now(), isTest: result.isTest === true };
      let saved = false;
      try { sessionStorage.setItem('dosen_lead_receipt_v1', JSON.stringify(receipt)); sessionStorage.removeItem(pendingKey); saved = true; } catch (_) {}
      show('ご相談を受け付けました。ありがとうございます。');
      const next = () => {
        if (saved) location.assign('lp-thanks.html');
        else { form.hidden = true; document.getElementById('lp-inline-success').hidden = false; }
      };
      if (window.DosenLeadTracking) window.DosenLeadTracking.lead(receipt, next);
      else next();
    } else if (result.ok === false) {
      clearTimeout(timer); setBusy(false);
      // Server text is treated as text, never markup.
      show(typeof result.error === 'string' && result.error.length < 200 ? result.error : '送信できませんでした。少し時間をおいて再度お試しください。', true);
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && completed) {
      form.reset(); completed = false; active = null; startedAt = Date.now();
      setBusy(false); status.hidden = true; cleanFrames();
    }
  });
})();
