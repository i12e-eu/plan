(() => {
  "use strict";

    if (!window.PlanReadingTime) return;
    const {countWords, formatReadingTime} = window.PlanReadingTime;

  const metadataFields = new Map([
    ["Author", "author"],
    ["Affiliation", "affiliation"],
    ["First published", "published"],
    ["Last revised", "revised"],
    ["Status", "status"],
  ]);

  function readMetadata(root) {
    const values = {};
    const metadata = root?.querySelector(".document-metadata");
    for (const row of metadata?.children ?? []) {
      const label = row.querySelector("dt")?.textContent.trim();
      const field = metadataFields.get(label);
      const value = row.querySelector("dd");
      if (!field || !value?.textContent.trim()) continue;

      values[field] = {text: value.textContent.trim()};
      const time = value.querySelector("time[datetime]");
      if (time) values[field].date = time.getAttribute("datetime");
    }
    return values;
  }

  function updatePublication(name, values) {
    const publication = document.querySelector(`[data-publication="${name}"]`);
    if (!publication) return;

    for (const target of publication.querySelectorAll("[data-field]")) {
      const value = values[target.dataset.field];
      if (!value) continue;

      const time = target.querySelector("time");
      if (time) {
        // Keep the authored fallback if the source lacks a machine-readable date.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? "")) continue;
        time.textContent = value.text;
        time.setAttribute("datetime", value.date);
      } else {
        target.textContent = value.text;
      }
    }
  }

  async function refreshPage(path, update) {
    try {
      const response = await fetch(path, {cache: "no-cache"});
      if (!response.ok) return;
      const source = new DOMParser().parseFromString(await response.text(), "text/html");
      update(source);
    } catch {
      // Static publication details and links remain usable offline or without fetch.
    }
  }

  void refreshPage("./master-plan.html", source => {
    const article = source.querySelector(".plan-document");
    if (!article) return;
    updatePublication("master-plan", {
      ...readMetadata(article),
      readingTime: {text: formatReadingTime(countWords([article]))},
    });
  });

  void refreshPage("./5w1h.html", source => {
    const article = source.querySelector("#document-view .plan-document");
    if (article) {
      const metadata = readMetadata(article);
      updatePublication("5w1h-common", metadata);
      updatePublication("5w1h-document", {
        ...metadata,
        readingTime: {text: formatReadingTime(countWords([article]))},
      });
    }

    const cover = source.querySelector("#slides-view .pitch-cover");
    const slides = source.querySelectorAll("#slides-view [data-slide]:not(.pitch-cover)");
    if (cover) updatePublication("5w1h-slides", readMetadata(cover));
    if (slides.length) {
      updatePublication("5w1h-slides", {
        readingTime: {text: formatReadingTime(countWords(slides))},
      });
    }
  });

    void refreshPage("./dutch-journalism.html", source => {
        const cover = source.querySelector("#slides-view .pitch-cover");
        const slides = source.querySelectorAll("#slides-view [data-slide]:not(.pitch-cover)");
        if (cover) updatePublication("dutch-journalism", readMetadata(cover));
        if (slides.length) {
            updatePublication("dutch-journalism", {
                readingTime: {text: formatReadingTime(countWords(slides))},
            });
        }
    });
})();
