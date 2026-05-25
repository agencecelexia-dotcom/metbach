/* =========================================================
   Rénovation Metbach — Interactions
   - Header scroll state
   - Mobile menu
   - Intersection reveal
   - Animated counters
   - Service card spotlight
   - Smooth anchor scroll w/ offset
   - Contact form (client-side mailto fallback)
   ========================================================= */

(() => {
  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  /* ---- Header scroll state ---- */
  const header = $('.site-header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  const menuBtn   = $('[data-menu-open]');
  const menuClose = $('[data-menu-close]');
  const menu      = $('.mobile-menu');
  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
  }
  menuBtn?.setAttribute('aria-expanded', 'false');
  menuBtn?.setAttribute('aria-controls', 'mobile-menu');
  if (menu && !menu.id) menu.id = 'mobile-menu';
  let lastFocused = null;
  const openMenu  = () => {
    lastFocused = document.activeElement;
    menu?.classList.add('open');
    menu?.setAttribute('aria-hidden', 'false');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    menuClose?.focus();
  };
  const closeMenu = () => {
    menu?.classList.remove('open');
    menu?.setAttribute('aria-hidden', 'true');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  };
  menuBtn?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
  });

  /* ---- Reveal on scroll ----
     Above-the-fold elements get .in synchronously to avoid FOIC.
     Below-the-fold elements are revealed by IntersectionObserver. */
  const revealEls = $$('.reveal');
  const vh = window.innerHeight || document.documentElement.clientHeight;
  revealEls.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < vh) el.classList.add('in');
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }
  // Failsafe: any reveal still hidden after 1.5s gets marked .in (covers
  // hash-navigation, slow observers, anchor jumps past sticky header).
  setTimeout(() => {
    revealEls.forEach(el => { if (!el.classList.contains('in')) el.classList.add('in'); });
  }, 1500);
  // Hash navigation: when user lands on an anchor, immediately reveal
  // everything in or above the target zone so content doesn't read blank.
  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.querySelector(location.hash);
      if (!target) return;
      const targetBottom = target.getBoundingClientRect().bottom + window.scrollY;
      revealEls.forEach(el => {
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        if (elTop <= targetBottom + window.innerHeight) el.classList.add('in');
      });
    });
  }

  /* ---- Animated counters ---- */
  const counters = $$('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(target * ease(t));
      el.textContent = v.toLocaleString('fr-FR') + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    // Fire immediately for counters already in viewport (avoid "stuck at 0")
    const vh2 = window.innerHeight || document.documentElement.clientHeight;
    counters.forEach(el => {
      if (el.getBoundingClientRect().top < vh2) {
        animateCount(el);
        el.dataset.animated = '1';
      }
    });
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting && !e.target.dataset.animated) {
            animateCount(e.target);
            cio.unobserve(e.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(el => { if (!el.dataset.animated) cio.observe(el); });
    }
  }

  /* ---- Service card spotlight ---- */
  $$('.service-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---- Smooth anchor with header offset ---- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const offset = (header?.offsetHeight || 0) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---- Year ---- */
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Contact form (POST /api/contact → Celexia CRM) ---- */
  const form = $('#contact-form');
  if (form) {
    const note = $('#form-note');
    const submitBtn = form.querySelector('button[type="submit"]');

    const showNote = (text, isError = false) => {
      if (!note) return;
      note.textContent = text;
      note.className = 'mt-4 text-sm rounded-lg px-4 py-3 border';
      if (isError) {
        note.classList.add('text-red-700', 'bg-red-50', 'border-red-200');
      } else {
        note.classList.add('text-accent-dark', 'bg-accent-soft', 'border-accent/30');
      }
      note.setAttribute('role', 'status');
      note.setAttribute('aria-live', 'polite');
    };

    const merciPath = () => {
      const p = location.pathname;
      if (p.includes('/services/') || p.includes('/villes/') || p.includes('/realisations/') || p.includes('/contact/')) return '../merci/';
      return 'merci/';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot: if filled, silently confirm (bot detected, drop silently)
      const hp = form.querySelector('[name="website"]');
      if (hp && hp.value.trim() !== '') {
        location.href = merciPath();
        return;
      }

      // Native HTML5 validation first
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const payload = {
        name:      (data.get('nom') || '').toString().trim(),
        phone:     (data.get('tel') || '').toString().trim(),
        email:     (data.get('email') || '').toString().trim(),
        work_type: (data.get('service') || '').toString().trim(),
        city:      (data.get('city') || '').toString().trim(),
        message:   (data.get('message') || '').toString().trim(),
        website:   (data.get('website') || '').toString().trim(),
        rgpd:      data.get('rgpd') === 'on' || data.get('rgpd') === 'true' || !!form.querySelector('#rgpd:checked'),
      };

      // Disable button to prevent double-submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'wait';
      }
      showNote("Envoi en cours…");

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          // Track anonymous conversion event (no PII) — works with GA/GTM/Plausible if connected
          try {
            if (window.dataLayer) window.dataLayer.push({ event: 'form_submitted' });
            if (window.plausible) window.plausible('form_submitted');
          } catch (_) {}
          location.href = merciPath();
          return;
        }

        // Specific error handling
        let body;
        try { body = await res.json(); } catch { body = {}; }
        if (res.status === 429) {
          showNote("Trop de demandes envoyées récemment. Réessayez dans 30 secondes ou appelez le 07 85 65 56 02.", true);
        } else if (res.status === 400) {
          showNote("Demande incomplète : " + (body.details || 'vérifiez nom, téléphone, email et message.'), true);
        } else {
          showNote("Une erreur est survenue. Appelez-nous au 07 85 65 56 02 ou écrivez à kevinmetbach7@gmail.com.", true);
        }
      } catch (err) {
        console.error('contact submit failed:', err);
        showNote("Connexion impossible. Appelez le 07 85 65 56 02 ou écrivez à kevinmetbach7@gmail.com.", true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          submitBtn.style.cursor = '';
        }
      }
    });
  }

  /* ---- Tilt on cards w/ data-tilt ---- */
  $$('[data-tilt]').forEach(el => {
    const damp = 18;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${cx * damp}deg) rotateX(${ -cy * damp}deg)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
    });
  });

})();
