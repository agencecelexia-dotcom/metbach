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
- Délai de réponse : « sous 24 h en général, 48 h au plus » (confirmé par l’utilisateur le 24/11/2026). Ne concerne
  que la réponse à la demande, pas l’intervention.
- Code APE 43.34Z (peinture et vitrerie). Activités déclarées dans les mentions légales : peinture, couverture,
  terrassement, espaces verts. **Maçonnerie et ITE ne sont pas confirmées** par un extrait d'immatriculation.
- **Non RGE.** Aucune certification ni chantier documenté connus.
- Assurance (attestation lue le 24/11/2026, fichier local `audit seo/attestation metbach-2 (1).pdf`, jamais commité) :
  RC décennale + RC professionnelle + dommages avant réception, **Mutuelle Bresse Bugey** (gestionnaire RCDPRO,
  courtier Slassur Loiseau), police PROW-2026958000310A, validité 01/01/2026 – 31/12/2026, marchés ≤ 300 000 € HT.
  Activités couvertes : 2.4 charpente et structures bois, 3.1 couverture (dont zinguerie, châssis de toit, écran
  sous toiture, souches, bardages verticaux en technique de couverture), 4.7 peinture, 4.5 revêtements de sols,
  7.2 paysagisme (plantations, engazonnement ; accessoires : clôtures légères, petite maçonnerie paysagère,
  bordures), 7.3 élagage, 6.6 piscines.
  **Non couverts : maçonnerie, isolation thermique par l’extérieur (ITE), fondations, terrassement** ; clôtures
  seulement en accessoire du paysagisme. Ne jamais affirmer que ces travaux sont assurés.
  Décision de l’utilisateur (24/11/2026) : Zachari étend son contrat à ces activités ; les pages maçonnerie et ITE
  restent en ligne. Dès réception de la nouvelle attestation, mettre à jour la liste des activités assurées.
  Piscines (activité 6.6 assurée) : service `/services/piscine` et conseil `construire-piscine-demarches-securite`
  créés le 24/11 ; aucune photo de piscine réelle disponible (pas d’image de chantier sur la page).
  L’attestation indique « 826 route de la Danse » au lieu de « 862 route de la Dranse » (à faire corriger par
  l’assureur). Ne publier ni le numéro de police ni les montants.
- Avis Google : 14 avis, note 5,0 au 24/11/2026 (affichés via le widget `/api/avis`, voir plus bas).
- Zone : « depuis Publier, dans le Chablais et le Genevois français ». La Suisse (Genève, Nyon, Lausanne) est
  étudiée au cas par cas : pages en `noindex, follow`, hors sitemap.

## Règles de contenu (impératives)

- **Ne jamais inventer** : années d'expérience (« depuis 2003 » non validé par l'artisan), certifications,
  assureur, avis, notes, prix, délais, chantiers, photos présentées comme réalisations.
- Prix (décision de l’utilisateur du 24/11/2026) : **prix indicatifs** au m² alignés sur le marché 2026 (sources de
  marché citées dans les conseils), présentés comme « indicatifs, peuvent varier selon le chantier, devis au cas
  par cas ». Ne pas écrire « ce ne sont pas nos tarifs » (demande explicite de l’utilisateur). Ne pas inventer
  d’autres prix : toute nouvelle fourchette doit venir d’une source de marché vérifiée.
- Phrase d'assurance unique sur le site : « Avant de signer, demandez les attestations d'assurance (décennale
  et responsabilité civile professionnelle) et vérifiez qu'elles mentionnent bien les travaux prévus. »
  Elle est précédée, sur l’accueil (FAQ) et `/a-propos`, du nom de l’assureur et de la liste exacte des activités
  couvertes ; sur les pages toiture et paysagisme, de « couverts par notre assurance décennale et RC pro
  (Mutuelle Bresse Bugey), attestation sur demande ».
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
  (espaces insécables avant `: ; ? !`, dans les milliers et devant €, m² et %, noms composés insécables dans les titres) et retire de `dist/` les images
  responsives non référencées. **Toujours rebuild après une modification de HTML, CSS ou JS.**
- `npm run check:seo` (`scripts/check-seo.py`) : titres, H1, canoniques, JSON-LD, FAQ, dates du sitemap
  comparées à git. Doit finir à 0 erreur. Après modification d'une page, mettre son `<lastmod>` à la date du jour.
- `npm run check:content` valide les sources, liens et ancres des conseils ; les brouillons sont exclus du rendu.
- Avis Google : `api/avis.js` (Places API New, cache CDN 6 h, sans cookie) alimente les sections
  `<!-- avis:start -->` (attribut `data-reviews`) de l’accueil, `/a-propos`, `/contact`, couverture et nettoyage.
  Variables Vercel : `GOOGLE_PLACES_API_KEY` (obligatoire pour les données en direct), `GOOGLE_PLACE_ID`
  (facultatif). Sans clé ou en cas d’erreur : relevé du 24/11 (5,0, 14 avis) et lien vers la fiche. Les avis
  d’auteurs nommés « Metbach » sont exclus. Mention : avis publiés et modérés par Google, sans contrôle de
  l’entreprise. `npm run check:avis` teste la fonction (Google simulé).
- `npm run check:contact`, `npm run preview` (`python3 scripts/preview.py --port 8765` sert `dist/`).
- `npm run indexnow` : envoie toutes les URL du sitemap à IndexNow (clé `767b0dff704140da60b1ad5cd741c563.txt`).
- Images : `scripts/build-images.py --avif` (Pillow) puis `npm run images:apply`, qui conserve les `sizes`
  écrits à la main.
- Playwright utilisable : `/Users/thomasaubigeon/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`.

## Structure SEO actuelle

- 54 URL dans `sitemap.xml` : accueil, 12 services `/services/*` (dont `/services/piscine`, ajouté le 24/11), hub `/services`, hub `/villes`, 23 villes
  françaises (publier, thonon-les-bains, evian-les-bains, annemasse, douvaine, saint-julien-en-genevois ;
  vague 1 du 20/11 : sciez, bons-en-chablais, allinges, anthy-sur-leman, margencel, marin, neuvecelle ;
  vague 2 du 20/11 : veigy-foncenex, chens-sur-leman, messery, massongy, perrignier, lugrin,
  saint-paul-en-chablais, larringes, armoy, le-lyaud), `/a-propos`, `/contact`, `/realisations`, `/glossaire`,
  `/preparer-travaux`, les pages `/villes/demoussage-toiture-thonon-les-bains` et `/villes/reparation-toiture-thonon-les-bains` (24/11, générées par un script hors dépôt, à éditer à la main désormais ; adresses à plat pour ne pas créer de dossier `villes/thonon-les-bains/` qui masquerait la page Thonon), le hub `/conseils` et ses huit articles publiables (dont `prix-demoussage-toiture-haute-savoie`, ajouté le 24/11 ; un nouvel article = ajouter aussi son slug à `publicSourcePath` dans `js/script.js` et `api/contact.js`, au sitemap et à `llms.txt`).
- Pages ville des vagues 1 et 2 : gabarit `villes/sciez.html` (encadré « en bref » avec chiffres INSEE,
  altitude IGN, règles d'urbanisme, monuments historiques de la base Mérimée, zone de sismicité 4 de Géorisques,
  3 FAQ locales). Une nouvelle ville = ajouter son slug à `publicSourcePath` dans `js/script.js` **et**
  `api/contact.js`, à la table `cities` de `js/script.js`, au hub `/villes` (carte + ItemList), au sitemap,
  à `llms.txt` et aux liens « Autres zones » / « Autour de » des villes voisines. Marin : toujours
  « Marin (74200) » (homonymes). Le Lyaud : « au Lyaud », jamais « à Le Lyaud ».
  Depuis le 24/11, le pied de page de toutes les pages liste les 23 communes (bloc `<!-- communes:start -->`
  … `<!-- communes:end -->`, à compléter pour chaque nouvelle ville, sur toutes les pages ; les conseils le
  reprennent de `villes/sciez.html`).
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
L’ancien total d’indexation ne couvre pas les 54 URL actuelles ; ne pas le présenter comme un état courant.
Au contrôle du 21/11, la maçonnerie était encore inconnue de Google malgré son HTTP 200.
Audit OpenSEO + DataForSEO des 23–24/11 : dossier local `audit seo/` (brief IA + données JSON, **non commité**).
Constats : site techniquement bon, blocage hors site (1 domaine référent contre une médiane de 88, 14 avis
Google, aucun entre juillet et octobre) ; 54 % des recherches « couvreur thonon » de décembre à mars.
Appliqué le 24/11 : accueil « Couvreur à Publier, Thonon-les-Bains et Évian », titre Couverture « (74) »,
FAQ démoussage (saison, haute pression), liens vers les conseils, communes en pied de page, GTM différé.
En attente de Zachari : prix (page prix du démoussage), délai de rappel, attestation d'assurance, vrais
chantiers, vérification des avis, pages Thonon démoussage/réparation.

## Mesure d'audience

- Google Tag Manager `GTM-KCB7W56H` (contient la balise GA4 `G-4PSV7TSL8Y`), injecté **au build** par
  `scripts/build-site.cjs` dans chaque page de `dist/` (ne pas le coller dans les sources HTML).
  Depuis le 24/11, `gtm.js` n'est chargé que 1,5 s après l'événement `load` ou dès la première interaction
  (scroll, clic, touche) : il ne pèse plus sur le LCP mobile.
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
- Conseils publiables : fuite-toiture-que-faire, nettoyer-reparer-ou-refaire-toiture, comparer-devis-isolation-exterieure, prix-demoussage-toiture-haute-savoie, neige-toiture-que-faire, gouttiere-qui-deborde, toiture-tempete-grele-que-faire, construire-piscine-demarches-securite (24/11).
- Nettoyage explicite dans le formulaire : `service=nettoyage-toiture`.
- Attribution de campagne conservée en session uniquement après consentement analytics, effacée au retrait.
- GA4 `form_submitted` marqué événement clé, une fois par session, sans valeur financière par défaut. Il mesure une demande acceptée par l’API, pas sa qualification ni la livraison email.

## Mémoire projet — backlinks (21 novembre 2026)

- L’utilisateur a demandé de conserver les **81 pistes** et de reporter les démarches à un autre jour.
- Liste complète et ordre conservés dans `renovationmetbach.fr-audit/backlinks/prospects-81-retrouves-2026-11-21.json`.
- Source retrouvée dans ChatGPT : « Liste backlinks importants », https://chatgpt.com/c/6b00c298-abd8-83eb-95a8-755ec36d3744.
- Cette liste de 81 est distincte de l’ancienne liste locale de 37 prospects et de la discussion sur 80 dépôts GitHub.
- Aucune démarche backlinks à lancer maintenant : ni inscription, ni prise de contact, ni achat, ni relance automatique. Attendre une demande explicite de reprise.
- Les conditions, tarifs, liens et qualifications doivent être vérifiés à la reprise ; les 81 pistes ne sont pas 81 backlinks garantis.
