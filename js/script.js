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

  // A consented enquiry can include its current public context. Remembering
  // an entry page/campaign between pages additionally requires analytics consent.
  // Only this tab's last observed entry is retained, for at most 30 idle minutes.
  const publicSourcePath = /^(?:\/|\/(?:services|villes|contact|realisations|a-propos|preparer-travaux|glossaire)|\/services\/(?:couverture|nettoyage-toiture|maconnerie|isolation-exterieure|bardage|petits-travaux|revetement-sol|fondations|amenagement-paysager|clotures|arboriculture)|\/conseils(?:\/(?:fuite-toiture-que-faire|nettoyer-reparer-ou-refaire-toiture|comparer-devis-isolation-exterieure))?|\/villes\/(?:publier|thonon-les-bains|evian-les-bains|annemasse|douvaine|saint-julien-en-genevois|sciez|bons-en-chablais|allinges|neuvecelle|anthy-sur-leman|margencel|marin|veigy-foncenex|chens-sur-leman|messery|massongy|perrignier|lugrin|saint-paul-en-chablais|larringes|armoy|le-lyaud|geneve|nyon|lausanne))$/;
  const ATTRIBUTION_KEY = 'metbach-attribution';
  const ATTRIBUTION_MAX_AGE = 30 * 60 * 1000;
  const CONSENT_MAX_AGE = 15552000000;
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign'];
  let pageConsent;
  let memoryEntry = null;
  const recent = (at, maxAge) => typeof at === 'number' && Number.isFinite(at)
    && Date.now() - at >= 0 && Date.now() - at < maxAge;
  function analyticsAccepted() {
    if (pageConsent !== undefined) return pageConsent;
    try {
      const choice = JSON.parse(localStorage.getItem('metbach-consent') || 'null');
      return choice?.analytics === true && recent(choice.at, CONSENT_MAX_AGE);
    } catch { return false; }
  }
  function campaignFrom(value) {
    const result = {};
    campaignKeys.forEach(key => {
      const item = value?.[key];
      if (typeof item === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(item) && !/\d{7}/.test(item)) result[key] = item;
    });
    return result;
  }
  function externalOrigin(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && url.origin !== location.origin
        && !['renovationmetbach.fr', 'www.renovationmetbach.fr'].includes(url.hostname) ? url.origin : '';
    } catch { return ''; }
  }
  function cleanEntry(value) {
    if (!value || typeof value !== 'object' || typeof value.landing_page !== 'string' || !publicSourcePath.test(value.landing_page)) return null;
    const entry = { landing_page: value.landing_page, ...campaignFrom(value) };
    const origin = externalOrigin(value.referrer_origin);
    if (origin) entry.referrer_origin = origin;
    return entry;
  }
  function clearEntry() {
    memoryEntry = null;
    try { sessionStorage.removeItem(ATTRIBUTION_KEY); } catch { /* Storage may be unavailable. */ }
  }
  function rememberEntry() {
    if (!analyticsAccepted()) { clearEntry(); return {}; }
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || 'null'); } catch { /* Use page memory only. */ }
    if (!saved) saved = memoryEntry;
    const previous = saved && recent(saved.at, ATTRIBUTION_MAX_AGE) ? cleanEntry(saved.entry) : null;
    const campaign = campaignFrom(Object.fromEntries(new URLSearchParams(location.search)));
    const origin = externalOrigin(document.referrer);
    const freshCampaign = campaignKeys.some(key => Object.hasOwn(campaign, key))
      && campaignKeys.some(key => campaign[key] !== previous?.[key]);
    const current = publicSourcePath.test(location.pathname)
      ? cleanEntry({ landing_page: location.pathname, ...campaign, referrer_origin: origin }) : null;
    // A new external entry or campaign replaces the previous one, never merges
    // a new campaign with stale source/medium fields from an earlier campaign.
    const entry = current && (!previous || freshCampaign || origin) ? current : previous;
    if (!entry) { clearEntry(); return {}; }
    memoryEntry = { at: Date.now(), entry };
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(memoryEntry)); } catch { /* Contact must still work. */ }
    return entry;
  }
  window.addEventListener('metbach:consent-change', event => {
    if (typeof event.detail?.analytics !== 'boolean') return;
    pageConsent = event.detail.analytics;
    rememberEntry();
  });
  window.addEventListener('storage', event => {
    if (event.key !== 'metbach-consent' && event.key !== null) return;
    pageConsent = undefined;
    rememberEntry();
  });
  rememberEntry();

  function contactAttribution() {
    const result = { ...rememberEntry() };
    if (/^\/(?:contact)?$/.test(location.pathname)) result.page = location.pathname;
    try {
      const referrer = new URL(document.referrer);
      const origin = externalOrigin(document.referrer);
      if (origin) result.referrer_origin = origin;
      else if (referrer.origin === location.origin && publicSourcePath.test(referrer.pathname)) result.source_page = referrer.pathname;
    } catch { /* Empty or invalid referrer. */ }
    // Without analytics consent, only context available on the submission page
    // accompanies the enquiry; it is never persisted across navigation.
    return { ...result, ...campaignFrom(Object.fromEntries(new URLSearchParams(location.search))) };
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

    // Visible, accessible error messages under each field (the form is novalidate).
    const validatableFields = Array.from(form.querySelectorAll('input, select, textarea'))
      .filter(field => field.name && field.name !== 'website' && field.willValidate);
    const fieldName = (field) => {
      if (field.type === 'checkbox') return 'Consentement';
      const label = form.querySelector(`label[for="${field.id}"]`);
      return label ? label.childNodes[0].textContent.trim() : field.name;
    };
    const fieldMessage = (field) => {
      const v = field.validity;
      if (v.customError) return field.validationMessage;
      if (v.valueMissing) {
        if (field.type === 'checkbox') return 'Cochez cette case pour que nous puissions vous recontacter.';
        if (field.tagName === 'SELECT') return 'Choisissez le service concerné.';
        return 'Ce champ est obligatoire.';
      }
      if (v.typeMismatch && field.type === 'email') return 'Adresse email invalide, par exemple vous@exemple.fr.';
      if (v.tooShort) return `${field.minLength} caractères minimum (actuellement ${field.value.trim().length}).`;
      if (v.tooLong) return `${field.maxLength} caractères maximum.`;
      return 'Valeur invalide.';
    };
    const setFieldError = (field, message) => {
      const id = `${field.id || field.name}-error`;
      let error = document.getElementById(id);
      const describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== id);
      if (message) {
        if (!error) {
          error = document.createElement('p');
          error.id = id;
          error.className = 'field-error';
          const anchor = field.type === 'checkbox' ? field.closest('label') : field;
          const help = anchor.nextElementSibling?.classList.contains('field-help') ? anchor.nextElementSibling : anchor;
          help.insertAdjacentElement('afterend', error);
        }
        error.textContent = message;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', [...describedBy, id].join(' '));
      } else {
        error?.remove();
        field.removeAttribute('aria-invalid');
        if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
        else field.removeAttribute('aria-describedby');
      }
    };
    const checkField = (field) => {
      const ok = field.checkValidity();
      setFieldError(field, ok ? '' : fieldMessage(field));
      return ok;
    };
    // Pressing the submit button blurs the current field before the click lands.
    // Skipping that blur check stops a new message from pushing the button away
    // mid-click; the submit handler validates every field anyway.
    let submitPressed = false;
    submitBtn?.addEventListener('pointerdown', () => {
      submitPressed = true;
      setTimeout(() => { submitPressed = false; }, 800);
    });
    validatableFields.forEach(field => {
      const recheck = () => { if (field.getAttribute('aria-invalid') === 'true') checkField(field); };
      field.addEventListener('input', recheck);
      field.addEventListener('change', recheck);
      if (field.type !== 'checkbox') field.addEventListener('blur', () => { if (!submitPressed && field.value.trim()) checkField(field); });
    });
    // Only known URL keys select fixed labels; arbitrary URL text never enters
    // the form. Existing visitor/autofill values always take precedence.
    const services = {
      bardage: 'Bardage', couverture: 'Couverture', 'nettoyage-toiture': 'Nettoyage et démoussage de toiture',
      'petits-travaux': 'Petits travaux',
      'revetement-sol': 'Revêtement de sol', fondations: 'Fondations',
      'amenagement-paysager': 'Aménagement paysager', clotures: 'Clôtures',
      arboriculture: 'Arboriculture', maconnerie: 'Maçonnerie',
      'isolation-exterieure': 'Isolation thermique extérieure (ITE)',
      'projet-global': 'Plusieurs services / projet global',
    };
    const params = new URLSearchParams(location.search);
    const serviceKey = params.get('service');
    const serviceField = form.querySelector('[name="service"]');
    const cleaningLabel = services['nettoyage-toiture'];
    const hasCleaningOption = Array.from(serviceField?.options || []).some(option => option.value === cleaningLabel);
    const legacyCleaning = serviceKey === 'couverture' && params.get('project') === 'nettoyage-toiture';
    const selectedService = legacyCleaning && hasCleaningOption ? cleaningLabel
      : Object.hasOwn(services, serviceKey) ? services[serviceKey] : '';
    if (selectedService && serviceField && !serviceField.value) {
      const option = Array.from(serviceField.options).find(item => item.value === selectedService);
      if (option) serviceField.value = option.value;
    }
    const cities = {
      publier: 'Publier / Amphion-les-Bains', 'thonon-les-bains': 'Thonon-les-Bains',
      'evian-les-bains': 'Évian-les-Bains', annemasse: 'Annemasse', douvaine: 'Douvaine',
      'saint-julien-en-genevois': 'Saint-Julien-en-Genevois', geneve: 'Genève',
      sciez: 'Sciez', 'bons-en-chablais': 'Bons-en-Chablais', allinges: 'Allinges',
      neuvecelle: 'Neuvecelle', 'anthy-sur-leman': 'Anthy-sur-Léman', margencel: 'Margencel',
      marin: 'Marin (74200)',
      'veigy-foncenex': 'Veigy-Foncenex', 'chens-sur-leman': 'Chens-sur-Léman', messery: 'Messery',
      massongy: 'Massongy', perrignier: 'Perrignier', lugrin: 'Lugrin',
      'saint-paul-en-chablais': 'Saint-Paul-en-Chablais', larringes: 'Larringes', armoy: 'Armoy',
      'le-lyaud': 'Le Lyaud',
      nyon: 'Nyon', lausanne: 'Lausanne',
    };
    const cityKey = params.get('city');
    const cityField = form.querySelector('[name="city"]');
    if (cityField && !cityField.value && Object.hasOwn(cities, cityKey)) cityField.value = cities[cityKey];

    const messageField = form.querySelector('[name="message"]');
    const messageHelp = document.getElementById('message-help');
    const projectHints = {
      Couverture: 'Décrivez l’état du toit, les signes observés et les accès à la maison. Des photos prises depuis le sol pourront aider lors de l’échange.',
      Maçonnerie: 'Précisez l’ouvrage à créer ou à reprendre, ses dimensions approximatives et les accès au chantier.',
      'Isolation thermique extérieure (ITE)': 'Précisez les façades concernées, leur état, le nombre de niveaux et la finition envisagée si vous la connaissez.',
    };
    const defaultHelp = messageHelp?.textContent;
    const defaultPlaceholder = messageField?.placeholder;
    const updateProjectHint = () => {
      const hint = Object.hasOwn(projectHints, serviceField?.value) ? projectHints[serviceField.value] : '';
      const cleaning = serviceField?.value === cleaningLabel
        || (!hasCleaningOption && serviceField?.value === 'Couverture' && params.get('project') === 'nettoyage-toiture');
      const text = cleaning
        ? 'Pour le nettoyage : indiquez le type de couverture si vous le connaissez, les mousses ou traces observées et les accès. En cas de fuite ou de tuile cassée, précisez-le aussi.'
        : hint;
      if (messageHelp) messageHelp.textContent = text ? `${text} 20 à 2 000 caractères.` : defaultHelp;
      if (messageField) messageField.placeholder = text || defaultPlaceholder;
    };
    serviceField?.addEventListener('change', updateProjectHint);
    updateProjectHint();

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

      // Validate every field and show the errors next to them
      validatePhone();
      const invalid = validatableFields.filter(field => !checkField(field));
      if (invalid.length) {
        const names = invalid.map(fieldName).filter(Boolean);
        showNote(invalid.length === 1
          ? `Vérifiez le champ « ${names[0]} » avant d’envoyer votre demande.`
          : `Vérifiez les ${invalid.length} champs signalés : ${names.join(', ')}.`, true);
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const service = (data.get('service') || '').toString().trim();
      // Keep the explicit cleaning context in the existing notification field.
      // The label is fixed and disappears when the visitor chooses another trade.
      const workType = !hasCleaningOption && service === 'Couverture' && params.get('project') === 'nettoyage-toiture'
        ? 'Couverture — nettoyage et démoussage de toiture'
        : service;
      const payload = {
        name:      (data.get('nom') || '').toString().trim(),
        phone:     (data.get('tel') || '').toString().trim(),
        email:     (data.get('email') || '').toString().trim(),
        work_type: workType,
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
            invalid_work_type: 'Choisissez le service concerné par votre projet.',
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

/* ---- Consentement à la mesure d’audience (Google Consent Mode v2) ----
   Le <head> de chaque page (ajouté au build) refuse tout stockage par défaut.
   Ce bandeau enregistre le choix pour 6 mois dans localStorage
   ("metbach-consent") et n’accorde que analytics_storage. Le lien
   « Gérer les cookies » du pied de page permet de changer d’avis. */
(() => {
  const KEY = 'metbach-consent';
  const MAX_AGE = 15552000000; // 180 jours
  const gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored && (typeof stored.analytics !== 'boolean' || typeof stored.at !== 'number'
      || !Number.isFinite(stored.at) || Date.now() - stored.at < 0 || Date.now() - stored.at >= MAX_AGE)) stored = null;
  } catch { stored = null; }

  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ analytics, at: Date.now() })); } catch { /* choix gardé pour cette page seulement */ }
    gtag('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied' });
    if (!analytics) {
      // Retire les cookies Google Analytics déjà déposés sur ce domaine.
      document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => /^_ga/.test(n)).forEach(n => {
        for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname.replace(/^www\./, '')}`]) {
          document.cookie = `${n}=; Max-Age=0; path=/${domain}`;
        }
      });
    }
    window.dispatchEvent(new CustomEvent('metbach:consent-change', { detail: { analytics } }));
    window.dataLayer?.push({ event: analytics ? 'consent_granted' : 'consent_denied' });
  }

  function showBanner() {
    if (document.querySelector('.consent-banner')) return;
    const box = document.createElement('section');
    box.className = 'consent-banner';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Mesure d’audience');
    box.innerHTML = '<p>Avec votre accord, nous mesurons la fréquentation du site avec Google Analytics pour savoir quelles pages sont utiles. Aucune publicité. <a href="/politique-confidentialite#sec-10">En savoir plus</a></p>'
      + '<div class="consent-actions"><button type="button" class="btn btn-ghost" data-consent="deny">Refuser</button>'
      + '<button type="button" class="btn btn-ghost" data-consent="accept">Accepter</button></div>';
    box.addEventListener('click', e => {
      const choice = e.target.closest('[data-consent]')?.dataset.consent;
      if (!choice) return;
      save(choice === 'accept');
      box.remove();
    });
    document.body.appendChild(box);
  }

  // Lien permanent pour modifier son choix, dans le pied de page.
  const legal = document.querySelector('.footer-bottom > div');
  if (legal) {
    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'consent-manage';
    manage.textContent = 'Gérer les cookies';
    manage.addEventListener('click', showBanner);
    legal.appendChild(manage);
  }
  document.querySelectorAll('[data-consent-open]').forEach(el => el.addEventListener('click', showBanner));

  if (!stored) showBanner();
})();
