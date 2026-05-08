// sito mio/js/projects.js
(() => {
  const carousel = document.querySelector("[data-carousel]");
  const prevBtn = document.querySelector("[data-carousel-prev]");
  const nextBtn = document.querySelector("[data-carousel-next]");
  if (!carousel || !prevBtn || !nextBtn) return;

  const slides = Array.from(carousel.querySelectorAll(".fade-slide"));
  if (slides.length === 0) return;

  const FADE_MS = 160;

  const isVideo = (el) => el && el.tagName === "VIDEO";
  const isImage = (el) => el && el.tagName === "IMG";

  // Build list of indices that are images (includes GIF because it's <img>)
  const imageIndices = slides
    .map((s, i) => (isImage(s) ? i : null))
    .filter((v) => v !== null);

  // Ensure there is one active slide
  let index = slides.findIndex((s) => s.classList.contains("is-active"));
  if (index < 0) {
    slides[0].classList.add("is-active");
    index = 0;
  }

  // ----- Video control: pause others to avoid ghost audio -----
  const videos = slides.filter(isVideo);

  const pauseAllVideos = () => {
    videos.forEach((v) => {
      try {
        v.pause();
      } catch {}
    });
  };

  videos.forEach((v) => {
    v.addEventListener("play", () => {
      videos.forEach((other) => {
        if (other !== v) {
          try {
            other.pause();
            other.currentTime = 0; // remove this line if you want them to keep time
          } catch {}
        }
      });
    });
  });

  // ----- Lock during fade -----
  let locked = false;
  const withLock = (fn) => {
    if (locked) return;
    locked = true;
    try {
      fn();
    } finally {
      window.setTimeout(() => {
        locked = false;
      }, FADE_MS * 2);
    }
  };

  // ----- Core switch -----
  const setActive = (nextIndex) => {
    if (nextIndex === index) return;

    const current = slides[index];
    const target = slides[nextIndex];
    if (!current || !target) return;

    carousel.classList.add("is-fading");

    window.setTimeout(() => {
      current.classList.remove("is-active");
      target.classList.add("is-active");
      index = nextIndex;

      pauseAllVideos();
      carousel.classList.remove("is-fading");

      // If lightbox is open, keep it synced with the active image
      if (lightboxOpen && isImage(slides[index])) {
        syncLightboxToActive();
      }
    }, FADE_MS);
  };

  const goPrev = () => setActive((index - 1 + slides.length) % slides.length);
  const goNext = () => setActive((index + 1) % slides.length);

  prevBtn.addEventListener("click", () => withLock(goPrev));
  nextBtn.addEventListener("click", () => withLock(goNext));

  // =========================
  // LIGHTBOX with navigation
  // =========================

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous image">←</button>
    <img class="lightbox-img" alt="" />
    <button class="lightbox-btn lightbox-next" type="button" aria-label="Next image">→</button>
  `;
  document.body.appendChild(lightbox);

  const lbImg = lightbox.querySelector(".lightbox-img");
  const lbPrev = lightbox.querySelector(".lightbox-prev");
  const lbNext = lightbox.querySelector(".lightbox-next");

  let lightboxOpen = false;

  const openLightbox = () => {
    lightbox.classList.add("is-open");
    lightboxOpen = true;
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightboxOpen = false;
    lbImg.removeAttribute("src");
  };

  // Find the current position within imageIndices based on current active slide index
  const getImageCursor = () => {
    const pos = imageIndices.indexOf(index);
    return pos >= 0 ? pos : 0;
  };

  const setLightboxImageFromIndex = (slideIndex) => {
    const s = slides[slideIndex];
    if (!isImage(s)) return;
    lbImg.src = s.src;
    lbImg.alt = s.alt || "";
  };

  const syncLightboxToActive = () => {
    setLightboxImageFromIndex(index);
  };

  const lightboxPrev = () => {
    if (imageIndices.length === 0) return;
    const cursor = getImageCursor();
    const nextCursor = (cursor - 1 + imageIndices.length) % imageIndices.length;
    const nextSlideIndex = imageIndices[nextCursor];
    withLock(() => setActive(nextSlideIndex));
    openLightbox();
    setLightboxImageFromIndex(nextSlideIndex);
  };

  const lightboxNext = () => {
    if (imageIndices.length === 0) return;
    const cursor = getImageCursor();
    const nextCursor = (cursor + 1) % imageIndices.length;
    const nextSlideIndex = imageIndices[nextCursor];
    withLock(() => setActive(nextSlideIndex));
    openLightbox();
    setLightboxImageFromIndex(nextSlideIndex);
  };

  // Clicking background closes; clicking buttons shouldn't close
  lightbox.addEventListener("click", (e) => {
    const t = e.target;
    if (t === lbImg || t === lbPrev || t === lbNext) return;
    closeLightbox();
  });

  lbPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    lightboxPrev();
  });

  lbNext.addEventListener("click", (e) => {
    e.stopPropagation();
    lightboxNext();
  });

  // Click active slide:
  // - image -> open lightbox
  // - video -> fullscreen video
  carousel.addEventListener("click", () => {
    const active = slides[index];
    if (!active) return;

    if (isVideo(active)) {
      if (active.requestFullscreen) active.requestFullscreen();
      else if (active.webkitEnterFullscreen) active.webkitEnterFullscreen();
      return;
    }

    if (isImage(active)) {
      openLightbox();
      syncLightboxToActive();
    }
  });

  // Keyboard:
  // - if lightbox open: arrows navigate images only
  // - else arrows navigate carousel normally
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      return;
    }

    if (e.key === "ArrowLeft") {
      if (lightboxOpen) lightboxPrev();
      else withLock(goPrev);
    }

    if (e.key === "ArrowRight") {
      if (lightboxOpen) lightboxNext();
      else withLock(goNext);
    }
  });
})();