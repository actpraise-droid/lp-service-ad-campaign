(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var body = document.body;

  /* ==========================================================
     Header / global nav
     ========================================================== */
  var header = document.querySelector(".header");
  var gnav = document.querySelector(".gnav");
  var hamburger = document.querySelector(".hamburger");

  function setScrolled() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  if (hamburger && header && gnav) {
    hamburger.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      gnav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });

    gnav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("is-open");
        gnav.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ==========================================================
     Hero title split（1文字ずつマスクから立ち上げる）
     ========================================================== */
  var heroTitle = document.querySelector(".hero__title");
  if (heroTitle && !prefersReducedMotion) {
    var charIndex = 0;
    var lines = heroTitle.innerHTML.split(/<br\s*\/?>/i);
    heroTitle.innerHTML = lines
      .map(function (line) {
        var text = line.replace(/<[^>]+>/g, "").trim();
        var chars = Array.from(text)
          .map(function (ch) {
            var delay = charIndex * 40;
            charIndex++;
            return (
              '<span class="char" style="transition-delay:' +
              delay +
              'ms">' +
              ch +
              "</span>"
            );
          })
          .join("");
        return '<span class="line">' + chars + "</span>";
      })
      .join("");
  }

  /* ==========================================================
     Intro（初回のみの暗幕オープニング）
     ========================================================== */
  var intro = document.querySelector(".intro");
  var INTRO_KEY = "su-line-intro-shown";
  var introShown = false;
  try {
    introShown = !!sessionStorage.getItem(INTRO_KEY);
  } catch (e) {
    introShown = true;
  }

  if (!intro || prefersReducedMotion || introShown) {
    if (intro) intro.style.display = "none";
    body.classList.add("intro-done");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        body.classList.add("is-loaded");
      });
    });
  } else {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch (e) {}
    setTimeout(function () {
      body.classList.add("is-loaded");
      setTimeout(function () {
        body.classList.add("intro-done");
      }, 1000);
    }, 1150);
  }

  /* ==========================================================
     Scroll reveal（.reveal と .img-reveal 両対応）
     ========================================================== */
  var revealEls = document.querySelectorAll(".reveal, .img-reveal");
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
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
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
     Active nav link
     ========================================================== */
  var path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav-link]").forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("/").pop();
    if (href === path) {
      a.classList.add("is-current");
    }
  });

  /* ==========================================================
     Hero背景スライドショー（クロスフェード切り替え）
     ========================================================== */
  var bgSlides = document.querySelectorAll(".hero__bg-slide");
  if (bgSlides.length) {
    bgSlides[0].classList.add("is-active");
    if (bgSlides.length > 1 && !prefersReducedMotion) {
      var currentSlide = 0;
      setInterval(function () {
        bgSlides[currentSlide].classList.remove("is-active");
        currentSlide = (currentSlide + 1) % bgSlides.length;
        bgSlides[currentSlide].classList.add("is-active");
      }, 4000);
    }
  }

  /* ==========================================================
     Scroll engine（波パララックス / Hero退場 / 画像パララックス）
     すべてtransform/opacityのみ・rAFで間引き
     ========================================================== */
  var heroEl = document.querySelector(".hero");
  var heroBody = document.querySelector(".hero__body");
  var waveLayers = document.querySelectorAll("[data-parallax]");
  var plxEls = document.querySelectorAll("[data-plx]");

  if (
    !prefersReducedMotion &&
    (waveLayers.length || plxEls.length || heroBody)
  ) {
    var ticking = false;

    var render = function () {
      var vh = window.innerHeight;

      if (heroEl) {
        var hr = heroEl.getBoundingClientRect();
        if (hr.bottom > 0) {
          var scrolled = Math.max(0, -hr.top);
          waveLayers.forEach(function (el) {
            var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
            el.style.transform =
              "translate3d(0," + scrolled * speed + "px,0)";
          });
          if (heroBody) {
            var progress = Math.min(1, scrolled / (vh * 0.8));
            heroBody.style.opacity = String(1 - progress);
            heroBody.style.transform =
              "translate3d(0," + scrolled * 0.22 + "px,0)";
          }
        }
      }

      plxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var speed = parseFloat(el.getAttribute("data-plx")) || 0.1;
        var offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      });

      ticking = false;
    };

    var requestRender = function () {
      if (!ticking) {
        window.requestAnimationFrame(render);
        ticking = true;
      }
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    render();
  }

  /* ==========================================================
     カーソル追従（マウス操作可能なPC環境のみ）
     ========================================================== */
  if (
    !prefersReducedMotion &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);

    var dotRaf = null;
    window.addEventListener(
      "mousemove",
      function (e) {
        dot.classList.add("is-active");
        if (dotRaf) window.cancelAnimationFrame(dotRaf);
        dotRaf = window.requestAnimationFrame(function () {
          dot.style.transform =
            "translate3d(" +
            e.clientX +
            "px," +
            e.clientY +
            "px,0) translate(-50%,-50%)";
        });
      },
      { passive: true }
    );

    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        dot.classList.add("is-hover");
      });
      el.addEventListener("mouseleave", function () {
        dot.classList.remove("is-hover");
      });
    });
  }
})();
