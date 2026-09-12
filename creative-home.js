(() => {
  'use strict';
  const cases = {
    cafe: {title:'カフェ・飲食', subtitle:'温度まで、伝える。'},
    living: {title:'住まい・リフォーム', subtitle:'暮らしを、想像できる。'},
    product: {title:'商品・EC', subtitle:'商品の魅力を、主役に。'},
  };
  const dialog = document.getElementById('media-dialog');
  const video = document.getElementById('demo-video');
  const image = document.getElementById('demo-image');
  const note = document.getElementById('dialog-note');
  let format = 'video', selected = null, opener = null;
  function track(name, details) {
    if (typeof window.gtag === 'function') window.gtag('event', name, details);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const name = link.dataset.analyticsEvent || (href === '#contact' ? 'contact_click' : null);
    if (!name) return;
    track(name, {link_url:link.href, page_location:location.href, sample_id:selected || 'none'});
    // Opening a contact channel does not establish a lead or a completed inquiry.
    if (['line_click','email_click'].includes(name) && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'Contact', {source:name, page_location:location.href});
    }
  });
  function selectConsult(key) {
    if (!cases[key]) return;
    selected = key;
    const summary = document.getElementById('selected-sample');
    summary.textContent = '気になった見本：' + cases[key].title + '「' + cases[key].subtitle + '」';
    summary.hidden = false;
    const subject = '広告動画・画像制作の相談｜' + cases[key].title + 'の見本について';
    document.getElementById('email-contact').href = 'mailto:actpraise@gmail.com?subject=' + encodeURIComponent(subject);
  }
  function openMedia(key, kind, trigger) {
    if (!cases[key]) return;
    selected = key; opener = trigger;
    const actual = kind === 'current' ? format : kind;
    document.getElementById('dialog-category').textContent = actual === 'video' ? 'VIDEO / 15 SECONDS' : 'STATIC IMAGE / 4:5';
    document.getElementById('dialog-title').textContent = cases[key].title + '｜制作デモ';
    video.pause(); video.removeAttribute('src'); video.load();
    image.removeAttribute('src'); video.hidden = actual !== 'video'; image.hidden = actual !== 'image';
    note.textContent = 'AI生成素材を使用した制作デモです。' + (actual === 'video' ? '15秒・音声なし。' : '静止画の見本です。');
    if (actual === 'video') {
      video.src = 'assets/creative-demos/' + key + '-15s.mp4';
      video.poster = 'assets/creative-demos/' + key + '-poster.webp';
      video.setAttribute('aria-label', cases[key].title + 'の15秒広告制作デモ');
    } else {
      image.src = 'assets/creative-demos/' + key + '-poster.png';
      image.alt = cases[key].title + 'の広告静止画。' + cases[key].subtitle + ' AI生成素材を使った制作デモ。';
    }
    document.body.style.overflow = 'hidden'; dialog.showModal();
    document.getElementById('dialog-close').focus();
    if (actual === 'video') video.play().catch(() => { note.textContent = '再生ボタンを押すと動画を確認できます。15秒・音声なし／制作デモ。'; });
    track('creative_sample_open', {sample_id:key, media_type:actual});
  }
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openMedia(button.dataset.open, button.dataset.kind, button)));
  document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    format = button.dataset.format;
    document.querySelectorAll('[data-format]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('.sample-media').forEach(b => b.setAttribute('aria-label', cases[b.dataset.open].title + (format === 'video' ? 'の動画見本を再生' : 'の静止画見本を拡大')));
    document.querySelectorAll('.media-type').forEach(el => {el.textContent = format === 'video' ? '15秒 / 縦型動画' : '4:5 / 静止画';});
    document.querySelectorAll('.play-icon').forEach(el => {el.textContent = format === 'video' ? '▶' : '＋';});
    document.querySelectorAll('.view-label').forEach(el => {el.textContent = format === 'video' ? '動画を再生' : '画像を拡大';});
    document.getElementById('gallery-status').textContent = format === 'video' ? '3種類の縦型動画。15秒・音声なし。タップすると大きく再生できます。' : '3種類の静止画。タップすると大きな画像で文字や仕上がりを確認できます。';
  }));
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {video.pause(); video.removeAttribute('src'); video.load(); document.body.style.overflow = ''; opener?.focus();});
  video.addEventListener('error', () => {if(video.getAttribute('src')) note.textContent = '動画を読み込めませんでした。いったん閉じて、もう一度お試しください。';});
  image.addEventListener('error', () => {if(image.getAttribute('src')) note.textContent = '画像を読み込めませんでした。いったん閉じて、もう一度お試しください。';});
  document.querySelectorAll('[data-consult]').forEach(a => a.addEventListener('click', () => selectConsult(a.dataset.consult)));
  document.getElementById('dialog-consult').addEventListener('click', () => {selectConsult(selected); dialog.close(); setTimeout(() => document.getElementById('contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}), 0);});
})();
