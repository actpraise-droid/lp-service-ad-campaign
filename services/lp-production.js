(() => {
  'use strict';
  const email = document.getElementById('lp-email');
  const fields = ['lp-area', 'lp-purpose', 'lp-timing'].map(id => document.getElementById(id));
  const update = () => {
    const [area, purpose, timing] = fields.map(field => field.value || '未定');
    const body = `会社・店舗名：\n所在地：${area}\n作りたいページ・用途：${purpose}\n現在のサイト・SNS：\n希望時期：${timing}\n予算の目安：\n\n相談内容：`;
    email.href = 'mailto:actpraise@gmail.com?subject=' + encodeURIComponent('LP制作の相談｜湘南LP') + '&body=' + encodeURIComponent(body);
  };
  fields.forEach(field => field.addEventListener('change', update));
  update();
  // Clicks are micro-conversions only; neither mailto clicks nor section visits are leads.
  // Never send the mail body, chosen fields or URL query parameters to analytics.
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const name = href.startsWith('mailto:') ? 'email_click' : href === '#contact' ? 'contact_click' : href.includes('works.html') ? 'works_view' : null;
    if (!name || typeof window.gtag !== 'function') return;
    window.gtag('event', name, {
      page_location: location.origin + location.pathname,
      service: 'lp_production',
      placement: link.dataset.position || (href.startsWith('mailto:') ? 'contact' : 'content'),
      transport_type: 'beacon'
    });
  });
  const sticky = document.querySelector('.lp-mobile-cta');
  if ('IntersectionObserver' in window) {
    const visibility = { hero: true, contact: false };
    const updateSticky = () => { sticky.hidden = visibility.hero || visibility.contact; };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'contact') visibility.contact = entry.isIntersecting;
        else visibility.hero = entry.isIntersecting;
      });
      updateSticky();
    }, {threshold: 0});
    observer.observe(document.querySelector('.lp-actions .lp-button'));
    observer.observe(document.getElementById('contact'));
    updateSticky();
  }
})();
