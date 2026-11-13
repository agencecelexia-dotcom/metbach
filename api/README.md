# /api — Vercel serverless functions

## `/api/contact`

Formulaire de devis → **webhook n8n** → **email** de notification.

```
Navigateur ──POST /api/contact──▶ Vercel (valide, anti-spam) ──▶ webhook n8n ──▶ email
```

Rien n'est stocké côté site. L'URL du webhook reste côté serveur.

### Mise en place

1. **n8n** : Workflows → Import from file → `n8n/workflow-devis.json`
   (fichier local, non versionné). Dans le nœud **Envoyer email interne**, choisir
   le credential Gmail (OAuth2). Expéditeur et destinataire : agence.celexia@gmail.com (le credential Gmail doit être ce compte).
   Activer le workflow (**Active**) puis copier l'URL **Production** du nœud
   Webhook (`https://…/webhook/metbach-devis`, pas `webhook-test`).
2. **Local** : coller l'URL dans `.env` (`N8N_WEBHOOK_URL=`). Lancer `vercel dev`.
3. **Vercel** : Settings → Environment Variables → ajouter `N8N_WEBHOOK_URL`
   (Production + Preview), puis Redeploy. Les `.env` ne sont pas lus en prod.
4. *(Optionnel)* Secret : définir `N8N_WEBHOOK_SECRET` côté Vercel, et dans n8n
   mettre le nœud Webhook en Authentication = Header Auth (nom `X-Webhook-Secret`,
   même valeur).

### Test

```bash
curl -X POST https://www.renovationmetbach.fr/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Curl","phone":"0612345678","email":"test@example.com","work_type":"Bardage","city":"Thonon","message":"Test de soumission depuis curl, plus de 20 caractères.","rgpd":true}'
```

→ `{"ok":true}` et un email reçu.

### Protections

- Honeypot (`website` rempli → 200 silencieux, rien n'est transmis)
- Rate-limit par IP : 1 envoi / 30 s (en mémoire, best effort)
- Validation : téléphone ≥ 9 chiffres ou email valide, consentement RGPD obligatoire
- `no-store` sur `/api/*` (`vercel.json`)

### Codes retournés

| Code | Signification | UX |
|---|---|---|
| 200 | Transmis à n8n | Redirection `/merci/` |
| 400 | Champs invalides / RGPD manquant | Détail affiché |
| 405 | Méthode ≠ POST | — |
| 429 | Trop de demandes | « Réessayez dans 30 s » |
| 500 | `N8N_WEBHOOK_URL` absente | Message + téléphone |
| 502 | n8n injoignable ou en erreur | Message + téléphone |
