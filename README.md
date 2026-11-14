# Rénovation Metbach

Site de rénovation à Publier, en Haute-Savoie, sur **https://www.renovationmetbach.fr/**.
HTML statique, CSS et JavaScript natif. Huit métiers : couverture, bardage, petits travaux,
revêtement de sol, fondations, aménagement paysager, clôtures et arboriculture.

## Développement et déploiement

```sh
npm ci
npm run build
npm run check:seo
npm run preview
```

Aperçu : http://127.0.0.1:8000. Le serveur reproduit les URL sans extension et renvoie une
vraie réponse 404 pour une page absente. Il ne traite pas les formulaires de contact.

`npm run build` compile Tailwind 3, limite Lucide aux icônes utilisées et exporte uniquement
les fichiers publics dans `dist/`. Les ressources générées sont aussi conservées dans
`assets/`. Recompiler après un changement de classes HTML ou d’icônes. Les dépendances de
construction sont verrouillées dans `package-lock.json` ; aucun compilateur CSS ne tourne
chez le visiteur. Les polices sont servies localement avec `font-display: swap`.

Vercel est configuré dans `vercel.json` : `framework: null`, commande `npm run build`, sortie
`dist`, `cleanUrls: true`, sans slash final. L’API existante `api/contact.js` reste une fonction
Vercel distincte, avec ses variables d’environnement décrites dans `api/README.md`. Ne pas
copier les fichiers `.env` ou le dossier `api` dans les ressources statiques. Un hébergement
purement statique de `dist` nécessite un backend équivalent pour que le formulaire fonctionne.

Le domaine sans `www` redirige déjà vers `www` sur le site public (HTTP 308 observé le
14 novembre 2026). Conserver ce réglage de domaine dans Vercel. Les anciennes URL `.html`
sont prises en charge par `cleanUrls`, les variantes `/index` par les redirections explicites.

## Améliorations SEO du 14 novembre 2026

- Titres, descriptions, H1 et métadonnées de partage cohérents ; une URL canonique par page.
- Tous les liens internes utilisent directement les URL sans extension. Couverture ajoutée
  au catalogue et aux menus de services ; réalisations de toiture reliées à la couverture.
- Une seule entreprise identifiée par `https://www.renovationmetbach.fr/#business`. Les villes
  sont des zones desservies, pas des établissements. Les demandes suisses sont présentées
  comme soumises à étude depuis Publier.
- Graphes JSON-LD `WebPage`, `Service`, `BreadcrumbList`, catalogue et galerie adaptés aux
  pages. Suppression des `Article` et `HowTo` inappropriés et des notes agrégées sur sa propre
  entreprise. Les FAQ décrivent exactement les questions/réponses visibles.
- Contenu utile propre aux huit métiers et aux neuf villes existantes : préparation du
  devis, contraintes et liens pertinents. Pas de génération massive de pages locales.
- Retrait des statistiques, témoignages, économies et temps de trajet non étayés ; lien
  direct vers la fiche Google pour consulter les avis actuels.
- Sitemap de 23 pages indexables avec une date réelle de modification ; pages légales, confidentialité, `/merci` et `/404`
  exclues et marquées `noindex` (exclusion administrative préexistante conservée). `robots.txt` autorise les pages et ressources ; `/api/` exclu.
- `llms.txt` factuel pour les lecteurs qui l’utilisent, sans garantie de citation IA.
- CSS compilé, icônes locales limitées aux besoins, polices locales, dimensions d’images
  réelles et contenu visible sans JavaScript. Cache revalidé pour le CSS/JS sans nom haché.
- Page 404 dédiée, ancrages robustes, menu mobile avec gestion du focus, animations réduites.

## Contrôles et limites

`npm run check:seo` vérifie les 27 pages : titres/descriptions uniques, H1, langue, balises
canoniques et sociales, directives robots, liens/ancres/assets, JSON-LD, références d’entités,
FAQ visibles et sitemap. Les 23 pages indexables sont accessibles à deux clics maximum de
l’accueil. Ce contrôle ne prouve pas que Google les a indexées.

La compilation et la vérification syntaxique du JavaScript ont été exécutées.
`python3 scripts/check-http.py --base http://127.0.0.1:8000` contrôle les URL de
l’aperçu. Après publication, `python3 scripts/check-http.py` vérifie le site public. L’accueil et
la navigation vers la couverture ont été inspectés dans Chrome. Le contrôle visuel mobile
n’a pas pu être terminé en raison d’une interruption de l’outil navigateur ; le menu a pu
être ouvert pendant l’inspection. Faire un contrôle mobile final avant publication.

Aucun formulaire réel n’a été envoyé. Les Core Web Vitals terrain, les positions et le
trafic n’ont pas été mesurés. Les améliorations présentes dans ce dossier ne sont pas une
preuve de déploiement : vérifier la version Vercel publiée avant de soumettre le sitemap.

## Recherche utilisée

Les grilles des projets demandés ont été lues et appliquées au code. Aucun score provenant
d’un moteur qui n’a pas tourné n’est présenté.

| Ressource | Usage et état |
|---|---|
| [Claude SEO](https://github.com/AgriciDaniel/claude-seo) | Audit technique, local, contenu et schémas ; critères appliqués et contrôle local reproductible. |
| [OpenSEO](https://github.com/every-app/open-seo) | Méthode d’audit par familles de pages et priorité aux données Search Console. Connexion proposée, pas encore confirmée. |
| [Search Console MCP](https://mcpsearchconsole.com/mcp) | Endpoint fourni à connecter avec OAuth Google ; aucun accès aux données de la propriété dans cette session. |
| [GEO Optimizer](https://github.com/Auriti-Labs/geo-optimizer-skill) | Cohérence d’entité, HTML accessible et `llms.txt` factuel. CLI `geo` absente, aucun score GEO exécuté. |

Références de contrôle : [règles des données structurées Google](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
[avis sur sa propre entreprise](https://developers.google.com/search/docs/appearance/structured-data/review-snippet),
[fonctionnalités IA et SEO](https://developers.google.com/search/docs/appearance/ai-features),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
Une FAQ utile ne garantit pas un résultat enrichi. `llms.txt` ne remplace ni l’exploration,
ni l’indexation, ni les preuves d’expertise.

## Suite avec Search Console et l’entreprise

1. Connecter la propriété exacte `sc-domain:renovationmetbach.fr` (ou son équivalent préfixe
   `https://www.renovationmetbach.fr/`) via OAuth ; commencer par un accès en lecture seule.
   Ne pas coller de jeton Google dans les fichiers du site.
2. Lire les performances sur 90 jours, par page et requête, puis comparer les 28 derniers
   jours aux 28 précédents. Séparer les requêtes de marque des recherches de prestations.
   Prioriser les pages déjà vues par Google ; ne pas inventer de volumes de recherche.
3. Après déploiement, inspecter accueil, services, couverture, Publier et contact : HTTP 200,
   canonical sélectionné, indexabilité, mobile. Vérifier une URL inexistante en 404 et la
   redirection du formulaire vers `/merci` sans envoyer de faux prospect.
4. Soumettre `https://www.renovationmetbach.fr/sitemap.xml` dans Search Console et examiner
   les motifs d’exclusion. L’écriture via MCP exige les permissions correspondantes ; la
   confirmation d’accès au compte n’est pas une preuve de connexion du connecteur.
5. Faire confirmer par l’entreprise les assurances (assureur, police, métiers couverts),
   l’adresse opérationnelle publique, les horaires, les prestations et tarifs indicatifs,
   la provenance/autorisation des photos et les données légales. Les coordonnées reprises
   proviennent du site existant ; aucun justificatif d’assurance n’était fourni.
6. Vérifier la fiche Google Business Profile : identité/téléphone/site identiques, base réelle,
   zones desservies et services. Ajouter des photos de chantiers documentés et recueillir des
   avis authentiques, sans inventer des agences ni des témoignages.
7. Documenter les prochains chantiers réels : ville, problème, travaux, matériaux, photos
   autorisées, date et contraintes. Enrichir les pages existantes avant d’ouvrir de nouvelles
   pages de ville. Suivre demandes de devis et appels avec un outil de mesure choisi, puis
   réévaluer impressions, clics et conversions après recrawl ; aucun gain n’est garanti.

Le code du site reste distinct des accès Search Console, Google Business Profile et Vercel.
