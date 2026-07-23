(() => {
  /* ticker: tap / Enter / Space toggles pause (works regardless of motion prefs) */
  const ts = document.querySelector(".ticker-section");
  if (ts) {
    const toggle = () => ts.classList.toggle("paused");
    ts.addEventListener("click", toggle);
    ts.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    });
  }

  /* video scanline off while playing (works regardless of motion prefs) */
  document.querySelectorAll(".film-frame video").forEach((v) => {
    const frame = v.closest(".film-frame");
    v.addEventListener("play", () => frame.classList.add("playing"));
    v.addEventListener("pause", () => frame.classList.remove("playing"));
  });

  /* ambient hero film: reduced-motion users get manual controls instead of autoplay;
     otherwise play only while in view, click toggles */
  const film = document.querySelector(".film-frame video");
  if (film) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      film.removeAttribute("autoplay");
      film.setAttribute("controls", "");
      film.pause();
    } else {
      film.style.cursor = "pointer";
      film.addEventListener("click", () => {
        if (film.paused) {
          delete film.dataset.userPaused;
          film.play().catch(() => {});
        } else {
          film.dataset.userPaused = "1";
          film.pause();
        }
      });
      if ("IntersectionObserver" in window) {
        let inView = false;
        const sync = () => {
          if (inView && !film.dataset.userPaused) film.play().catch(() => {});
          else if (!inView) film.pause();
        };
        new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            inView = entry.isIntersecting;
            sync();
          });
        }, { threshold: 0.25 }).observe(film);
        /* autoplay can start after the observer's initial callback — re-check when playback actually begins */
        film.addEventListener("playing", sync);
      }
    }
  }

  /* contact email: assembled at runtime so the raw address isn't sitting in page source (works regardless of motion prefs) */
  const emailParts = ["actpra", "ise", "@gm", "ail.co", "m"];
  const contactEmail = emailParts.join("");
  const contactSubject = encodeURIComponent("LP制作の相談");
  const contactLink = document.querySelector("[data-contact-link]");
  if (contactLink) contactLink.href = `mailto:${contactEmail}?subject=${contactSubject}`;
  const contactAddress = document.querySelector("[data-contact-address]");
  if (contactAddress) contactAddress.textContent = contactEmail;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  const root = document.documentElement;
  root.classList.add("js");

  /* boot: typed status line, masked headline, hero marker underline */
  const boot = () => requestAnimationFrame(() => root.classList.add("booted"));
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
  setTimeout(() => root.classList.add("booted"), 2500);

  /* ---- scroll reveals ---- */
  const targets = document.querySelectorAll(
    [
      ".section-title",
      ".film-frame",
      ".film-copy",
      ".story-lead",
      ".story-body",
      ".authority-lead",
      ".authority-grid article",
      ".manga-card",
      ".showcase-card",
      ".design-sample",
      ".possibility-grid article",
      ".deliverables-board article",
      ".process-visual",
      ".process-grid li",
      ".quality-board > div",
      ".quality-note",
      ".director-section > div:not(.director-board)",
      ".director-board div",
      ".price-card",
      ".decision-grid article",
      ".faq-grid article",
      ".contact-copy",
      ".consultation-card",
    ].join(",")
  );

  targets.forEach((el) => {
    el.classList.add("rv");
    const siblings = [...el.parentElement.children].filter((c) =>
      c.classList.contains("rv")
    );
    el.dataset.rvi = Math.min(siblings.indexOf(el), 7);
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        const delay = (Number(el.dataset.rvi) || 0) * 70;
        setTimeout(() => {
          el.classList.add("in");
          if (el.matches(".process-grid li, .contact-copy")) el.classList.add("lit");
          el.addEventListener(
            "transitionend",
            () => el.classList.remove("rv", "in"),
            { once: true }
          );
        }, delay);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((el) => io.observe(el));

  /* ---- process rail + ghost parallax (single rAF) ---- */
  const rail = document.querySelector(".rail i");
  const processSection = document.querySelector(".process-section");
  const ghosts = [...document.querySelectorAll(".ghost")];
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      if (rail && processSection) {
        const r = processSection.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
        rail.style.setProperty("--p", p.toFixed(4));
      }
      if (window.innerWidth >= 920) {
        for (const g of ghosts) {
          const r = g.parentElement.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) continue;
          g.style.transform = `translateY(${((r.top - vh / 2) * -0.06).toFixed(1)}px)`;
        }
      }
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- price count-up ---- */
  const nums = document.querySelectorAll(".amount .num[data-count]");
  if (nums.length) {
    const priceIO = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.unobserve(entry.target);
          const el = entry.target;
          const target = Number(el.dataset.count || 0);
          const dur = 900;
          const t0 = performance.now();
          const step = (t) => {
            const k = Math.min(1, (t - t0) / dur);
            const eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
            el.textContent = Math.round(target * eased).toLocaleString("ja-JP");
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );
    nums.forEach((n) => priceIO.observe(n));
  }

  /* ---- hero crosshair follower (desktop, fine pointer) ---- */
  const hero = document.querySelector(".hero");
  const cross = document.querySelector(".crosshair");
  if (
    hero &&
    cross &&
    window.matchMedia("(pointer: fine) and (min-width: 920px)").matches
  ) {
    const chX = cross.querySelector(".ch-x");
    const chY = cross.querySelector(".ch-y");
    const label = cross.querySelector(".ch-label");
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const paint = () => {
      raf = 0;
      chX.style.transform = `translateX(${cx}px)`;
      chY.style.transform = `translateY(${cy}px)`;
      label.style.transform = `translate(${cx}px, ${cy}px)`;
      label.textContent =
        `${String(Math.round(cx)).padStart(4, "0")} , ` +
        String(Math.round(cy)).padStart(4, "0");
    };
    hero.addEventListener("pointermove", (e) => {
      cx = e.clientX;
      cy = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    hero.addEventListener("pointerenter", () => cross.classList.add("on"));
    hero.addEventListener("pointerleave", () => cross.classList.remove("on"));
  }
})();
