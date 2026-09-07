/* Document pages progressively enhance; slides-only pages explicitly opt in. */
(() => {
  const root = document.documentElement;
    const slidesOnly = Boolean(document.querySelector("main[data-slides-only]"));
  const documentView = document.getElementById("document-view");
    const unavailable = document.getElementById("slides-unavailable");
  const deck = document.getElementById("slides-view");
  const toolbar = document.getElementById("view-toolbar");
  const viewport = document.getElementById("slide-viewport");
  const slides = [...document.querySelectorAll("[data-slide]")];
  const switchButtons = [...document.querySelectorAll("[data-view]")];
  const previous = document.getElementById("previous-slide");
  const next = document.getElementById("next-slide");
  const counter = document.getElementById("slide-counter");
  const currentTitle = document.getElementById("slide-current-title");
  const announcement = document.getElementById("slide-announcement");
  const help = document.getElementById("slide-help");
    if ((!documentView && !slidesOnly) || (slidesOnly && !unavailable) ||
      !deck || !toolbar || !viewport || !slides.length) return;

  const largeScreen = window.matchMedia("(min-width: 1200px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let view = slidesOnly ? "unavailable" : "document";
  let currentSlide = 0;
  let documentScroll = window.scrollY;
  let transition;

  function updateURL() {
      if (slidesOnly) return;
    const url = new URL(window.location.href);
    if (view === "slides") url.searchParams.set("view", "slides");
    else url.searchParams.delete("view");
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
  }

  function updatePosition() {
    const title = slides[currentSlide].querySelector("h1").textContent;
    previous.disabled = currentSlide === 0;
    next.disabled = currentSlide === slides.length - 1;
    counter.textContent = `${currentSlide + 1} / ${slides.length}`;
    currentTitle.textContent = title;
    announcement.textContent = `Slide ${currentSlide + 1} of ${slides.length}: ${title}`;
  }

  function setView(requestedView, {focus = true} = {}) {
      if (slidesOnly) {
          setSlidesOnlyView({focus});
          return;
      }
    const nextView = requestedView === "slides" && largeScreen.matches ? "slides" : "document";
    const focusedElement = document.activeElement;
    toolbar.hidden = !largeScreen.matches;
    if (nextView === view) {
      if (focus && toolbar.hidden && toolbar.contains(focusedElement)) {
        documentView.focus({preventScroll: true});
      }
      updateURL();
      return;
    }

    const returningToDocument = nextView === "document";
    if (!returningToDocument) documentScroll = window.scrollY;
    transition?.cancel();
    view = nextView;
    root.dataset.planView = view;
    documentView.hidden = !returningToDocument;
    deck.hidden = returningToDocument;
    help.hidden = returningToDocument;
    switchButtons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    });
    updateURL();

    if (returningToDocument) {
      if (focus && (deck.contains(focusedElement) || toolbar.hidden)) {
        documentView.focus({preventScroll: true});
      }
      window.scrollTo({top: documentScroll, behavior: "instant"});
    } else {
      window.scrollTo({top: 0, behavior: "instant"});
      viewport.scrollTop = 0;
      updatePosition();
      if (focus) slides[currentSlide].focus({preventScroll: true});
    }
  }

    function setSlidesOnlyView({focus}) {
        const available = largeScreen.matches;
        const nextView = available ? "slides" : "unavailable";
        const focusedElement = document.activeElement;
        const focusWasInPresentation = deck.contains(focusedElement) || toolbar.contains(focusedElement);
        const focusWasInNotice = unavailable.contains(focusedElement);
        const changed = nextView !== view;

        if (changed) {
            transition?.cancel();
            if (available) documentScroll = window.scrollY;
        }
        view = nextView;
        root.dataset.planView = view;
        unavailable.hidden = available;
        toolbar.hidden = !available;
        deck.hidden = !available;
        help.hidden = !available;

        if (available) {
            updatePosition();
            if (changed) {
                window.scrollTo({top: 0, behavior: "instant"});
                viewport.scrollTop = 0;
            }
            if (focus && focusWasInNotice) slides[currentSlide].focus({preventScroll: true});
        } else {
            if (focus && focusWasInPresentation) unavailable.focus({preventScroll: true});
            if (changed) window.scrollTo({top: documentScroll, behavior: "instant"});
        }
    }

  function moveSlide(direction) {
    if (view !== "slides") return;
    const destination = Math.max(0, Math.min(slides.length - 1, currentSlide + direction));
    if (destination === currentSlide) return;

    const outgoingSlide = slides[currentSlide];
    const focusedElement = document.activeElement;
    const focusWasInSlide = outgoingSlide.contains(focusedElement);
    transition?.cancel();
    outgoingSlide.hidden = true;
    currentSlide = destination;
    const incomingSlide = slides[currentSlide];
    incomingSlide.hidden = false;
    viewport.scrollTop = 0;
    updatePosition();

    // Keep focus visible when its slide disappears or its endpoint button disables.
    if (focusWasInSlide) incomingSlide.focus({preventScroll: true});
    else if (focusedElement === previous && previous.disabled) next.focus({preventScroll: true});
    else if (focusedElement === next && next.disabled) previous.focus({preventScroll: true});

    if (!reducedMotion.matches && typeof incomingSlide.animate === "function") {
      transition = incomingSlide.animate([
        {transform: `translateX(${direction > 0 ? "2rem" : "-2rem"})`, opacity: 0},
        {transform: "translateX(0)", opacity: 1},
      ], {duration: 180, easing: "ease-out"});
    }
  }

  switchButtons.forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  previous.addEventListener("click", () => moveSlide(-1));
  next.addEventListener("click", () => moveSlide(1));

  document.addEventListener("keydown", event => {
    if (view !== "slides" || event.defaultPrevented || event.repeat || event.isComposing ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    const arrow = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const navigationButton = target.closest("#previous-slide, #next-slide");
    if (target.isContentEditable || target.closest("input, textarea, select, [role='textbox'], [role='slider'], [role='spinbutton']")) return;
    if (target.closest("a, button, summary, [role='button'], [role='link'], [role='tab']") && !(arrow && navigationButton)) return;

    if (arrow || event.key === " ") {
      event.preventDefault();
      moveSlide(event.key === "ArrowLeft" ? -1 : 1);
    }
  });

  largeScreen.addEventListener("change", () => {
      if (slidesOnly) setView("slides");
      else if (!largeScreen.matches) setView("document");
    else toolbar.hidden = false;
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) transition?.cancel();
  });
    if (!slidesOnly) {
        window.addEventListener("popstate", () => {
            setView(new URL(window.location.href).searchParams.get("view"), {focus: false});
        });
        window.addEventListener("hashchange", () => {
            let id;
            try {
                id = decodeURIComponent(window.location.hash.slice(1));
            } catch {
                return;
            }
            const target = document.getElementById(id);
            if (view === "slides" && target && documentView.contains(target)) {
                setView("document", {focus: false});
                target.scrollIntoView();
            }
        });
    }

    root.dataset.planView = view;
    setView(slidesOnly ? "slides" : new URL(window.location.href).searchParams.get("view"), {focus: false});
})();
