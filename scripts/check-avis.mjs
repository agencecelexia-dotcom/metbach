// Checks /api/avis with Google mocked: snapshot without key, live mapping,
// owner-family reviews left out, text search fallback, Google errors.
// No request leaves the machine.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = await fs.readFile(new URL('api/avis.js', root), 'utf8');
const load = async () => (await import(`data:text/javascript;base64,${Buffer.from(source + `\n//${Math.random()}`).toString('base64')}`)).default;

function call(handler, method = 'GET') {
  return new Promise(resolve => {
    const headers = {};
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      status(code) { this.code = code; return this; },
      json(body) { resolve({ code: this.code, headers, body }); },
    };
    handler({ method, headers: {} }, res);
  });
}

const place = {
  id: 'ChIJtest',
  rating: 4.9,
  userRatingCount: 21,
  googleMapsUri: 'https://maps.google.com/?cid=1',
  reviews: [
    { rating: 5, text: { text: 'Travail soigné sur notre toiture.' }, relativePublishTimeDescription: 'il y a 2 jours', authorAttribution: { displayName: 'Client A', uri: 'https://www.google.com/maps/contrib/1/reviews' } },
    { rating: 5, text: { text: 'Super.' }, authorAttribution: { displayName: 'Jean METBACH', uri: 'https://www.google.com/maps/contrib/2' } },
    { rating: 4, text: { text: '' }, authorAttribution: { displayName: 'Sans texte' } },
    { rating: 5, originalText: { text: 'Réactif.' }, authorAttribution: { displayName: 'Client B', uri: 'javascript:alert(1)' } },
  ],
};
const calls = [];
function mock(responses) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { ok: next.status === 200, status: next.status, json: async () => next.body };
  };
}

// 1. No key: snapshot, cached 6 h.
delete process.env.GOOGLE_PLACES_API_KEY; delete process.env.GOOGLE_PLACE_ID;
let r = await call(await load());
assert.equal(r.code, 200);
assert.equal(r.body.source, 'snapshot');
assert.equal(r.body.count, 14);
assert.deepEqual(r.body.reviews, []);
assert.match(r.headers['vercel-cdn-cache-control'], /max-age=21600/);
assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');

// 2. Key + place id: live data, filtered reviews.
process.env.GOOGLE_PLACES_API_KEY = 'k'; process.env.GOOGLE_PLACE_ID = 'ChIJtest';
mock([{ status: 200, body: place }]);
r = await call(await load());
assert.equal(r.body.source, 'google');
assert.equal(r.body.rating, 4.9);
assert.equal(r.body.count, 21);
assert.equal(r.body.writeReviewUrl, 'https://search.google.com/local/writereview?placeid=ChIJtest');
assert.deepEqual(r.body.reviews.map(x => x.author), ['Client A', 'Client B']);
assert.equal(r.body.reviews[1].authorUrl, null, 'non-Google author URL dropped');
assert.equal(calls.at(-1).init.headers['X-Goog-Api-Key'], 'k');
assert.match(calls.at(-1).url, /places\/ChIJtest\?languageCode=fr$/);

// 3. No place id: text search near Publier first.
delete process.env.GOOGLE_PLACE_ID;
mock([
  { status: 200, body: { places: [{ id: 'other', displayName: { text: 'Metbach' }, location: { latitude: 44.8, longitude: -0.6 } }, { id: 'ChIJtest', displayName: { text: 'Rénovation Metbach' }, location: { latitude: 46.4004, longitude: 6.521 } }] } },
  { status: 200, body: place },
]);
r = await call(await load());
assert.equal(r.body.source, 'google');
assert.match(calls.at(-1).url, /places\/ChIJtest/);

// 4. Google error: snapshot, short CDN cache.
process.env.GOOGLE_PLACE_ID = 'ChIJtest';
mock([{ status: 403, body: {} }]);
const quiet = console.error; console.error = () => {};
r = await call(await load());
console.error = quiet;
assert.equal(r.body.source, 'snapshot');
assert.equal(r.headers['vercel-cdn-cache-control'], 'max-age=600');

// 5. Other methods refused.
r = await call(await load(), 'POST');
assert.equal(r.code, 405);

console.log('Avis checks passed: snapshot, live mapping, owner-family filter, text search, Google errors. Google mocked.');
