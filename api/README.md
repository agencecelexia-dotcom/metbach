# Formulaire de devis

`POST /api/contact` valide une demande et la transmet au webhook n8n existant, qui envoie la
notification interne. L’URL du webhook et son secret restent côté serveur.

## Configuration

- `N8N_WEBHOOK_URL` : URL Production du webhook n8n, configurée dans Vercel.
- `N8N_WEBHOOK_SECRET` : secret facultatif transmis dans `X-Webhook-Secret` si le workflow le vérifie.
- L’export n8n local reste hors versionnement. Préserver le workflow et ses identifiants existants.
- Un aperçu purement statique n’exécute pas cette API ; utiliser Vercel pour une intégration complète.

## Données

Le corps JSON contient `name`, `phone`, `email`, `work_type`, `city`, `message`, `website`
(honeypot vide), `rgpd: true` et éventuellement `attribution`.

Le navigateur demande nom, téléphone, métier et message ; l’email est facultatif. L’API vérifie
un nom d’au moins 2 caractères, un message d’au moins 20 caractères, au moins un téléphone ou email
valide et un consentement explicitement booléen. Les numéros FR/CH et internationaux sont validés
sans prétendre vérifier leur attribution ; espaces, parenthèses, tirets et préfixe00 sont acceptés.
Le numéro transmis est normalisé pour faciliter le rappel.

L’attribution autorise seulement le chemin du formulaire (`/` ou `/contact`), l’origine HTTP(S)
du référent et trois paramètres de campagne filtrés : `utm_source`, `utm_medium`, `utm_campaign`.
Les URL complètes, emails et valeurs arbitraires sont rejetés. Aucun cookie ni stockage navigateur.
L’attribution n’est pas conservée lors de la navigation entre pages. Elle est transmise avec la
demande consentie ; le modèle d’email n8n peut l’ignorer tant qu’il n’est pas adapté.

## Résultat et protections

| HTTP | Résultat |
|---|---|
| 200 + `ok: true` | Demande transmise au webhook, puis redirection client `/merci` |
| 400 | Données ou consentement invalides ; message exploitable côté formulaire |
| 405 | Méthode autre que POST refusée |
| 429 | Limite d’envoi, avec `Retry-After: 30` |
| 500 | Configuration serveur manquante |
| 502 | Webhook inaccessible ou en erreur |

Le honeypot confirme silencieusement sans transmettre. La limite mémoire par IP (un envoi valide
par 30 secondes, best effort) s’applique après validation pour permettre de corriger une faute.
Le navigateur bloque le double envoi et ne déclare le succès qu’après `ok: true`. L’acceptation
par le webhook ne prouve pas à elle seule la livraison de l’email ou la qualification commerciale.

## Vérification sans notification

```sh
npm run check:contact
```

Les tests exécutent le code client/API avec DOM et réseau simulés : FR/CH, numéros internationaux,
email vide, mauvais JSON, consentement, filtrage d’attribution, préselection des métiers, succès,
échec, double envoi et anti-spam. Aucun appel réseau ni prospect de test n’est envoyé.

Les hooks `form_submitted` et `tel_click` utilisent `dataLayer`/Plausible seulement si un collecteur
est déjà présent. Aucun service de statistiques n’est activé automatiquement. Le suivi d’appels
aboutis et des demandes qualifiées nécessite une mesure complémentaire.
