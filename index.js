(() => {
  "use strict";

  const metadataFields = new Map([
    ["Author", "author"],
    ["Affiliation", "affiliation"],
    ["First published", "published"],
    ["Last revised", "revised"],
    ["Status", "status"],
  ]);
  const wordNumbers = new Intl.NumberFormat("en-GB");
  const wordsPerMinute = 200; // Estimate 30 seconds per 100 words.
  const blockTags = new Set([
    "ARTICLE", "BLOCKQUOTE", "BR", "CAPTION", "DD", "DIV", "DL", "DT",
    "FIGCAPTION", "FIGURE", "H1", "H2", "H3", "H4", "H5", "H6", "HR",
    "LI", "OL", "P", "PRE", "SECTION", "TABLE", "TBODY", "TD", "TFOOT",
    "TH", "THEAD", "TR", "UL",
  ]);
  const excludedContent = [
    "#document-title", ".document-title", ".document-description",
    ".document-metadata", ".pitch-cover", ".slide-kicker",
    "nav", "script", "style", "template", "iframe", "svg",
  ].join(", ");

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

  function contentText(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1 || node.matches(excludedContent)) return "";

    // Preserve inline words while separating adjacent paragraphs and table cells.
    let text = Array.from(node.childNodes, contentText).join("");
    if (/^H[1-6]$/.test(node.tagName)) text = text.replace(/^\s*\d+[.)]\s+/, "");
    return blockTags.has(node.tagName) ? ` ${text} ` : text;
  }

  function countWords(roots) {
    const text = Array.from(roots, contentText).join(" ");
    return text.split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
  }

  function formatReadingTime(wordCount) {
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    const wordLabel = wordCount === 1 ? "word" : "words";
    return `~${minutes} min (${wordNumbers.format(wordCount)} ${wordLabel})`;
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
