// /api/avis.js
// Google reviews of the Rénovation Metbach listing, for the reviews widget
// (js/script.js, [data-google-reviews]). The browser never sees the API key.
//
// Env vars (Vercel → Settings → Environment Variables):
//   GOOGLE_PLACES_API_KEY = key restricted to "Places API (New)"        (required for live data)
//   GOOGLE_PLACE_ID       = ChIJ…, id of the Google listing              (optional: found by text
//                           search near the Publier coordinates when missing; set it to save a call)
//
// GET https://www.renovationmetbach.fr/api/avis
//   200 { source: "google", rating, count, mapsUrl, writeReviewUrl, reviews: [...] }
//   200 { source: "snapshot", rating, count, asOf, mapsUrl, reviews: [] }   — no key or Google error
//
// The Vercel CDN keeps a response 6 hours (then serves it stale while it
// refreshes), so Google is called at most a few times a day per region: well
// inside the Places API monthly free usage. Nothing is stored server side.
//
// Display rules (CLAUDE.md): reviews shown as text with author attribution and
// a link to the listing; no Review/AggregateRating markup. Reviews whose author
// bears the owner's family name are left out of the widget.

const MAPS_URL = 'https://maps.app.goo.gl/mu6Nbfsgyvrt49AM9';
const LOCATION = { latitude: 46.400383, longitude: 6.520969 };
// Last figures read on the listing; shown only while live data is unavailable.
const SNAPSHOT = { rating: 5, count: 14, asOf: '2026-11-24' };
const EXCLUDED_AUTHOR = /metbach/i;
const TIMEOUT_MS = 6000;

let cachedPlaceId = null;

async function google(url, key, fieldMask, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (!response.ok) throw new Error(`Google HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function placeId(key) {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  if (cachedPlaceId) return cachedPlaceId;
  const data = await google('https://places.googleapis.com/v1/places:searchText', key, 'places.id,places.displayName,places.location', {
    method: 'POST',
    body: JSON.stringify({
      textQuery: 'Rénovation Metbach, 862 route de la Dranse, 74500 Publier',
      languageCode: 'fr',
      locationBias: { circle: { center: LOCATION, radius: 500 } },
    }),
  });
  const match = (data.places || []).find(p => /metbach/i.test(p.displayName?.text || '')
    && Math.abs(p.location.latitude - LOCATION.latitude) < 0.01
    && Math.abs(p.location.longitude - LOCATION.longitude) < 0.01);
  if (!match) throw new Error('Listing not found by text search');
  console.log(`avis: GOOGLE_PLACE_ID can be set to ${match.id}`);
  cachedPlaceId = match.id;
  return match.id;
}

function clean(review) {
  const text = (review.text?.text || review.originalText?.text || '').trim();
  const author = review.authorAttribution?.displayName || '';
  if (!text || EXCLUDED_AUTHOR.test(author)) return null;
  return {
    author: author || 'Client Google',
    authorUrl: /^https:\/\/www\.google\.com\/maps\//.test(review.authorAttribution?.uri || '') ? review.authorAttribution.uri : null,
    rating: Math.max(1, Math.min(5, Math.round(review.rating || 0))),
    text: text.slice(0, 1200),
    when: review.relativePublishTimeDescription || '',
    publishTime: review.publishTime || null,
  };
}

async function live(key) {
  const id = await placeId(key);
  const place = await google(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=fr`, key,
    'id,rating,userRatingCount,reviews,googleMapsUri');
  if (typeof place.rating !== 'number' || typeof place.userRatingCount !== 'number') throw new Error('No rating in response');
  return {
    source: 'google',
    rating: place.rating,
    count: place.userRatingCount,
    mapsUrl: place.googleMapsUri || MAPS_URL,
    writeReviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id || id)}`,
    reviews: (place.reviews || []).map(clean).filter(Boolean),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  let body;
  let cdn = 'max-age=21600, stale-while-revalidate=86400';
  if (key) {
    try {
      body = await live(key);
    } catch (error) {
      console.error('avis:', error.message);
      cdn = 'max-age=600'; // retry Google in 10 minutes
    }
  }
  if (!body) body = { source: 'snapshot', ...SNAPSHOT, mapsUrl: MAPS_URL, reviews: [] };
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Vercel-CDN-Cache-Control', cdn);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(200).json(body);
}

export { clean, SNAPSHOT };
