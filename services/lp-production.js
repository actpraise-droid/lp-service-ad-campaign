(() => {
  'use strict';
  // Clicks are micro-conversions only; neither mailto clicks nor section visits are leads.
  // Never send the mail body, chosen fields or URL query parameters to analytics.
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const name = href.startsWith('mailto:') ? 'email_click' : href === '#contact' ? 'contact_click' : href.includes('works.html') ? 'works_click' : null;
    if (!name || !window.DosenLeadTracking) return;
    window.DosenLeadTracking.event(name, {
      placement: link.dataset.position || (href.startsWith('mailto:') ? 'contact' : 'content')
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
