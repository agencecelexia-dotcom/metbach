# Rénovation Metbach

Site statique de **https://www.renovationmetbach.fr/** : couverture, maçonnerie et isolation
extérieure en Haute-Savoie, avec des prestations complémentaires de rénovation et d’aménagement.
HTML rendu directement, CSS compilé, JavaScript natif et formulaire Vercel → n8n.

## Développer et contrôler

```sh
npm ci
npm run build
npm run check:seo
npm run check:contact
npm run preview
```

Aperçu : http://127.0.0.1:8000. Le serveur reproduit les URL sans extension, la compression
gzip, la politique CSP et les réponses 404. Il ne traite pas les formulaires. Les tests de
contact exécutent le vrai code client/API avec des doublures réseau ; ils n’envoient aucun prospect.

Le build produit une seule feuille minifiée `assets/css/site.css` à partir des polices locales,
de Tailwind 3, de `css/styles.css` et de `css/editorial.css`. Il limite Lucide aux icônes utilisées,
puis exporte les seules ressources publiques dans `dist/`. Recompiler après un changement de
HTML, d’icône, de CSS ou de JavaScript. Dépendances verrouillées dans `package-lock.json`.
Les anciens fichiers CSS restent disponibles pour les pages éventuellement encore en cache.

## Images responsives

Les photos existantes sont conservées, sans agrandissement ni recadrage des sources. Les variantes
WebP et AVIF sont versionnées dans `assets/img/responsive/`, avec un manifeste de dimensions, tailles et
empreintes. Génération facultative avec Pillow : voir [la documentation](scripts/build-images.README.md).

```sh
python3 scripts/build-images.py
python3 scripts/build-images.py --avif-hero
npm run images:apply
npm run build
```

`images:apply` met à jour `srcset`, `sizes` et les dimensions des photos dans les pages publiques.
Les petites sources ne sont pas artificiellement agrandies. Le visuel ITE est une image générée, explicitement légendée comme illustration ; il ne documente
pas un chantier réalisé. Source et prompt : [design/ite-image.json](design/ite-image.json).
Ses variantes se régénèrent avec `python3 scripts/build-ite-image.py` (Pillow 11.3+).

## Version éditoriale du 15 novembre 2026

- Identité visuelle partagée sur toutes les pages : pierre, vert profond, typographie et grandes photos.
- Accueil recentré sur couverture, maçonnerie et ITE ; pages dédiées aux deux nouveaux métiers.
- Navigation mobile accessible, actions Appeler/Devis persistantes, formulaires FR/CH et email facultatif.
- Préselection du métier et de la commune depuis les liens autorisés, par exemple
  `/contact?service=maconnerie&city=publier#form`, sans écraser les valeurs déjà saisies.
- Neuf pages locales recentrées sur les trois métiers, Suisse explicitement sur étude ; page dédiée au nettoyage
  de toiture reliée à la couverture, au catalogue et aux trois pages locales.
- Conseils de description adaptés au métier et au nettoyage, sans préremplir le message du visiteur.
- Boutons de contact des trois services principaux contextualisés, y compris sur mobile ;
  le libellé du métier transmis conserve la précision nettoyage lorsque ce projet est choisi.
- Galerie décrite à partir des éléments visibles ; aucune datation ni prestation cachée non documentée.
- Parcours de contact décrit sans promettre un traitement direct par l’artisan à chaque étape.
- Une demande est confirmée seulement après une réponse API contenant `ok: true` ; protection contre
  les doubles envois et messages d’erreur en français.
- Guide `/preparer-travaux` : 18 points de préparation, trois situations types illustratives,
  progression interactive, sans inscription ni stockage navigateur.
- Galerie simplifiée, images adaptées à la largeur, labels de formulaires et contrastes revus.
- Promesses de délai harmonisées : réponse sous 48 h ouvrées, délai du devis précisé après échange.
- Prix non justifiés remplacés par les facteurs de budget propres aux prestations. Les exemples
  illustratifs ne servent pas de preuves de réalisations.

## SEO et structure

31 pages publiques, dont **27 indexables** dans le sitemap. Métadonnées uniques, canoniques HTTPS
avec `www`, liens internes sans extension, une seule entité d’entreprise `#business`, schémas
WebPage/Service/Breadcrumb/FAQ cohérents avec le texte. Aucun avis agrégé sur sa propre entreprise.
Les pages légales, `/merci` et `/404` sont `noindex`. Une URL inexistante renvoie HTTP 404.

`npm run check:seo` contrôle les titres, descriptions, H1, langue, canoniques, liens, ancres,
ressources, JSON-LD, entités, FAQ visibles et sitemap. Il ne prouve pas l’indexation dans Google.
`python3 scripts/check-http.py --base http://127.0.0.1:8000` contrôle l’aperçu ; sans `--base`,
la commande contrôle la production en lecture seule.

## Formulaire et mesure

Voir [api/README.md](api/README.md). L’URL et le secret du webhook restent côté serveur, dans les
variables Vercel. Aucun `.env`, export n8n, dossier d’audit ou fichier privé n’entre dans `dist/`.

La demande consentie inclut une attribution limitée lorsqu’elle est disponible : chemin du formulaire,
page publique du site consultée juste avant le formulaire, origine du site référent extérieur et paramètres `utm_source`, `utm_medium`, `utm_campaign` filtrés. Aucun
historique inter-pages, cookie ou stockage navigateur n’est utilisé. Les hooks `form_submitted`
et `tel_click` appellent un collecteur seulement s’il existe déjà ; ils n’installent pas d’analytics.
Le modèle d’email n8n doit être adapté séparément si cette attribution doit apparaître dans les notifications.
Un clic téléphonique n’est pas assimilé à un appel abouti, ni une demande reçue à un chantier signé.

## Publication

Vercel : `framework: null`, commande `npm run build`, sortie `dist`, `cleanUrls: true`, sans
slash final. L’API `api/contact.js` reste une fonction Vercel distincte. Les variables d’environnement
existantes doivent être conservées. Un hébergement purement statique ne traite pas le formulaire.

Après publication : vérifier les 27 URL, les nouvelles pages, les assets, `/merci` et une vraie 404.
Le parcours de formulaire a été testé par interception locale de l’API, sans envoi réel de notification.
Les mesures Lighthouse sont des essais de laboratoire ; elles ne remplacent pas les Core Web Vitals terrain.

## Audits et suivi

Le dossier local `renovationmetbach.fr-audit/` contient les preuves, rapports et captures ; il est
exclu du déploiement. L’étude concurrentielle du 15 novembre couvre 18 sites sélectionnés, avec
sources et limites explicites. Le second passage étudie 17 intentions, 28 pages concurrentes sur
21 domaines et les 27 URL indexables de Metbach : voir `deep-audit-2026-11-15/`. Ces études
ne mesurent pas les positions Google géolocalisées, le trafic ou les ventes des concurrents.
Inventaire d’outils dans `toolkit/README.md`.

Cinq outils supplémentaires ont été installés dans un environnement d’audit isolé et exécutés :
SEOmator, GEO Optimizer, advertools, extruct et Trafilatura. Les dépendances du site restent inchangées.
OpenSEO et les appels à des fournisseurs SERP payants ne sont pas utilisés. Les scores d’audit ne
prouvent ni un classement Google, ni une citation par une IA.

Search Console a bien été consultée en accès authentifié le 15 novembre : voir
`search-console-2026-11-15/ANALYSE.md`. Le relevé des 13–14 novembre est provisoire et trop court
pour conclure à une progression. L’indexation des nouvelles pages et les demandes qualifiées sont
à suivre sur des périodes complètes. Aucun suivi automatique récurrent n’est installé.

Google Business Profile a été travaillé dans la session précédente ; l’adresse locale et le téléphone
confirmés sont repris sur le site. Les qualifications, assurances et références de chantiers doivent
rester appuyées sur des informations confirmées ; aucun statut RGE n’est annoncé.

Les anciens dossiers de prospection sont conservés uniquement comme archives locales.
**Les demandes de backlinks et prises de contact ont été annulées par l’utilisateur ; aucun envoi.**
