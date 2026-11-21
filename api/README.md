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
valide, un métier figurant dans la liste des options proposées et un consentement explicitement booléen. Les numéros FR/CH et internationaux sont validés
sans prétendre vérifier leur attribution ; espaces, parenthèses, tirets et préfixe00 sont acceptés.
Le numéro transmis est normalisé pour faciliter le rappel.

L’attribution peut inclure le chemin du formulaire (`/` ou `/contact`), l’origine HTTP(S)
du référent extérieur, la page publique immédiatement précédente (`source_page`), la page d’entrée
observée pendant la session consentie (`landing_page`) et trois paramètres filtrés : `utm_source`,
`utm_medium`, `utm_campaign`. Les chemins sont limités à une liste explicite identique côté navigateur
et API, qui comprend les pages services/villes et les trois conseils publiables. Aucun chemin libre,
URL complète ni identifiant publicitaire n’est mémorisé pour l’attribution. Les champs de coordonnées
et le message du formulaire ne sont jamais copiés dans ce stockage. Les libellés de campagne doivent
rester non personnels.

Sans accord à la mesure d’audience, seul le contexte encore disponible sur la page de soumission
accompagne la demande consentie ; rien n’est conservé entre les pages. Après acceptation, la clé
`metbach-attribution` de `sessionStorage` conserve la dernière entrée/campagne observée dans cet onglet.
Elle expire après 30 minutes sans mise à jour et est effacée au refus/retrait (y compris un changement
de consentement provenant d’un autre onglet). Une nouvelle campagne ou entrée externe remplace
l’ancienne sans mélanger leurs paramètres. Si l’accord est donné en cours de parcours, `landing_page`
est la première page observée après cet accord, pas une reconstitution des pages antérieures.
Le choix d’audience reste dans `metbach-consent` pendant 180 jours. Si le stockage est indisponible,
le formulaire fonctionne et aucun suivi interpages n’est garanti.

L’attribution est transmise dans le JSON au webhook n8n ; le modèle d’email local ne l’affiche pas encore.
Sa mise à jour et la vérification du workflow réellement déployé restent nécessaires pour voir la source
dans la notification interne. Cette modification du site ne crée pas de registre de prospects ni de
confirmation de livraison email.

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
email vide, mauvais JSON, consentement, filtrage d’attribution, préselection des métiers et communes, succès,
échec, double envoi et anti-spam. Ils couvrent aussi acceptation/refus, persistance service → contact,
expiration, retrait inter-onglets, stockage indisponible et compatibilité des demandes de nettoyage. Aucun appel réseau ni prospect de test n’est envoyé.

Les hooks `form_submitted` et `tel_click` utilisent `dataLayer`/Plausible seulement si un collecteur
est déjà présent. GTM est injecté par le build ; ces hooks ne chargent pas eux-mêmes de collecteur.
La page `/merci` charge aussi le JS commun pour la gestion du consentement et les clics téléphone,
sans déclencher `form_submitted` à la simple visite. Le suivi d’appels
aboutis et des demandes qualifiées nécessite une mesure complémentaire.

Les liens locaux peuvent transmettre `?service=couverture&city=publier#form`. Seuls les métiers
et communes connus sont préremplis, sans écraser une valeur déjà saisie. Les conseils du champ
message s’adaptent au métier. `?service=nettoyage-toiture` sélectionne explicitement
« Nettoyage et démoussage de toiture » ; le champ `work_type` garde ce libellé dans la notification.
Les anciens liens `?service=couverture&project=nettoyage-toiture` sélectionnent aussi cette option
lorsqu’elle existe. L’API continue d’accepter « Couverture — nettoyage et démoussage de toiture »
pour les formulaires déjà ouverts. Un changement de métier fait disparaître ce contexte de nettoyage.
Les conseils ne modifient jamais le texte du visiteur et aucun projet n’est soumis automatiquement.
