# CLAUDE.md — renovationmetbach.fr

Site vitrine de **Rénovation Metbach** (https://www.renovationmetbach.fr), entreprise de Zachari Metbach.
Objectif du propriétaire du dépôt (agence Celexia) : rendre le site **très visible sur Google et dans les
réponses des IA** dans le Chablais et le Genevois français, pour générer des appels et des demandes de devis.

## Faits vérifiés sur l'entreprise (ne rien ajouter sans preuve)

- Entrepreneur individuel Zachari Metbach. SIREN 448 464 545, SIRET 448 464 545 00020. Créée le 1er mai 2003.
- Siège déclaré : 91 rue de la République, 33400 Talence (Gironde). Aucun établissement déclaré en
  Haute-Savoie au registre SIRENE (vérifié le 16/11/2026).
- Base d'intervention affichée et fiche Google : 862 route de la Dranse, 74500 Publier.
  Coordonnées : 46.400383, 6.520969. Fiche Google : https://maps.app.goo.gl/mu6Nbfsgyvrt49AM9
- Téléphone : 07 69 13 61 82 (+33 7 69 13 61 82). Réception des demandes : 24 h/24 et 7 j/7,
  confirmée explicitement par l’utilisateur le 21/11/2026. Aucun e-mail publié.
  Cette disponibilité concerne la réception et la prise en charge des demandes ; elle ne constitue pas
  une promesse d’intervention immédiate ou de dépannage sur place 24 h/24. Le délai d’intervention
  est confirmé selon le projet.
- Code APE 43.34Z (peinture et vitrerie). Activités déclarées dans les mentions légales : peinture, couverture,
  terrassement, espaces verts. **Maçonnerie et ITE ne sont pas confirmées** par un extrait d'immatriculation.
- **Non RGE.** Aucune certification, aucun assureur, aucun avis client, aucun chantier documenté connus.
- Zone : « depuis Publier, dans le Chablais et le Genevois français ». La Suisse (Genève, Nyon, Lausanne) est
  étudiée au cas par cas : pages en `noindex, follow`, hors sitemap.

## Règles de contenu (impératives)

- **Ne jamais inventer** : années d'expérience (« depuis 2003 » non validé par l'artisan), certifications,
  assureur, avis, notes, prix, délais, chantiers, photos présentées comme réalisations.
- Phrase d'assurance unique sur le site : « Avant de signer, demandez les attestations d'assurance (décennale
  et responsabilité civile professionnelle) et vérifiez qu'elles mentionnent bien les travaux prévus. »
- La galerie `/realisations` est une « galerie d'idées » : ne pas créditer l'entreprise pour ces photos.
- Voix « nous » sur les pages services et villes, « je » sur `/a-propos`. Apostrophes typographiques (’).
- Le texte des FAQ en JSON-LD doit être identique, mot pour mot, au texte visible (contrôlé par check-seo).
- Pas de balisage `Review` / `AggregateRating` sur des avis de l'entreprise elle-même.
- Les informations réglementaires ou techniques ajoutées doivent être générales et vérifiables (citer la source
  officielle quand c'est possible : service-public.gouv.fr, legifrance, france-renov.gouv.fr, georisques).

## Stack et commandes

- HTML statique écrit à la main, Tailwind 3 compilé + `css/styles.css` + `css/editorial.css` → `assets/css/site.css`.
  JS natif (`js/script.js`). Formulaire : `api/contact.js` (Vercel) → n8n.
- Hébergement Vercel, `cleanUrls`, sortie `dist/` (ignorée par git). Config : `vercel.json` (en-têtes, cache,
  CSP, redirections). Le push sur `main` déploie la production.
- `npm run build` : génération des conseils (`scripts/build-conseils.py`) + CSS + icônes Lucide + export `dist/`. Le build applique aussi la typographie française
  (espaces insécables avant `: ; ? !`, noms composés insécables dans les titres) et retire de `dist/` les images
  responsives non référencées. **Toujours rebuild après une modification de HTML, CSS ou JS.**
- `npm run check:seo` (`scripts/check-seo.py`) : titres, H1, canoniques, JSON-LD, FAQ, dates du sitemap
  comparées à git. Doit finir à 0 erreur. Après modification d'une page, mettre son `<lastmod>` à la date du jour.
- `npm run check:content` valide les sources, liens et ancres des conseils ; les brouillons sont exclus du rendu.
- `npm run check:contact`, `npm run preview` (`python3 scripts/preview.py --port 8765` sert `dist/`).
- `npm run indexnow` : envoie toutes les URL du sitemap à IndexNow (clé `767b0dff704140da60b1ad5cd741c563.txt`).
- Images : `scripts/build-images.py --avif` (Pillow) puis `npm run images:apply`, qui conserve les `sizes`
  écrits à la main.
- Playwright utilisable : `/Users/thomasaubigeon/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`.

## Structure SEO actuelle

- 46 URL dans `sitemap.xml` : accueil, 11 services `/services/*`, hub `/services`, hub `/villes`, 23 villes
  françaises (publier, thonon-les-bains, evian-les-bains, annemasse, douvaine, saint-julien-en-genevois ;
  vague 1 du 20/11 : sciez, bons-en-chablais, allinges, anthy-sur-leman, margencel, marin, neuvecelle ;
  vague 2 du 20/11 : veigy-foncenex, chens-sur-leman, messery, massongy, perrignier, lugrin,
  saint-paul-en-chablais, larringes, armoy, le-lyaud), `/a-propos`, `/contact`, `/realisations`, `/glossaire`,
  `/preparer-travaux`, le hub `/conseils` et ses trois articles publiables.
- Pages ville des vagues 1 et 2 : gabarit `villes/sciez.html` (encadré « en bref » avec chiffres INSEE,
  altitude IGN, règles d'urbanisme, monuments historiques de la base Mérimée, zone de sismicité 4 de Géorisques,
  3 FAQ locales). Une nouvelle ville = ajouter son slug à `publicSourcePath` dans `js/script.js` **et**
  `api/contact.js`, à la table `cities` de `js/script.js`, au hub `/villes` (carte + ItemList), au sitemap,
  à `llms.txt` et aux liens « Autres zones » / « Autour de » des villes voisines. Marin : toujours
  « Marin (74200) » (homonymes). Le Lyaud : « au Lyaud », jamais « à Le Lyaud ».
- Vague 3 prévue (Genevois, conditionnelle) : Vétraz-Monthoux, Gaillard, Ville-la-Grand, Cranves-Sales,
  Ambilly, Saint-Cergues. À lancer seulement si les vagues 1 et 2 s'indexent (Search Console).
- JSON-LD : nœud `GeneralContractor` `#business` complet sur `/` et `/contact` (avec `iso6523Code`
  0009:44846454500020), nœud court sur les autres pages ; `WebSite` `#website` ; un `Service` par page service
  avec un seul `name` par `@id` (même libellé dans le catalogue de l'accueil et l'ItemList de `/services`).
- `llms.txt` à la racine, robots IA autorisés.

## Audits

Dossier `renovationmetbach.fr-audit/` (**jamais commité** : `git add -A -- . ':!renovationmetbach.fr-audit'`).
Audits claude-seo du 15/11 (74/100), du 16/11 (81/100), puis le grand audit de visibilité du 20/11.
Données Search Console au 18/11/2026 : 252 impressions, 2 clics, position moyenne 20,5.
L’ancien total d’indexation ne couvre pas les 46 URL actuelles ; ne pas le présenter comme un état courant.
Au contrôle du 21/11, la maçonnerie était encore inconnue de Google malgré son HTTP 200.

## Mesure d'audience

- Google Tag Manager `GTM-KCB7W56H` (contient la balise GA4 `G-4PSV7TSL8Y`), injecté **au build** par
  `scripts/build-site.cjs` dans chaque page de `dist/` (ne pas le coller dans les sources HTML).
- Google Consent Mode v2 : tout refusé par défaut ; `analytics_storage` accordé seulement après « Accepter » dans
  le bandeau (`js/script.js`, clé localStorage `metbach-consent`, 6 mois). Lien « Gérer les cookies » ajouté en
  JS dans le pied de page. Publicité toujours refusée. Politique de confidentialité, section 10, à tenir à jour.
- CSP (`vercel.json`) : googletagmanager.com en script-src/frame-src, *.google-analytics.com,
  *.analytics.google.com et *.googletagmanager.com en connect-src.
- Événements `dataLayer` existants pour les conversions : `tel_click`, `form_submitted` (avec `page`),
  plus `consent_granted` / `consent_denied`.

## Git

Commit et push uniquement à la demande de l'utilisateur. Message en anglais, terminé par la ligne
`Co-Authored-By` demandée par l'environnement.

## Acquisition — changements du 21 novembre 2026

- Couverture : requête Haute-Savoie, avec zone réelle Chablais/Genevois depuis Publier ; pas de pages départementales ou villes en doublon.
- Trois conseils publiables : fuite-toiture-que-faire, nettoyer-reparer-ou-refaire-toiture, comparer-devis-isolation-exterieure.
- Nettoyage explicite dans le formulaire : `service=nettoyage-toiture`.
- Attribution de campagne conservée en session uniquement après consentement analytics, effacée au retrait.
- GA4 `form_submitted` marqué événement clé, une fois par session, sans valeur financière par défaut. Il mesure une demande acceptée par l’API, pas sa qualification ni la livraison email.
