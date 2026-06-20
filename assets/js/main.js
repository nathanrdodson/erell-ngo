(function () {
  // ── Scroll-triggered fade-up animations ──────────────────
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.fade-up').forEach(function (el) {
    observer.observe(el);
  });

  // ── Photo lightbox (gallery + team pages) ─────────────────
  var lightbox    = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCap = document.getElementById('lightbox-caption');

  if (lightbox && lightboxImg) {
    // Gallery-style lightbox (photos page) — click .photo-item or .site-item
    document.querySelectorAll('.photo-item, .site-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var src     = item.getAttribute('data-src') || '';
        var caption = item.getAttribute('data-caption') || '';
        lightboxImg.src = src;
        lightboxImg.alt = caption;
        if (lightboxCap) lightboxCap.textContent = caption;
        lightbox.classList.add('open');
      });
    });

    // Team-style lightbox (meet-the-team page) — click .zoomable buttons
    document.querySelectorAll('.zoomable').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var zoomSrc = btn.dataset.zoom;
        var thumb   = btn.querySelector('img');
        var src     = zoomSrc || (thumb && thumb.src) || '';
        var alt     = (thumb && thumb.alt) || '';

        if (lightbox.classList.contains('active')) {
          lightboxImg.classList.add('loading');
          setTimeout(function () { swapImage(src, alt); }, 180);
        } else {
          lightboxImg.classList.add('loading');
          lightbox.classList.add('open', 'active');
          document.body.style.overflow = 'hidden';
          swapImage(src, alt);
        }
      });
    });

    function swapImage(src, alt) {
      lightboxImg.onload = function () { lightboxImg.classList.remove('loading'); };
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      if (lightboxImg.complete) lightboxImg.classList.remove('loading');
    }

    function closeLightbox() {
      lightbox.classList.remove('open', 'active');
      document.body.style.overflow = '';
    }

    var closeBtn = document.getElementById('lightbox-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeLightbox();
      });
    }

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }
}());
