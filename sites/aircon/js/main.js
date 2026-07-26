(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* Scroll reveal */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Hero背景動画（PC広画面・通常データ環境のみ読み込み。スマホ等は静止画のまま） */
  var hero = document.querySelector(".hero");
  var heroVideo = hero ? hero.querySelector(".hero__video") : null;
  if (
    heroVideo &&
    !prefersReducedMotion &&
    window.matchMedia("(min-width: 768px)").matches &&
    !(navigator.connection && navigator.connection.saveData)
  ) {
    heroVideo.src = heroVideo.getAttribute("data-src");
    heroVideo.addEventListener("playing", function () {
      hero.classList.add("has-video");
    });
    // 読み込み完了時に未再生ならリトライ（初回play()が失敗した場合の保険）
    heroVideo.addEventListener("canplay", function () {
      if (heroVideo.paused) heroVideo.play().catch(function () {});
    });
    heroVideo.play().catch(function () {});

    // Heroが画面外に出たら動画を止めて省電力
    if ("IntersectionObserver" in window) {
      var heroIo = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) heroVideo.play().catch(function () {});
          else heroVideo.pause();
        },
        { threshold: 0 }
      );
      heroIo.observe(hero);
    }
  }

  /* スクロール進捗バー & ヘッダー縮小（rAFで間引き） */
  var progress = document.getElementById("scrollProgress");
  var header = document.getElementById("siteHeader");
  var ticking = false;
  function onScroll() {
    var top = window.scrollY || document.documentElement.scrollTop;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (docH > 0 ? (top / docH) * 100 : 0) + "%";
    if (header) header.classList.toggle("is-compact", top > 60);
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  /* Before / After スライダー */
  var ba = document.getElementById("baSlider");
  var baRange = document.getElementById("baRange");
  var baBefore = document.getElementById("baBefore");
  var baHandle = document.getElementById("baHandle");
  if (ba && baRange && baBefore && baHandle) {
    var setPos = function (val) {
      var pos = val + "%";
      baBefore.style.clipPath = "inset(0 0 0 " + pos + ")";
      baHandle.style.left = pos;
    };
    setPos(50);
    baRange.addEventListener("input", function () {
      ba.classList.add("is-touched");
      setPos(parseFloat(baRange.value));
    });
  }

  /* FAQアコーディオン */
  document.querySelectorAll(".faq__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.parentElement.classList.toggle("is-open");
    });
  });

  /* フォーム（送信先未設定のためプレースホルダー動作） */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert(
        "現在、フォームの送信機能は準備中です。恐れ入りますが、お電話（045-873-3973）よりお問い合わせください。"
      );
    });
  }
})();
