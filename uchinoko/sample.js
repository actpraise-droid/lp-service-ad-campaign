/* =========================================================
   見本ページ（sample.html）用スクリプト
   - 挿絵がまだ無いページを「イラスト準備中」の枠に差し替える
   - スマホ固定CTAの表示制御
   ========================================================= */

/* --- 1. 挿絵が読み込めないページのフォールバック ---------- */
document.querySelectorAll(".page-art").forEach((figure) => {
  const img = figure.querySelector("img");
  const fallback = figure.querySelector(".art-fallback");
  if (!img || !fallback) return;

  const showFallback = () => {
    figure.classList.add("is-missing");
    fallback.hidden = false;
  };

  // 読み込み済みで失敗している場合（キャッシュ経由など）も拾う
  if (img.complete && img.naturalWidth === 0) {
    showFallback();
  } else {
    img.addEventListener("error", showFallback);
  }
});

/* --- 2. スマホ固定CTA（下端まで来たら引っ込める） --------- */
const stickyCta = document.querySelector(".sticky-cta");
const lastSection = document.querySelector("main > section:last-of-type");

if (stickyCta && lastSection) {
  let ticking = false;

  const updateStickyCta = () => {
    ticking = false;
    const rect = lastSection.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    stickyCta.classList.toggle("is-hidden", inView);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateStickyCta);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  updateStickyCta();
}
