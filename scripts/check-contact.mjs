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

function browser({ search = '', phone = '06 12 34 56 78', referrer = 'https://www.google.com/search?q=private', fetchResult } = {}) {
  const formEvents = {}, phoneEvents = {}, linkEvents = {};
  const calls = [], events = [];
  const phoneField = {
    value: phone, error: '',
    addEventListener(name, callback) { phoneEvents[name] = callback; },
    setCustomValidity(message) { this.error = message; },
  };
  const services = ['Couverture', 'Bardage', 'Maçonnerie', 'Isolation thermique extérieure (ITE)'];
  const service = { value: '', options: services.map(value => ({ value })) };
  const submit = { disabled: false, style: {} };
  const honeypot = { value: '' };
  const note = { textContent: '', classList: { add() {} }, setAttribute() {} };
  const form = {
    busy: false, reported: false,
    querySelector(selector) {
      return { '[name="tel"]': phoneField, '[name="service"]': service,
        'button[type="submit"]': submit, '[name="website"]': honeypot,
        '#rgpd:checked': {} }[selector] || null;
    },
    addEventListener(name, callback) { formEvents[name] = callback; },
    setAttribute() { this.busy = true; }, removeAttribute() { this.busy = false; },
    checkValidity() { return !phoneField.error; }, reportValidity() { this.reported = true; },
  };
  const location = { pathname: '/contact', origin: 'https://www.renovationmetbach.fr', search, hash: '', href: '/contact' };
  const window = {
    matchMedia: () => ({ matches: true }), addEventListener() {}, innerHeight: 667,
    dataLayer: events,
  };
  const document = {
    referrer, documentElement: { clientHeight: 667 }, addEventListener() {},
    querySelector(selector) { return { '#contact-form': form, '#form-note': note }[selector] || null; },
    querySelectorAll(selector) {
      return selector === 'a[href^="tel:"]' ? [{ addEventListener(name, callback) { linkEvents[name] = callback; } }] : [];
    },
  };
  const context = { window, document, location, URL, URLSearchParams, setTimeout() {}, console: { error() {} },
    FormData: class {
      get(key) { return { nom: 'Test local', tel: phoneField.value, email: 'test@example.invalid',
        service: service.value || 'Couverture', city: 'Publier',
        message: 'Demande de test locale sans aucun appel réel.', website: honeypot.value, rgpd: 'on' }[key]; }
    },
    fetch: async (url, options) => {
      assert.equal(url, '/api/contact');
      calls.push(JSON.parse(options.body));
      return fetchResult ? fetchResult() : { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
  };
  vm.runInNewContext(browserSource, context, { filename: 'js/script.js' });
  return { calls, events, form, phoneField, phoneEvents, service, submit, honeypot, note, location,
    send: () => formEvents.submit({ preventDefault() {} }),
    call: () => linkEvents.click(),
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
  assert.equal(page.form.reported, true);
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
console.log('Contact checks passed: FR/CH/international, validation, attribution filtering, service preselection, confirmed conversions, anti-spam and failures. No network calls.');
