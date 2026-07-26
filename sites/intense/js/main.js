(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ==========================================================
     Scroll reveal
     ========================================================== */
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

  /* ==========================================================
     Hero: テキスト時間差フェード & 背景クロスフェード
     ========================================================== */
  var hero = document.querySelector(".hero");
  if (hero) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        hero.classList.add("is-in");
      });
    });

    var slides = hero.querySelectorAll(".hero__bg");
    var slideTimer = null;
    var heroVisible = true;

    function startSlides() {
      if (slideTimer || slides.length < 2 || prefersReducedMotion) return;
      slideTimer = setInterval(function () {
        var cur = hero.querySelector(".hero__bg.is-active");
        var idx = Array.prototype.indexOf.call(slides, cur);
        slides[idx].classList.remove("is-active");
        slides[(idx + 1) % slides.length].classList.add("is-active");
      }, 5000);
    }
    function stopSlides() {
      if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
      }
    }
    startSlides();

    // Heroが画面外のときは湯気アニメ停止＋背景の切り替えも止めて省電力・軽量化
    if ("IntersectionObserver" in window) {
      var heroIo = new IntersectionObserver(
        function (entries) {
          heroVisible = entries[0].isIntersecting;
          hero.classList.toggle("is-out", !heroVisible);
          if (heroVisible) startSlides();
          else stopSlides();
        },
        { threshold: 0 }
      );
      heroIo.observe(hero);
    }
  }

  /* ==========================================================
     スクロール進捗バー & ヘッダー縮小（rAFで間引き）
     ========================================================== */
  var progress = document.getElementById("scrollProgress");
  var header = document.getElementById("siteHeader");
  var scrollTicking = false;

  function onScrollRender() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (progress) {
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progress.style.width = pct + "%";
    }
    if (header) {
      header.classList.toggle("is-compact", scrollTop > 60);
    }
    scrollTicking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(onScrollRender);
        scrollTicking = true;
      }
    },
    { passive: true }
  );
  onScrollRender();

  /* ==========================================================
     Before / After スライダー
     ========================================================== */
  var ba = document.getElementById("baSlider");
  var baRange = document.getElementById("baRange");
  var baBefore = document.getElementById("baBefore");
  var baHandle = document.getElementById("baHandle");
  if (ba && baRange && baBefore && baHandle) {
    var setPos = function (val) {
      var pos = val + "%";
      baBefore.style.setProperty("--pos", pos);
      baHandle.style.setProperty("--pos", pos);
      // clip-path の inset(left) はハンドル位置に一致させる
      baBefore.style.clipPath = "inset(0 0 0 " + pos + ")";
      baHandle.style.left = pos;
    };
    setPos(50);
    baRange.addEventListener("input", function () {
      ba.classList.add("is-touched");
      setPos(parseFloat(baRange.value));
    });
  }

  /* ==========================================================
     FAQアコーディオン
     ========================================================== */
  document.querySelectorAll(".faq__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.parentElement.classList.toggle("is-open");
    });
  });

  /* ==========================================================
     フォーム（送信先未設定のためプレースホルダー動作）
     ========================================================== */
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
