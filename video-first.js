(() => {
  'use strict';
  const cases = {
    cafe: {title:'カフェ・飲食', subtitle:'温度まで、伝える。'},
    living: {title:'住まい・リフォーム', subtitle:'暮らしを、想像できる。'},
    product: {title:'商品・EC', subtitle:'商品の魅力を、主役に。'},
    source: {title:'編集前の元動画', subtitle:'実写素材2本・合計25秒', stock:true, duration:25, video:'source-25s.mp4',poster:'source-poster.webp'},
    'edit-a': {title:'パターンA・雰囲気から', subtitle:'香りで、ひと息。', stock:true, description:'注ぐシーンから始め、ひと息つく時間をイメージできる構成に。'},
    'edit-b': {title:'パターンB・つくる場面から', subtitle:'その一杯に、目がとまる。', stock:true, description:'コーヒーを淹れる手元から始め、一杯ができる流れを伝える構成に。'},
    'edit-c': {title:'パターンC・使う場面から', subtitle:'次の休憩は、コーヒーに。', stock:true, description:'休憩する場面を言葉にして、自分の生活に重ねられる構成に。'},
  };
  const services={video:'動画・画像制作',lp:'LP制作',both:'動画＋LP制作'};
  const dialog=document.getElementById('media-dialog');
  const video=document.getElementById('demo-video');
  const image=document.getElementById('demo-image');
  const note=document.getElementById('dialog-note');
  let galleryFormat='video',compareFormat='video',variant='a',selected=null,activeMedia=null,opener=null,service='video';
  function track(name,details){if(typeof window.gtag==='function')window.gtag('event',name,details);}
  function updateContact(){
    const subject=services[service]+'の相談'+(selected&&service!=='lp'?'｜'+cases[selected].title+'の見本について':'');
    document.getElementById('email-contact').href='mailto:actpraise@gmail.com?subject='+encodeURIComponent(subject);
    document.getElementById('contact-selection').textContent='ご相談内容：'+services[service];
    document.querySelectorAll('[data-service-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.serviceChoice===service)));
    const summary=document.getElementById('selected-sample');
    summary.hidden=!selected||service==='lp';
    summary.textContent=selected?'気になった見本：'+cases[selected].title+'「'+cases[selected].subtitle+'」':'';
  }
  function chooseService(value){if(!services[value])return;service=value;if(service==='lp')selected=null;updateContact();}
  function selectConsult(key){if(!cases[key])return;selected=key;service='video';updateContact();}
  function openMedia(key,kind,trigger){
    const c=cases[key];if(!c)return;
    activeMedia=key;opener=trigger;
    const actual=kind==='current'?galleryFormat:kind;
    const duration=c.duration||15;
    const folder=c.stock?'assets/video-edit-demo/':'assets/creative-demos/';
    document.getElementById('dialog-category').textContent=actual==='video'?'VIDEO / '+duration+' SECONDS':'STATIC IMAGE / 4:5';
    document.getElementById('dialog-title').textContent=c.title+'｜制作デモ';
    video.pause();video.removeAttribute('src');video.load();image.removeAttribute('src');
    video.hidden=actual!=='video';image.hidden=actual!=='image';
    note.textContent=(c.stock?'実写ストック素材を使った制作デモです。':'AI生成素材を使用した制作デモです。')+(actual==='video'?duration+'秒・音声なし。':'静止画の見本です。');
    if(actual==='video'){
      video.src=folder+(c.video||key+'-15s.mp4');video.poster=folder+(c.poster||key+'-poster.webp');
      video.setAttribute('aria-label',c.title+'の'+duration+'秒動画');
    }else{
      image.src=folder+key+(c.stock?'-static.png':'-poster.png');
      image.alt=c.title+'の静止画制作デモ。'+c.subtitle;
    }
    document.body.style.overflow='hidden';dialog.showModal();document.getElementById('dialog-close').focus();
    if(actual==='video')video.play().catch(()=>{note.textContent+=' 再生ボタンを押してご確認ください。';});
    track('creative_sample_open',{sample_id:key,media_type:actual});
  }
  function updateComparison(){
    const key='edit-'+variant,c=cases[key];
    const poster=document.getElementById('result-poster');
    const button=document.getElementById('result-open');
    poster.src='assets/video-edit-demo/'+key+(compareFormat==='image'?'-static.webp':'-poster.webp');
    poster.alt=c.title+'：'+c.subtitle;poster.width=540;poster.height=compareFormat==='image'?675:960;
    button.dataset.open=key;button.dataset.kind=compareFormat;
    button.classList.toggle('is-image',compareFormat==='image');
    button.setAttribute('aria-label',c.title+(compareFormat==='image'?'の静止画を拡大':'の15秒広告を再生'));
    document.getElementById('result-play').textContent=compareFormat==='image'?'＋':'▶';
    document.getElementById('result-kicker').textContent='PATTERN '+variant.toUpperCase()+' / '+c.title.split('・')[1];
    document.getElementById('result-title').textContent=c.subtitle;
    document.getElementById('result-description').textContent=c.description;
    document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));
    document.querySelectorAll('[data-compare-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.compareFormat===compareFormat)));
  }
  document.getElementById('result-title').setAttribute('aria-live','polite');
  document.addEventListener('click',event=>{
    const control=event.target.closest('button,a');if(!control)return;
    if(control.dataset.open)openMedia(control.dataset.open,control.dataset.kind,control);
    if(control.dataset.service)chooseService(control.dataset.service);
    if(control.dataset.serviceChoice)chooseService(control.dataset.serviceChoice);
    if(control.dataset.consult)selectConsult(control.dataset.consult);
    if(control.dataset.variant){variant=control.dataset.variant;updateComparison();}
    if(control.dataset.compareFormat){compareFormat=control.dataset.compareFormat;updateComparison();}
    if(control.dataset.format){
      galleryFormat=control.dataset.format;
      document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b===control)));
      document.querySelectorAll('.sample-media').forEach(b=>b.setAttribute('aria-label',cases[b.dataset.open].title+(galleryFormat==='video'?'の動画見本を再生':'の静止画見本を拡大')));
      document.querySelectorAll('.sample-card .media-type').forEach(el=>el.textContent=galleryFormat==='video'?'15秒 / 縦型動画':'4:5 / 静止画');
      document.querySelectorAll('.sample-card .play-icon').forEach(el=>el.textContent=galleryFormat==='video'?'▶':'＋');
      document.querySelectorAll('.sample-card .view-label').forEach(el=>el.textContent=galleryFormat==='video'?'動画を再生':'画像を拡大');
      document.getElementById('gallery-status').textContent=galleryFormat==='video'?'3種類の縦型動画。15秒・音声なし。タップすると大きく再生できます。':'3種類の静止画。タップすると大きな画像で文字や仕上がりを確認できます。';
    }
    if(control.tagName==='A'){
      const href=control.getAttribute('href')||'';
      const name=control.dataset.analyticsEvent||(href==='#contact'?'contact_click':null);
      if(name){
        track(name,{link_url:control.href,page_location:location.href,sample_id:selected||'none',service_type:service});
        // A channel click is not a completed inquiry.
        if(['line_click','email_click'].includes(name)&&typeof window.fbq==='function')window.fbq('trackCustom','Contact',{source:name,page_location:location.href});
      }
    }
  });
  document.getElementById('dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();
  });
  dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();document.body.style.overflow='';opener?.focus();});
  video.addEventListener('error',()=>{if(video.getAttribute('src'))note.textContent='動画を読み込めませんでした。閉じて、もう一度お試しください。';});
  image.addEventListener('error',()=>{if(image.getAttribute('src'))note.textContent='画像を読み込めませんでした。閉じて、もう一度お試しください。';});
  document.getElementById('dialog-consult').addEventListener('click',()=>{selectConsult(activeMedia);dialog.close();setTimeout(()=>document.getElementById('contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}),0);});
  updateContact();
})();
