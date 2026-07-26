const mobileCta = document.querySelector(".mobile-cta");
const contactSection = document.querySelector("#contact");

function trackEvent(eventName, details = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      page_location: window.location.href,
      ...details,
    });
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...details });
}

const emailParts = ["actpra", "ise", "@gm", "ail.co", "m"];
const contactEmail = emailParts.join("");
const contactSubject = encodeURIComponent("リフォーム会社向け広告・LP導線診断の相談");
const contactBody = encodeURIComponent(
  [
    "リフォーム会社向け広告・LP導線診断について相談します。",
    "",
    "会社名:",
    "お名前:",
    "確認希望URL:",
    "増やしたい工事:",
    "重点地域:",
    "現在困っていること:",
    "",
    "秘密情報、顧客情報、アカウント情報は含めていません。",
  ].join("\n"),
);

document.querySelectorAll("[data-contact-link]").forEach((link) => {
  link.href = `mailto:${contactEmail}?subject=${contactSubject}&body=${contactBody}`;
});

document.querySelectorAll("[data-track]").forEach((element) => {
  element.addEventListener("click", () => {
    trackEvent("cta_click", {
      cta_location: element.dataset.track,
      link_url: element.href || "",
      link_text: element.textContent.trim().slice(0, 100),
    });
  });
});

document.querySelectorAll(".faq-list details").forEach((details, index) => {
  details.addEventListener("toggle", () => {
    if (details.open) {
      trackEvent("faq_open", { question_index: index + 1 });
    }
  });
});

if (mobileCta && contactSection && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      mobileCta.classList.toggle("is-hidden", entry.isIntersecting);
    },
    { threshold: 0.08 },
  );
  observer.observe(contactSection);
}
