(() => {
  "use strict";

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

  // The index uses these same functions when it reads the publication pages.
  window.PlanReadingTime = Object.freeze({countWords, formatReadingTime});

  for (const article of document.querySelectorAll(".plan-document")) {
    const target = article.querySelector(".document-metadata [data-field=\"readingTime\"]");
    if (target) target.textContent = formatReadingTime(countWords([article]));
  }

  const slides = document.querySelectorAll("#slides-view [data-slide]:not(.pitch-cover)");
  const coverTarget = document.querySelector("#slides-view .pitch-cover .document-metadata [data-field=\"readingTime\"]");
  if (coverTarget && slides.length) {
    coverTarget.textContent = formatReadingTime(countWords(slides));
  }
})();
