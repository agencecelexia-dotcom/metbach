// /api/contact.js
// Vercel serverless function that forwards form submissions to an n8n webhook,
// which then sends an email notification (see /n8n/workflow-devis.json).
//
// Why a server-side proxy? The webhook URL must stay private (anyone who knows
// it could spam the workflow). The browser only ever sees /api/contact.
//
// Env vars (Vercel → Settings → Environment Variables, or .env with `vercel dev`):
//   N8N_WEBHOOK_URL    = https://<your-n8n>/webhook/metbach-devis   (required)
//   N8N_WEBHOOK_SECRET = <random string>                            (optional)
//     → if set, sent as header "X-Webhook-Secret"; configure the n8n Webhook
//       node with Header Auth to reject anything without it.
//
// The endpoint is reachable at:
//   POST https://www.renovationmetbach.fr/api/contact
//
// Expected body (application/json):
//   { name, phone, email, work_type, city, message, website (honeypot), rgpd, attribution? }
//
// Responses :
//   200 { ok: true }                  — forwarded to n8n
//   400 { error: "validation_failed", details }
//   500 { error: "server_misconfigured" } — N8N_WEBHOOK_URL missing
//   405 { error: "method_not_allowed" }
//   429 { error: "rate_limited" }     — too many submissions from same IP
//   502 { error: "upstream_error" | "upstream_unreachable" }

// In-memory rate limiter. Vercel serverless instances are short-lived, so this
// only catches bursts on a warm instance — fine for a small artisan site. For
// stricter limits, plug Vercel KV later.
const RATE_LIMIT_WINDOW_MS = 30_000; // 30 seconds
const recentSubmissions = new Map(); // ip → last submission timestamp

function isRateLimited(ip) {
  const now = Date.now();
  const last = recentSubmissions.get(ip);
  // Garbage collect old entries
  if (recentSubmissions.size > 1000) {
    for (const [k, t] of recentSubmissions) {
      if (now - t > RATE_LIMIT_WINDOW_MS * 4) recentSubmissions.delete(k);
    }
  }
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return true;
  recentSubmissions.set(ip, now);
  return false;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function clean(value, maxLen) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function isValidEmail(email) {
  // Pragmatic: not RFC-perfect, but catches all real typos. The CRM will
  // re-validate downstream.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Keep these format rules aligned with js/script.js. No ownership/assignment
// check is implied; this only rejects malformed contact details.
function normalizePhone(value) {
  if (typeof value !== "string" || value.length > 40 || /[\r\n]/.test(value)) return "";
  const input = value.trim();
  if (!/^[+\d\s().-]+$/.test(input)) return "";
  let phone = input.replace(/[\s().-]/g, "").replace(/^00/, "+");
  if (!/^\+?\d+$/.test(phone)) return "";
  phone = phone.replace(/^(\+(?:33|41))0/, "$1");
  return phone;
}

function isValidPhone(value) {
  const phone = normalizePhone(value);
  if (/^\+(?:33|41)/.test(phone)) return /^\+(?:33|41)[1-9]\d{8}$/.test(phone);
  return /^0[1-9]\d{8}$/.test(phone) || /^\+[1-9]\d{7,14}$/.test(phone);
}

function sanitizeAttribution(value) {
  const result = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  // Enquiry forms are currently on these two public paths only. Never forward
  // a whole URL or an arbitrary path that could contain personal information.
  if (typeof value.page === "string" && /^\/(?:contact)?$/.test(value.page)) result.page = value.page;
  // Only a preceding public page is retained; no private path/query string and
  // no claim that this was the visitor's original acquisition/landing page.
  const publicSourcePath = /^(?:\/|\/(?:services|realisations|a-propos|preparer-travaux|glossaire)|\/services\/(?:couverture|nettoyage-toiture|maconnerie|isolation-exterieure|bardage|petits-travaux|revetement-sol|fondations|amenagement-paysager|clotures|arboriculture)|\/villes\/(?:publier|thonon-les-bains|evian-les-bains|annemasse|douvaine|saint-julien-en-genevois|geneve|nyon|lausanne))$/;
  if (typeof value.source_page === "string" && publicSourcePath.test(value.source_page)) result.source_page = value.source_page;
  if (typeof value.referrer_origin === "string" && value.referrer_origin.length <= 255) {
    try {
      const url = new URL(value.referrer_origin);
      if (/^https?:$/.test(url.protocol) && !["renovationmetbach.fr", "www.renovationmetbach.fr"].includes(url.hostname)) {
        result.referrer_origin = url.origin;
      }
    } catch { /* Invalid origins are simply omitted. */ }
  }
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const item = value[key];
    if (typeof item === "string" && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(item) && !/\d{7}/.test(item)) {
      result[key] = item;
    }
  }
  return result;
}

export default async function handler(req, res) {
  // Only POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Parse JSON body — Vercel parses automatically when content-type is json,
  // but be defensive.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "validation_failed", details: "invalid_json" }); }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "validation_failed", details: "missing_body" });
  }

  // Honeypot: if "website" field is filled, silently accept but DO NOT forward.
  // Bots fill all fields; humans never see this field (it's CSS-hidden client-side).
  if (clean(body.website, 200) !== "") {
    return res.status(200).json({ ok: true });
  }

  // RGPD consent must be present
  if (body.rgpd !== true) {
    return res.status(400).json({ error: "validation_failed", details: "consent_required" });
  }

  // Clean + validate fields
  const name      = clean(body.name, 200);
  const phone     = clean(body.phone, 200);
  const email     = clean(body.email, 200);
  const work_type = clean(body.work_type, 200);
  const city      = clean(body.city, 200);
  const message   = clean(body.message, 5000);

  if (name.length < 2) {
    return res.status(400).json({ error: "validation_failed", details: "invalid_name" });
  }
  if (message.length < 20) {
    return res.status(400).json({ error: "validation_failed", details: "invalid_message" });
  }
  // At least phone OR email
  if (!phone && !email) {
    return res.status(400).json({ error: "validation_failed", details: "phone_or_email_required" });
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: "validation_failed", details: "invalid_email" });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: "validation_failed", details: "invalid_phone" });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[contact] N8N_WEBHOOK_URL missing from environment");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  // Only valid requests use the submission limit. A visitor correcting a typo
  // should not be prevented from sending their enquiry for another 30 seconds.
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.setHeader("Retry-After", "30");
    return res.status(429).json({ error: "rate_limited", retry_after_s: 30 });
  }

  const payload = {
    name, phone: phone ? normalizePhone(phone) : "", email, work_type, city, message,
    source: "renovationmetbach.fr",
    submitted_at: new Date().toISOString(),
    attribution: sanitizeAttribution(body.attribution),
  };

  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;

  let upstreamRes;
  try {
    upstreamRes = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[contact] n8n webhook unreachable:", err);
    return res.status(502).json({ error: "upstream_unreachable" });
  }

  if (upstreamRes.ok) {
    return res.status(200).json({ ok: true });
  }

  console.error("[contact] n8n webhook error:", upstreamRes.status);
  return res.status(502).json({ error: "upstream_error" });
}
