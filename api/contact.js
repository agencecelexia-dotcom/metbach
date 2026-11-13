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
//   { name, phone, email, work_type, city, message, website (honeypot, must be empty), rgpd }
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
    return res.status(200).json({ ok: true });
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

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[contact] N8N_WEBHOOK_URL missing from environment");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  const payload = {
    name, phone, email, work_type, city, message,
    source: "renovationmetbach.fr",
    submitted_at: new Date().toISOString(),
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
