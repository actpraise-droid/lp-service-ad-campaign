/* =========================================================
   うちの子ものがたり ｜ 先行販売LP
   ---------------------------------------------------------
   公開前にここだけ差し替えてください。
   空文字のままの場合、該当ボタンはページ内の申込セクションへ
   スクロールするだけの動作になります（リンク切れにはなりません）。
   ========================================================= */

/** 注文フォームのURL（Googleフォームなど） 例: "https://forms.gle/xxxxxxxx" */
const ORDER_FORM_URL = "";

/** DM導線のURL（Instagram / X のプロフィールやDMリンク） 例: "https://instagram.com/xxxxxxxx" */
const DM_URL = "";

/** 「文例をコピー」ボタンでコピーされる本文 */
const DM_SAMPLE_TEXT = [
  "はじめまして。「うちの子ものがたり」の先行3名の枠について相談したいです。",
  "犬（柴犬・5歳・女の子）／お迎え記念日 ◯月◯日 ／お写真は4枚あります。よろしくお願いします。",
].join("\n");

/* --- 1. CTAのリンク先を設定 ------------------------------ */
const ctaTargets = {
  form: ORDER_FORM_URL,
  dm: DM_URL,
};

document.querySelectorAll("[data-cta]").forEach((link) => {
  const url = ctaTargets[link.dataset.cta];
  if (!url) return;
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

/* --- 2. DM文例のコピー ----------------------------------- */
document.querySelectorAll("[data-copy='dm']").forEach((button) => {
  const defaultLabel = button.textContent;

  const restore = () => {
    window.setTimeout(() => {
      button.textContent = defaultLabel;
    }, 2000);
  };

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(DM_SAMPLE_TEXT);
      button.textContent = "コピーしました";
    } catch {
      button.textContent = "コピーできませんでした";
    }
    restore();
  });
});

/* --- 3. 申込セクション表示中はスマホ固定CTAを隠す --------- */
const stickyCta = document.querySelector(".sticky-cta");
const orderSection = document.querySelector("#order");

if (stickyCta && orderSection) {
  let ticking = false;

  const updateStickyCta = () => {
    ticking = false;
    const rect = orderSection.getBoundingClientRect();
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
