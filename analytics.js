(() => {
  const send = (name, link) => {
    if (typeof window.gtag !== "function") return;
    const parameters = {
      link_url: link?.href || "",
      link_text: (link?.textContent || "").trim().slice(0, 100),
      page_location: window.location.href,
      transport_type: "beacon",
    };
    window.gtag("event", name, parameters);

    // GA4で既にキーイベントに設定済みの推奨イベントにも接続する。
    if (name === "contact_form_open" || name === "email_click" || name === "line_click") {
      window.gtag("event", "qualify_lead", {
        ...parameters,
        lead_source: name,
      });
    }

    if (name === "reform_diagnosis_form_open") {
      window.gtag("event", "form_start", {
        ...parameters,
        form_id: "reform_web_diagnosis",
        form_name: "リフォーム会社向け広告・LP導線診断",
      });
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    const explicit = link.dataset.analyticsEvent;
    if (explicit) {
      send(explicit, link);
      return;
    }

    const href = link.getAttribute("href") || "";
    if (link.classList.contains("mobile-consult-fixed") || href.endsWith("#contact")) {
      send("contact_click", link);
    } else if (href.startsWith("mailto:")) {
      send("email_click", link);
    } else if (href.includes("lin.ee") || href.includes("line.me")) {
      send("line_click", link);
    } else if (href.includes("works.html")) {
      send("works_view", link);
    } else if (link.matches(".case-study a[target='_blank']")) {
      send("live_site_click", link);
    }
  });
})();
