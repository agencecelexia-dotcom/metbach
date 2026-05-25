// /api/contact.js
// Vercel serverless function that proxies form submissions to the Celexia CRM.
//
// Why a server-side proxy? The Supabase API key MUST stay server-side.
// The browser bundle never sees `INBOUND_API_KEY` — only this function reads it
// from the Vercel environment variables.
//
// Env vars required on Vercel (Settings → Environment Variables, "Server"):
//   INBOUND_API_KEY = <the key the Celexia team gave>
//
// The endpoint is reachable at:
//   POST https://renovation-metbach.fr/api/contact
//
// Expected body (application/json):
//   { name, phone, email, work_type, city, message, website (honeypot, must be empty), rgpd }
//
// Responses :
//   200 { ok: true, lead_id }         — created in CRM
//   400 { error: "validation_failed", details }
//   401 { error: "server_misconfigured" } — INBOUND_API_KEY missing on Vercel
//   405 { error: "method_not_allowed" }
//   429 { error: "rate_limited" }     — too many submissions from same IP
//   502 { error: "upstream_error", status, body }
//   500 { error: "internal_error" }

const SUPABASE_ENDPOINT = "https://zsbrhftzjqqqbwbboyqe.supabase.co/functions/v1/inbound-lead";

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

function isValidPhone(phone) {
  // Strip everything except digits and "+". Need at least 9 digits.
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 9 && digits.length <= 20;
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
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "validation_failed", details: "missing_body" });
  }

  // Honeypot: if "website" field is filled, silently accept but DO NOT forward.
  // Bots fill all fields; humans never see this field (it's CSS-hidden client-side).
  if (clean(body.website, 200) !== "") {
    return res.status(200).json({ ok: true, lead_id: "honeypot" });
  }

  // RGPD consent must be present
  if (!body.rgpd) {
    return res.status(400).json({ error: "validation_failed", details: "consent_required" });
  }

  // Rate limiting per IP
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "rate_limited", retry_after_s: 30 });
  }

  // Clean + validate fields
  const name      = clean(body.name, 200);
  const phone     = clean(body.phone, 200);
  const email     = clean(body.email, 200);
  const work_type = clean(body.work_type, 200);
  const city      = clean(body.city, 200);
  const message   = clean(body.message, 5000);

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

  // Server-side API key — never exposed to the browser
  const apiKey = process.env.INBOUND_API_KEY;
  if (!apiKey) {
    console.error("[contact] INBOUND_API_KEY missing from environment");
    return res.status(401).json({ error: "server_misconfigured" });
  }

  // Forward to Celexia CRM
  const payload = { name, phone, email, work_type, city, message };

  let upstreamRes;
  try {
    upstreamRes = await fetch(SUPABASE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[contact] upstream fetch failed:", err);
    return res.status(502).json({ error: "upstream_unreachable" });
  }

  const text = await upstreamRes.text();
  let upstreamBody;
  try { upstreamBody = JSON.parse(text); } catch { upstreamBody = { raw: text }; }

  if (upstreamRes.status === 201) {
    return res.status(200).json({ ok: true, lead_id: upstreamBody.lead_id });
  }

  if (upstreamRes.status === 401) {
    console.error("[contact] upstream rejected the API key");
    return res.status(401).json({ error: "server_misconfigured" });
  }

  if (upstreamRes.status === 400) {
    return res.status(400).json({ error: "validation_failed", details: upstreamBody.details || "upstream_validation" });
  }

  console.error("[contact] upstream error:", upstreamRes.status, upstreamBody);
  return res.status(502).json({ error: "upstream_error", status: upstreamRes.status });
}
