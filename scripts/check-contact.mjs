// Focused contact-flow checks. All network calls and browser globals are mocked.
// No real enquiry is sent; the webhook URL below deliberately uses .invalid.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const apiSource = await fs.readFile(new URL('api/contact.js', root), 'utf8');
const browserSource = await fs.readFile(new URL('js/script.js', root), 'utf8');
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(apiSource).toString('base64')}`);

process.env.N8N_WEBHOOK_URL = 'https://webhook.invalid/test';
delete process.env.N8N_WEBHOOK_SECRET;
const forwarded = [];
let upstream = async () => ({ ok: true, status: 200 });
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://webhook.invalid/test');
  forwarded.push(JSON.parse(options.body));
  return upstream();
};
let ip = 0;
const valid = () => ({
  name: 'Test local', phone: '06 12 34 56 78', email: 'test@example.invalid',
  work_type: 'Couverture', city: 'Publier',
  message: 'Demande fictive utilisée uniquement dans les tests locaux.', rgpd: true,
});
async function request(body, options = {}) {
  const response = {
    statusCode: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({
    method: options.method || 'POST', body,
    headers: { 'x-forwarded-for': options.ip || `test-ip-${++ip}` },
  }, response);
  return response;
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, writes: [], getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { this.writes.push(key); values.set(key, String(value)); },
    removeItem(key) { values.delete(key); } };
}

// Small DOM fixture modelling the interfaces used by the contact UI, including
// browser constraint validity, inline errors, consent events and storage. Network
// stays mocked. Full browser validation can additionally run against local HTML.
function browser({ search = '', pathname = '/contact', phone = '06 12 34 56 78',
  cityValue = '', serviceValue, referrer = 'https://www.google.com/search?q=private',
  fetchResult, local = memoryStorage(), session = memoryStorage(), withForm = true,
  email = 'test@example.invalid', name = 'Test local', message = 'Demande de test locale sans aucun appel réel.',
  consent = true, legacyOptions = false } = {}) {
  const registry = new Map(), windowEvents = {};
  const calls = [], events = [], gtagCalls = [];
  function element(tag = 'div', id = '') {
    const attrs = new Map();
    const el = { id, tagName: tag.toUpperCase(), children: [], events: {}, style: {}, className: '', textContent: '',
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) { (this.events[type] ||= []).push(fn); },
      trigger(type, event = {}) { return this.events[type]?.at(-1)?.(event); },
      setAttribute(key, value) { attrs.set(key, String(value)); }, getAttribute(key) { return attrs.get(key) ?? null; },
      removeAttribute(key) { attrs.delete(key); },
      appendChild(child) { this.children.push(child); child.parent = this; if (child.id) registry.set(child.id, child); },
      insertAdjacentElement(_, child) { if (child.id) registry.set(child.id, child); },
      remove() { registry.delete(this.id); if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); },
      closest() { return this; }, focus() { this.focused = true; },
    };
    if (id) registry.set(id, el);
    return el;
  }
  function field(id, value, { type = 'text', required = false, minLength = 0, tag = 'input' } = {}) {
    const el = element(tag, id);
    Object.defineProperties(el, Object.getOwnPropertyDescriptors({ name: id, value, type, required, minLength, willValidate: true, checked: true, error: '',
      setCustomValidity(text) { this.error = text; },
      get validity() { return { customError: !!this.error,
        valueMissing: this.required && (this.type === 'checkbox' ? !this.checked : !this.value),
        typeMismatch: this.type === 'email' && !!this.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value),
        tooShort: !!this.value && this.value.length < this.minLength, tooLong: false }; },
      get validationMessage() { return this.error; },
      checkValidity() { return !Object.values(this.validity).some(Boolean); },
    }));
    return el;
  }
  const nameField = field('nom', name, { required: true, minLength: 2 });
  const phoneField = field('tel', phone, { type: 'tel', required: true });
  const emailField = field('email', email, { type: 'email' });
  const service = field('service', serviceValue ?? (new URLSearchParams(search).has('service') ? '' : 'Couverture'), { tag: 'select', required: true });
  const services = ['Couverture', 'Bardage', 'Maçonnerie', 'Isolation thermique extérieure (ITE)', 'Petits travaux'];
  if (!legacyOptions) services.push('Nettoyage et démoussage de toiture');
  service.options = services.map(value => ({ value }));
  const cityField = field('city', cityValue);
  const messageField = Object.assign(field('message', message, { tag: 'textarea', required: true, minLength: 20 }), { placeholder: 'Votre projet' });
  const rgpdField = field('rgpd', '', { type: 'checkbox', required: true }); rgpdField.checked = consent;
  const messageHelp = element('p', 'message-help'); messageHelp.textContent = '20 à 2 000 caractères.';
  const submit = Object.assign(element('button'), { disabled: false });
  const honeypot = field('website', '');
  const note = element('p', 'form-note');
  const form = element('form', 'contact-form');
  const fields = [nameField, phoneField, emailField, service, cityField, messageField, rgpdField, honeypot];
  form.querySelector = selector => {
    const fieldMatch = selector.match(/^\[name="(.+)"\]$/);
    if (fieldMatch) return fields.find(f => f.name === fieldMatch[1]) || null;
    const labelMatch = selector.match(/^label\[for="(.+)"\]$/);
    if (labelMatch) return { childNodes: [{ textContent: labelMatch[1] }] };
    if (selector === 'button[type="submit"]') return submit;
    if (selector === '#rgpd:checked') return rgpdField.checked ? rgpdField : null;
    return null;
  };
  form.querySelectorAll = () => fields;
  Object.defineProperty(form, 'busy', { get: () => form.getAttribute('aria-busy') === 'true' });
  const location = { pathname, origin: 'https://www.renovationmetbach.fr', hostname: 'www.renovationmetbach.fr', search, hash: '', href: pathname };
  const link = element('a'), footer = element('div'), body = element('body');
  const window = {
    matchMedia: () => ({ matches: true }), innerHeight: 667, dataLayer: events,
    gtag: (...args) => gtagCalls.push(args),
    addEventListener(type, fn) { (windowEvents[type] ||= []).push(fn); },
    dispatchEvent(event) { (windowEvents[event.type] || []).forEach(fn => fn(event)); },
  };
  const document = {
    referrer, readyState: 'complete', cookie: '', body, documentElement: { clientHeight: 667 }, addEventListener() {},
    getElementById: id => registry.get(id) || null,
    querySelector(selector) {
      if (selector === '.consent-banner') return body.children.find(x => x.className === 'consent-banner') || null;
      return { '#contact-form': withForm ? form : null, '#form-note': note, '.footer-bottom > div': footer }[selector] || null;
    },
    querySelectorAll: selector => selector === 'a[href^="tel:"]' ? [link] : [],
    createElement: tag => element(tag),
  };
  const context = { window, document, location, localStorage: local, sessionStorage: session, URL, URLSearchParams,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    setTimeout() {}, console: { error() {} },
    FormData: class { get(key) { const f = fields.find(x => x.name === key); return f?.type === 'checkbox' ? f.checked ? 'on' : null : f?.value; } },
    fetch: async (url, options) => {
      assert.equal(url, '/api/contact'); calls.push(JSON.parse(options.body));
      return fetchResult ? fetchResult() : { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
  };
  vm.runInNewContext(browserSource, context, { filename: 'js/script.js' });
  const handlers = el => Object.fromEntries(Object.entries(el.events).map(([key]) => [key, event => el.trigger(key, event)]));
  return { calls, events, gtagCalls, form, phoneField, phoneEvents: handlers(phoneField), service,
    serviceEvents: handlers(service), cityField, messageField, messageHelp, nameField, emailField, rgpdField,
    submit, honeypot, note, location, local, session, document, window,
    send: () => form.trigger('submit', { preventDefault() {} }), call: () => link.trigger('click'),
    chooseConsent(accept) {
      if (!document.querySelector('.consent-banner')) footer.children.find(x => x.className === 'consent-manage').trigger('click');
      const banner = document.querySelector('.consent-banner');
      banner.trigger('click', { target: { closest: () => ({ dataset: { consent: accept ? 'accept' : 'deny' } }) } });
    },
  };
}

const validPhones = [
  ['06 12 34 56 78', '0612345678'], ['+33 6 12 34 56 78', '+33612345678'],
  ['0033 (0)6 12 34 56 78', '+33612345678'], ['+33 (0)6.12.34.56.78', '+33612345678'],
  ['+41 79 123 45 67', '+41791234567'], ['0041 (0)79 123 45 67', '+41791234567'],
  ['079 123 45 67', '0791234567'], ['+44 20 7946 0123', '+442079460123'],
  ['+1 (202) 555-0123', '+12025550123'], ['+352 621 123 456', '+352621123456'],
];
for (const [phone, expected] of validPhones) {
  const response = await request({ ...valid(), phone });
  assert.equal(response.statusCode, 200, `API accepts ${phone}`);
  assert.equal(forwarded.at(-1).phone, expected);
  const page = browser({ phone });
  await page.send();
  assert.equal(page.calls.length, 1, `browser accepts ${phone}`);
}
const invalidPhones = ['abc0612345678', '06 12', '++33612345678', '+33 1234', '+41 12345',
  '12345678901234567890', '06 12 34 56 78 ext 9', '+1 202 555 0123\n123', '06/12/34/56/78'];
for (const phone of invalidPhones) {
  const response = await request({ ...valid(), phone });
  assert.equal(response.statusCode, 400, `API rejects ${JSON.stringify(phone)}`);
  assert.equal(response.body.details, 'invalid_phone');
  const page = browser({ phone });
  await page.send();
  assert.equal(page.calls.length, 0, `browser rejects ${JSON.stringify(phone)}`);
  assert.equal(page.phoneField.focused, true);
  assert.equal(page.phoneField.getAttribute('aria-invalid'), 'true');
}

assert.equal((await request('{broken')).body.details, 'invalid_json');
assert.equal((await request([])).body.details, 'missing_body');
assert.equal((await request({ ...valid(), rgpd: 'false' })).body.details, 'consent_required');
assert.equal((await request({ ...valid(), name: '' })).body.details, 'invalid_name');
assert.equal((await request({ ...valid(), message: 'short' })).body.details, 'invalid_message');
assert.equal((await request({ ...valid(), phone: '', email: '' })).body.details, 'phone_or_email_required');
assert.equal((await request({ ...valid(), email: '' })).statusCode, 200, 'email may be omitted when telephone is valid');
assert.equal((await request({ ...valid(), email: 'no-mail' })).body.details, 'invalid_email');
const get = await request(null, { method: 'GET' });
assert.equal(get.statusCode, 405);
assert.equal(get.headers.Allow, 'POST');
const beforeHoneypot = forwarded.length;
assert.equal((await request({ website: 'bot.invalid' })).statusCode, 200);
assert.equal(forwarded.length, beforeHoneypot, 'honeypot never forwarded');

assert.equal((await request({ ...valid(), phone: 'bad' }, { ip: 'correction' })).statusCode, 400);
assert.equal((await request(valid(), { ip: 'correction' })).statusCode, 200, 'typo correction is not rate limited');
const limited = await request(valid(), { ip: 'correction' });
assert.equal(limited.statusCode, 429);
assert.equal(limited.headers['Retry-After'], '30');

await request({ ...valid(), attribution: {
  page: '/contact', referrer_origin: 'https://www.google.com/search?q=private#details',
  utm_source: 'google', utm_medium: 'organic', utm_campaign: 'toitures_2026',
  utm_content: 'should-not-forward', email: 'private@example.invalid',
} });
assert.deepEqual(forwarded.at(-1).attribution, {
  page: '/contact', referrer_origin: 'https://www.google.com',
  utm_source: 'google', utm_medium: 'organic', utm_campaign: 'toitures_2026',
});
await request({ ...valid(), attribution: {
  page: '/contact?email=private@example.invalid', referrer_origin: 'javascript:alert(1)',
  utm_source: 'private@example.invalid', utm_medium: 'https://private.invalid', utm_campaign: 'phone_0612345678',
} });
assert.deepEqual(forwarded.at(-1).attribution, {});
await request({ ...valid(), attribution: { source_page: '/services/nettoyage-toiture' } });
assert.deepEqual(forwarded.at(-1).attribution, { source_page: '/services/nettoyage-toiture' });
for (const source_page of ['/services/private@example.invalid', '/villes/publier?email=private', '/merci', '/unknown', 'https://private.invalid']) {
  await request({ ...valid(), attribution: { source_page } });
  assert.deepEqual(forwarded.at(-1).attribution, {}, 'only known public source paths are forwarded');
}

const originalConsoleError = console.error;
console.error = () => {};
upstream = async () => ({ ok: false, status: 503 });
assert.equal((await request(valid())).body.error, 'upstream_error');
upstream = async () => { throw new Error('mock network failure'); };
assert.equal((await request(valid())).body.error, 'upstream_unreachable');
console.error = originalConsoleError;

const attributed = browser({ search: '?service=isolation-exterieure&utm_source=google&utm_medium=organic&utm_campaign=toitures_2026&email=private@example.invalid' });
assert.equal(attributed.service.value, 'Isolation thermique extérieure (ITE)');
await attributed.send();
assert.deepEqual(JSON.parse(JSON.stringify(attributed.calls[0].attribution)), {
  page: '/contact', referrer_origin: 'https://www.google.com',
  utm_source: 'google', utm_medium: 'organic', utm_campaign: 'toitures_2026',
});
assert.equal(attributed.events[0].event, 'form_submitted');
assert.equal(attributed.location.href, '/merci');
attributed.call();
assert.equal(attributed.events[1].event, 'tel_click');
assert.deepEqual(Object.keys(attributed.events[1]), ['event', 'page']);
assert.equal(browser({ search: '?service=maconnerie' }).service.value, 'Maçonnerie');
assert.equal(browser({ search: '?service=__proto__' }).service.value, '');
assert.equal(browser({ search: '?service=%3Cscript%3E' }).service.value, '');
const localProject = browser({
  search: '?service=maconnerie&city=evian-les-bains',
  referrer: 'https://www.renovationmetbach.fr/villes/evian-les-bains?private=value#section',
});
assert.equal(localProject.cityField.value, 'Évian-les-Bains');
assert.match(localProject.messageHelp.textContent, /ouvrage à créer/);
await localProject.send();
assert.equal(localProject.calls[0].city, 'Évian-les-Bains');
assert.equal(localProject.calls[0].work_type, 'Maçonnerie');
assert.deepEqual(JSON.parse(JSON.stringify(localProject.calls[0].attribution)), { page: '/contact', source_page: '/villes/evian-les-bains' });
const existingValues = browser({ search: '?service=couverture&city=publier', cityValue: 'Autre commune', serviceValue: 'Maçonnerie' });
assert.equal(existingValues.cityField.value, 'Autre commune', 'do not overwrite visitor/autofill city');
assert.equal(existingValues.service.value, 'Maçonnerie', 'do not overwrite visitor/autofill service');
for (const city of ['__proto__', 'constructor', '%3Cscript%3E', 'private@example.invalid']) {
  assert.equal(browser({ search: `?city=${city}` }).cityField.value, '', 'ignore unknown city parameters');
}
const cleaning = browser({ search: '?service=couverture&project=nettoyage-toiture&city=publier' });
assert.match(cleaning.messageHelp.textContent, /Pour le nettoyage/);
assert.equal(cleaning.cityField.value, 'Publier / Amphion-les-Bains');
assert.equal(cleaning.messageField.value, 'Demande de test locale sans aucun appel réel.', 'hints never change the visitor message');
const cleaningSubmission = browser({ search: '?service=couverture&project=nettoyage-toiture' });
await cleaningSubmission.send();
assert.equal(cleaningSubmission.calls[0].work_type, 'Nettoyage et démoussage de toiture');
assert.equal(cleaningSubmission.calls[0].message, 'Demande de test locale sans aucun appel réel.');
cleaning.service.value = 'Maçonnerie';
cleaning.serviceEvents.change();
assert.match(cleaning.messageHelp.textContent, /ouvrage à créer/);
assert.doesNotMatch(cleaning.messageHelp.textContent, /nettoyage/);
await cleaning.send();
assert.equal(cleaning.calls[0].work_type, 'Maçonnerie', 'a visitor changing trade must not keep the cleaning label');
for (const project of ['__proto__', '%3Cscript%3E', 'other']) {
  const unknownProject = browser({ search: `?service=couverture&project=${project}` });
  await unknownProject.send();
  assert.equal(unknownProject.calls[0].work_type, 'Couverture');
}
cleaning.service.value = 'Petits travaux';
cleaning.serviceEvents.change();
assert.equal(cleaning.messageField.placeholder, 'Votre projet');
assert.equal(cleaning.messageHelp.textContent, '20 à 2 000 caractères.');
const unknownReferrer = browser({ referrer: 'https://www.renovationmetbach.fr/private/customer-name' });
await unknownReferrer.send();
assert.deepEqual(JSON.parse(JSON.stringify(unknownReferrer.calls[0].attribution)), { page: '/contact' });

for (const fetchResult of [
  async () => ({ ok: true, status: 200, json: async () => ({}) }),
  async () => ({ ok: false, status: 502, json: async () => ({ error: 'upstream_error' }) }),
  async () => { throw new Error('mock offline'); },
]) {
  const page = browser({ fetchResult });
  await page.send();
  assert.equal(page.events.length, 0, 'failed/unconfirmed submission is not a conversion');
  assert.equal(page.location.href, '/contact');
  assert.equal(page.submit.disabled, false, 'retry remains available');
  assert.equal(page.form.busy, false);
}
let finish;
const double = browser({ fetchResult: () => new Promise(resolve => { finish = resolve; }) });
const first = double.send();
await double.send();
assert.equal(double.calls.length, 1, 'duplicate submission blocked while pending');
finish({ ok: true, status: 200, json: async () => ({ ok: true }) });
await first;
const bot = browser();
bot.honeypot.value = 'bot.invalid';
await bot.send();
assert.equal(bot.calls.length, 0);
assert.equal(bot.events.length, 0);

// Current form requirements are exercised before any request or success event.
for (const options of [{ phone: '' }, { email: 'invalid' }, { name: 'x' }, { message: 'short' }, { consent: false }, { serviceValue: '' }]) {
  const page = browser(options);
  await page.send();
  assert.equal(page.calls.length, 0, 'invalid required field must not send');
  assert.equal(page.events.length, 0, 'invalid form must not count a lead');
  assert.match(page.note.textContent, /Vérifiez/);
}

const cleaningExplicit = browser({ search: '?service=nettoyage-toiture' });
assert.equal(cleaningExplicit.service.value, 'Nettoyage et démoussage de toiture');
await cleaningExplicit.send();
assert.equal(cleaningExplicit.calls[0].work_type, 'Nettoyage et démoussage de toiture');
const cleaningLegacy = browser({ search: '?service=couverture&project=nettoyage-toiture', legacyOptions: true });
await cleaningLegacy.send();
assert.equal(cleaningLegacy.calls[0].work_type, 'Couverture — nettoyage et démoussage de toiture', 'old HTML remains compatible');
const cleaningChanged = browser({ search: '?service=couverture&project=nettoyage-toiture' });
cleaningChanged.service.value = 'Couverture';
await cleaningChanged.send();
assert.equal(cleaningChanged.calls[0].work_type, 'Couverture', 'visitor choice overrides migrated cleaning context');

upstream = async () => ({ ok: true, status: 200 });
for (const work_type of ['Nettoyage et démoussage de toiture', 'Couverture — nettoyage et démoussage de toiture', 'Plusieurs services / projet global']) {
  assert.equal((await request({ ...valid(), work_type })).statusCode, 200);
}
for (const work_type of ['', 'unsupported', '__proto__']) {
  assert.equal((await request({ ...valid(), work_type })).body.details, 'invalid_work_type');
}
for (const path of ['/contact', '/villes', '/conseils', '/conseils/fuite-toiture-que-faire', '/conseils/nettoyer-reparer-ou-refaire-toiture', '/conseils/comparer-devis-isolation-exterieure']) {
  await request({ ...valid(), attribution: { source_page: path, landing_page: path } });
  assert.deepEqual(forwarded.at(-1).attribution, { source_page: path, landing_page: path });
}
for (const landing_page of ['/contact?name=private', '/conseils/private-person', '/merci', ['/contact'], 'https://private.invalid']) {
  await request({ ...valid(), attribution: { landing_page } });
  assert.deepEqual(forwarded.at(-1).attribution, {}, 'reject unknown or non-string landing pages');
}

const consentKey = 'metbach-consent', attributionKey = 'metbach-attribution';
const allowAnalytics = () => memoryStorage({ [consentKey]: JSON.stringify({ analytics: true, at: Date.now() }) });
const campaignSearch = '?utm_source=google&utm_medium=cpc&utm_campaign=toiture_chablais&email=private@example.invalid&gclid=not-retained';
const local = allowAnalytics(), session = memoryStorage();
browser({ pathname: '/services/couverture', search: campaignSearch, withForm: false, local, session });
const contact = browser({ local, session, referrer: 'https://www.renovationmetbach.fr/services/couverture', search: '?service=couverture' });
await contact.send();
assert.deepEqual(contact.calls[0].attribution, {
  landing_page: '/services/couverture', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'toiture_chablais',
  referrer_origin: 'https://www.google.com', page: '/contact', source_page: '/services/couverture',
});
assert.doesNotMatch(session.getItem(attributionKey), /private|gclid/);
assert.deepEqual(JSON.parse(JSON.stringify(contact.events)), [{ event: 'form_submitted', page: '/contact' }], 'accepted enquiry counted once, no attribution or PII added to analytics event');

// No analytics choice: no attribution stored or recovered after navigation.
const withoutConsent = memoryStorage(), noSession = memoryStorage();
browser({ pathname: '/services/couverture', search: campaignSearch, withForm: false, local: withoutConsent, session: noSession });
assert.deepEqual(noSession.writes, []);
const noConsentContact = browser({ local: withoutConsent, session: noSession, referrer: 'https://www.renovationmetbach.fr/services/couverture' });
await noConsentContact.send();
assert.deepEqual(noConsentContact.calls[0].attribution, { page: '/contact', source_page: '/services/couverture' });

// Consent granted on the landing page captures it then; withdrawal clears it.
const grantLocal = memoryStorage(), grantSession = memoryStorage();
const landing = browser({ pathname: '/services/nettoyage-toiture', search: campaignSearch, withForm: false, local: grantLocal, session: grantSession });
assert.equal(grantSession.getItem(attributionKey), null);
landing.chooseConsent(true);
assert.equal(JSON.parse(grantSession.getItem(attributionKey)).entry.landing_page, '/services/nettoyage-toiture');
landing.chooseConsent(false);
assert.equal(grantSession.getItem(attributionKey), null);
assert.equal(JSON.parse(grantLocal.getItem(consentKey)).analytics, false);
assert.equal(landing.document.querySelector('.consent-banner'), null);

const crossTab = browser({ local: allowAnalytics(), session: memoryStorage(), search: campaignSearch });
crossTab.local.setItem(consentKey, JSON.stringify({ analytics: false, at: Date.now() }));
crossTab.window.dispatchEvent({ type: 'storage', key: consentKey });
assert.equal(crossTab.session.getItem(attributionKey), null, 'withdrawal in another tab clears this tab attribution');

for (const choice of [{ analytics: true, at: Date.now() + 60000 }, { analytics: true, at: Date.now() - 15552000000 }, { analytics: true, at: 'today' }, { analytics: 'true', at: Date.now() }]) {
  const page = browser({ local: memoryStorage({ [consentKey]: JSON.stringify(choice) }), search: campaignSearch });
  assert.equal(page.session.getItem(attributionKey), null, 'invalid/expired consent never authorizes persistence');
  assert.ok(page.document.querySelector('.consent-banner'), 'invalid/expired consent offers a new choice');
}
for (const saved of [
  { at: Date.now() - 31 * 60 * 1000, entry: { landing_page: '/services/couverture', utm_source: 'old' } },
  { at: Date.now() + 60000, entry: { landing_page: '/services/couverture', utm_source: 'future' } },
  { at: Date.now(), entry: { landing_page: '/conseils/private-person', utm_source: 'private' } },
]) {
  const page = browser({ local: allowAnalytics(), session: memoryStorage({ [attributionKey]: JSON.stringify(saved) }), referrer: '' });
  await page.send();
  assert.deepEqual(page.calls[0].attribution, { landing_page: '/contact', page: '/contact' }, 'expired, future or unsafe stored entry discarded');
}

// A partial campaign must not inherit stale medium/campaign, even if source matches.
const partialCampaign = browser({ local, session, pathname: '/services/bardage', withForm: false, referrer: '', search: '?utm_source=google' });
assert.deepEqual(JSON.parse(partialCampaign.session.getItem(attributionKey)).entry, { landing_page: '/services/bardage', utm_source: 'google' });

// New campaign replaces the whole attribution rather than inheriting old UTM.
const replacement = browser({ local, session, pathname: '/services/bardage', withForm: false, referrer: '', search: '?utm_source=partner' });
assert.deepEqual(JSON.parse(replacement.session.getItem(attributionKey)).entry, { landing_page: '/services/bardage', utm_source: 'partner' });

// Storage unavailable: enquiries and the in-page consent choice still function.
const unavailable = { getItem() { throw new Error('blocked storage'); }, setItem() { throw new Error('blocked storage'); }, removeItem() { throw new Error('blocked storage'); } };
const blockedStorage = browser({ local: unavailable, session: unavailable, search: campaignSearch });
blockedStorage.chooseConsent(true);
await blockedStorage.send();
assert.equal(blockedStorage.calls.length, 1);
assert.equal(blockedStorage.location.href, '/merci');

const merci = browser({ pathname: '/merci', withForm: false });
merci.chooseConsent(false);
merci.call();
assert.equal(merci.events.filter(x => x.event === 'tel_click').length, 1);
assert.equal(merci.events.filter(x => x.event === 'form_submitted').length, 0, 'visiting merci is not a lead event');
const merciHtml = await fs.readFile(new URL('merci/index.html', root), 'utf8');
assert.match(merciHtml, /<script src="\/js\/script\.js" defer><\/script>/);
assert.doesNotMatch(merciHtml, /48 heures|48 h|vient de m.arriver/);

console.log('Contact checks passed: validation, explicit/legacy cleaning, accepted-only events, anti-spam, attribution consent/persistence/expiry/withdrawal, allowlists and storage failures. All requests mocked; no real enquiry.');
