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
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
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

  /* ---- Contact form (mailto fallback) ---- */
  const form = $('#contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const nom = (data.get('nom') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const tel = (data.get('tel') || '').toString().trim();
      const service = (data.get('service') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();

      const subject = encodeURIComponent(`Demande de devis — ${service || 'Rénovation Metbach'}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nJe vous contacte pour : ${service || '—'}\n\n` +
        `Nom : ${nom}\nEmail : ${email}\nTéléphone : ${tel}\n\n` +
        `Message :\n${message}\n\n— Envoyé via metbach.fr`
      );
      const mailto = `mailto:contact@renovation-metbach.fr?subject=${subject}&body=${body}`;

      const note = $('#form-note');
      if (note) {
        note.textContent = "Votre client mail va s'ouvrir pour finaliser l'envoi. Sinon, appelez-nous directement.";
        note.classList.remove('hidden');
      }
      window.location.href = mailto;
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
