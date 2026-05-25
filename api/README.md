# /api — Vercel serverless functions

## `/api/contact`

Proxy entre le formulaire de contact du site et le CRM **Celexia** (Supabase
edge function `inbound-lead`).

### Setup Vercel (à faire UNE fois)

1. Va sur https://vercel.com/dashboard → projet `metbach`
2. **Settings** → **Environment Variables**
3. Crée une variable :
   - **Name** : `INBOUND_API_KEY`
   - **Value** : `<la clé fournie par l'équipe Celexia>`
   - **Environments** : coche **Production** et **Preview** (pas Development à moins de tester en local)
   - ⚠️ **Ne PAS préfixer par `NEXT_PUBLIC_`** — la clé doit rester strictement côté serveur
4. **Save**
5. Redéploie : **Deployments** → bouton **…** sur le dernier deploy → **Redeploy**

### Test endpoints

**Succès attendu (201 → 200 côté site) :**

```bash
curl -X POST https://renovation-metbach.fr/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Curl",
    "phone":"0612345678",
    "email":"test@example.com",
    "work_type":"Bardage",
    "city":"Thonon",
    "message":"Test de soumission depuis curl, environ 30 caractères.",
    "rgpd":true
  }'
```

Doit renvoyer `{"ok":true,"lead_id":"<uuid>"}`.

**Sans phone ni email (400) :**

```bash
curl -X POST https://renovation-metbach.fr/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","rgpd":true,"message":"abcdefghijklmnopqrst"}'
```

→ `{"error":"validation_failed","details":"phone_or_email_required"}`

**Honeypot rempli (200 silencieux, drop) :**

```bash
curl -X POST https://renovation-metbach.fr/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","phone":"0612345678","website":"http://spam.example","rgpd":true,"message":"abcdefghijklmnopqrst"}'
```

→ `{"ok":true,"lead_id":"honeypot"}` (mais rien n'est forwardé au CRM)

**Rate-limit (429) :**

Envoie 2 requêtes valides en moins de 30 secondes depuis la même IP → la 2e
renvoie `{"error":"rate_limited","retry_after_s":30}`.

**GET au lieu de POST (405) :**

```bash
curl https://renovation-metbach.fr/api/contact
```

→ `{"error":"method_not_allowed"}`

### Sécurité

- ✅ La clé API reste **server-side** (env var Vercel, jamais dans le bundle JS)
- ✅ **Honeypot** invisible côté CSS (`<input name="website">` dans `.hp-field`)
- ✅ **Rate-limit** par IP (1 soumission / 30 s)
- ✅ **Validation** stricte avant forward : email regex, phone ≥ 9 chiffres, ≥ 1 des 2 requis
- ✅ **RGPD** : case obligatoire vérifiée côté serveur, pas seulement client
- ✅ **Cache** : `no-store` sur `/api/*` (configuré dans `vercel.json`)
- ✅ **Tracking** : `dataLayer.push({event:'form_submitted'})` sans PII

### Données envoyées au CRM

Le serveur Vercel ne stocke RIEN. Il fait juste le proxy vers Supabase. La
seule source de vérité est le CRM Celexia.

```json
POST https://zsbrhftzjqqqbwbboyqe.supabase.co/functions/v1/inbound-lead
Headers:
  Content-Type: application/json
  X-API-Key: <INBOUND_API_KEY>
Body:
  { "name": "...", "phone": "...", "email": "...", "work_type": "...", "city": "...", "message": "..." }
```

### Codes retournés au client

| Code | Signification | UX |
|---|---|---|
| 200 | Lead créé dans le CRM | Redirection vers `/merci/` |
| 400 | Champs invalides | Affichage du détail dans le formulaire |
| 401 | `INBOUND_API_KEY` manquante côté serveur Vercel | Erreur générique côté client |
| 405 | Méthode non POST | Erreur générique |
| 429 | Rate-limit (trop de soumissions depuis la même IP) | Message "Réessayez dans 30 s" |
| 502 | CRM Celexia injoignable | Message + lien tel/mailto en repli |
