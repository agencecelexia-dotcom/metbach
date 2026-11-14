/* =========================================================
   Rénovation Metbach — Interactions
   - Header scroll state
   - Mobile menu
   - Intersection reveal
   - Animated counters
   - Service card spotlight
   - Smooth anchor scroll w/ offset
   - Contact form (POST /api/contact → n8n → notification email interne)
   ========================================================= */

(() => {
  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const initializeIcons = () => {
    // Some pages keep their own initializer. Only initialize while placeholders
    // remain; Lucide preserves their attributes, including aria-hidden/classes.
    if (window.lucide && document.querySelector('i[data-lucide]')) window.lucide.createIcons();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeIcons, { once: true });
  else initializeIcons();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const findAnchor = hash => {
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  };

  // Keep these format rules aligned with /api/contact. This validates a usable
  // format, not ownership or whether a telephone number is currently assigned.
  function normalizePhone(value) {
    if (typeof value !== 'string' || value.length > 40 || /[\r\n]/.test(value)) return '';
    const input = value.trim();
    if (!/^[+\d\s().-]+$/.test(input)) return '';
    let phone = input.replace(/[\s().-]/g, '').replace(/^00/, '+');
    if (!/^\+?\d+$/.test(phone)) return '';
    // People often paste the optional national trunk: +33 (0)6 … / +41 (0)79 …
    phone = phone.replace(/^(\+(?:33|41))0/, '$1');
    return phone;
  }
  function isValidPhone(value) {
    const phone = normalizePhone(value);
    if (/^\+(?:33|41)/.test(phone)) return /^\+(?:33|41)[1-9]\d{8}$/.test(phone);
    return /^0[1-9]\d{8}$/.test(phone) || /^\+[1-9]\d{7,14}$/.test(phone);
  }

  // Attribution accompanies a consented enquiry only. No cookie or browser
  // storage, fingerprint, arbitrary query string or referrer path is collected.
  // Without storage, campaign information is available only on this page.
  function contactAttribution() {
    const result = {};
    const path = location.pathname;
    if (/^\/(?:contact)?$/.test(path)) result.page = path;
    try {
      const referrer = new URL(document.referrer);
      if (/^https?:$/.test(referrer.protocol) && referrer.origin !== location.origin) {
        result.referrer_origin = referrer.origin;
      }
    } catch { /* Empty or invalid referrer. */ }
    const params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(key => {
      const value = params.get(key);
      if (value && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value) && !/\d{7}/.test(value)) {
        result[key] = value;
      }
    });
    return result;
  }

  // Optional adapters only: these do not load an analytics service. A telephone
  // click is an intent signal, never an assertion that a call was completed.
  function trackContactEvent(event) {
    const page = /^\/[a-z0-9/-]*$/.test(location.pathname) ? location.pathname : '/';
    try {
      if (typeof window.dataLayer?.push === 'function') window.dataLayer.push({ event, page });
    } catch { /* A collector must never interrupt the contact path. */ }
    try {
      if (typeof window.plausible === 'function') window.plausible(event, { props: { page } });
    } catch { /* The other adapter may still work independently. */ }
  }
  $$('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => trackContactEvent('tel_click'));
  });

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
    menu.setAttribute('aria-label', 'Navigation principale');
    menu.inert = true;
  }
  menuBtn?.setAttribute('aria-expanded', 'false');
  menuBtn?.setAttribute('aria-controls', 'mobile-menu');
  if (menu && !menu.id) menu.id = 'mobile-menu';
  let lastFocused = null;
  const openMenu  = () => {
    if (!menu) return;
    lastFocused = document.activeElement;
    menu.inert = false;
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
    if (menu) menu.inert = true;
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  };
  menuBtn?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (!menu?.classList.contains('open')) return;
    if (e.key === 'Escape') closeMenu();
    if (e.key !== 'Tab') return;
    const focusable = $$('a[href], button:not([disabled]), [tabindex="0"]', menu)
      .filter(el => el.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
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
  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          e.target.classList.remove('reveal-pending');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(el => {
      if (!el.classList.contains('in')) {
        el.classList.add('reveal-pending');
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }
  // Failsafe: any reveal still hidden after 1.5s gets marked .in (covers
  // hash-navigation, slow observers, anchor jumps past sticky header).
  setTimeout(() => {
    revealEls.forEach(el => {
      el.classList.remove('reveal-pending');
      el.classList.add('in');
    });
  }, 1500);
  // Hash navigation: when user lands on an anchor, immediately reveal
  // everything in or above the target zone so content doesn't read blank.
  if (location.hash) {
    requestAnimationFrame(() => {
      const target = findAnchor(location.hash);
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
    if (reducedMotion) {
      el.textContent = target.toLocaleString('fr-FR') + suffix;
      return;
    }
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
  if (!reducedMotion) $$('.service-card').forEach(card => {
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
      const target = findAnchor(id);
      if (!target) return;
      e.preventDefault();
      const offset = (header?.offsetHeight || 0) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---- Year ---- */
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Contact form (POST /api/contact → n8n → email) ---- */
  const form = $('#contact-form');
  if (form) {
    const note = $('#form-note');
    const submitBtn = form.querySelector('button[type="submit"]');
    const phoneField = form.querySelector('[name="tel"]');
    let submitting = false;

    const validatePhone = () => {
      if (!phoneField) return;
      phoneField.setCustomValidity(!phoneField.value.trim() || isValidPhone(phoneField.value)
        ? ''
        : 'Indiquez un numéro valide : 06 12 34 56 78 ou +41 79 123 45 67. Pour un autre pays, ajoutez son indicatif.');
    };
    phoneField?.addEventListener('input', validatePhone);
    phoneField?.addEventListener('change', validatePhone);
    // No values from the URL are inserted into HTML. Only a known service may
    // select one of the options already present in the form.
    const services = {
      bardage: 'Bardage', couverture: 'Couverture', 'petits-travaux': 'Petits travaux',
      'revetement-sol': 'Revêtement de sol', fondations: 'Fondations',
      'amenagement-paysager': 'Aménagement paysager', clotures: 'Clôtures',
      arboriculture: 'Arboriculture', maconnerie: 'Maçonnerie',
      'isolation-exterieure': 'Isolation thermique extérieure (ITE)',
      'projet-global': 'Plusieurs services / projet global',
    };
    const selectedService = services[new URLSearchParams(location.search).get('service')];
    const serviceField = form.querySelector('[name="service"]');
    if (selectedService && serviceField) {
      const option = Array.from(serviceField.options).find(item => item.value === selectedService);
      if (option) serviceField.value = option.value;
    }

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

    const merciPath = () => '/merci';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting) return;

      // Honeypot: if filled, silently confirm (bot detected, drop silently)
      const hp = form.querySelector('[name="website"]');
      if (hp && hp.value.trim() !== '') {
        location.href = merciPath();
        return;
      }

      // Native HTML5 validation first
      validatePhone();
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
        attribution: contactAttribution(),
      };

      // Disable button to prevent double-submit
      submitting = true;
      form.setAttribute('aria-busy', 'true');
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

        let body;
        try { body = await res.json(); } catch { body = {}; }
        if (res.ok && body.ok === true) {
          // The endpoint confirms successful upstream receipt. This is an
          // accepted enquiry, not proof that a notification email was delivered.
          trackContactEvent('form_submitted');
          location.href = merciPath();
          return;
        }

        // Specific error handling
        if (res.status === 429) {
          showNote("Trop de demandes envoyées récemment. Réessayez dans 30 secondes ou appelez le 07 69 13 61 82.", true);
        } else if (res.status === 400) {
          const messages = {
            invalid_phone: 'Vérifiez votre téléphone et ajoutez l’indicatif pour un numéro étranger, par exemple +41.',
            invalid_email: 'Vérifiez votre adresse email, par exemple vous@exemple.fr.',
            invalid_name: 'Indiquez votre nom pour que nous puissions vous répondre.',
            invalid_message: 'Décrivez votre projet en 20 caractères minimum.',
            phone_or_email_required: 'Indiquez un téléphone ou une adresse email pour être recontacté.',
            consent_required: 'Cochez la case autorisant le traitement de votre demande.',
          };
          showNote(messages[body.details] || 'Vérifiez les champs du formulaire, puis réessayez.', true);
        } else {
          showNote("Une erreur est survenue. Appelez-nous au 07 69 13 61 82.", true);
        }
      } catch (err) {
        console.error('contact submit failed:', err);
        showNote("Connexion impossible. Appelez le 07 69 13 61 82.", true);
      } finally {
        submitting = false;
        form.removeAttribute('aria-busy');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          submitBtn.style.cursor = '';
        }
      }
    });
  }

  /* ---- Tilt on cards w/ data-tilt ---- */
  if (!reducedMotion) $$('[data-tilt]').forEach(el => {
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
