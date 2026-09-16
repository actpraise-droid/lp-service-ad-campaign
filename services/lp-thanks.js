(() => {
  'use strict';
  // No conversion event on this page: reloads and direct visits must not create leads.
  try {
    const receipt = JSON.parse(sessionStorage.getItem('dosen_lead_receipt_v1') || 'null');
    if (!receipt || !/^[A-Za-z0-9_-]{8,100}$/.test(receipt.receiptId || '') || typeof receipt.receivedAt !== 'number' || Date.now() < receipt.receivedAt || Date.now() - receipt.receivedAt > 86400000) return;
    document.getElementById('thanks-title').textContent = 'ご相談ありがとうございます。';
    document.getElementById('receipt-id').textContent = receipt.receiptId;
    document.getElementById('thanks-confirmed').hidden = false;
    document.getElementById('thanks-unconfirmed').hidden = true;
  } catch (_) { /* A blocked storage API does not imply a completed inquiry. */ }
})();
