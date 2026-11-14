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
Les petites sources ne sont pas artificiellement agrandies. L’illustration ITE est un schéma CSS
explicitement légendé ; aucun chantier, date, avis ou certification n’est inventé.

## Version éditoriale du 14 novembre 2026

- Identité visuelle partagée sur toutes les pages : pierre, vert profond, typographie et grandes photos.
- Accueil recentré sur couverture, maçonnerie et ITE ; pages dédiées aux deux nouveaux métiers.
- Navigation mobile accessible, actions Appeler/Devis persistantes, formulaires FR/CH et email facultatif.
- Préselection d’un métier depuis les liens `/contact?service=maconnerie#form` et équivalents autorisés.
- Une demande est confirmée seulement après une réponse API contenant `ok: true` ; protection contre
  les doubles envois et messages d’erreur en français.
- Guide `/preparer-travaux` : 18 points de préparation, trois situations types illustratives,
  impression et téléchargement texte, sans inscription ni stockage navigateur.
- Galerie simplifiée, images adaptées à la largeur, labels de formulaires et contrastes revus.
- Promesses de délai harmonisées : réponse sous 48 h ouvrées, délai du devis précisé après échange.
- Prix non justifiés remplacés par les facteurs de budget propres aux prestations. Les exemples
  illustratifs ne servent pas de preuves de réalisations.

## SEO et structure

30 pages publiques, dont **26 indexables** dans le sitemap. Métadonnées uniques, canoniques HTTPS
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
origine du site référent et paramètres `utm_source`, `utm_medium`, `utm_campaign` filtrés. Aucun
historique inter-pages, cookie ou stockage navigateur n’est utilisé. Les hooks `form_submitted`
et `tel_click` appellent un collecteur seulement s’il existe déjà ; ils n’installent pas d’analytics.
Le modèle d’email n8n doit être adapté séparément si cette attribution doit apparaître dans les notifications.
Un clic téléphonique n’est pas assimilé à un appel abouti, ni une demande reçue à un chantier signé.

## Publication

Vercel : `framework: null`, commande `npm run build`, sortie `dist`, `cleanUrls: true`, sans
slash final. L’API `api/contact.js` reste une fonction Vercel distincte. Les variables d’environnement
existantes doivent être conservées. Un hébergement purement statique ne traite pas le formulaire.

Après publication : vérifier les 26 URL, les nouvelles pages, les assets, `/merci` et une vraie 404.
Le parcours de formulaire a été testé par interception locale de l’API, sans envoi réel de notification.
Les mesures Lighthouse sont des essais de laboratoire ; elles ne remplacent pas les Core Web Vitals terrain.

## Travail externe restant

Le dossier local `renovationmetbach.fr-audit/` contient l’audit initial, le bilan d’implémentation,
les mesures et une stratégie de backlinks : 37 prospects documentés, un plan sur 90 jours et des messages
préparés. Aucune inscription, prise de contact, affiliation ou acquisition de lien n’est présumée.
Les rapports et leurs captures ne sont pas publiés dans les ressources du site.

Search Console et Google Business Profile nécessitent l’accès authentifié à la propriété exacte.
À vérifier dans ces comptes : indexation réelle, sitemap, requêtes FR/CH, pages d’entrée, liens et
coordonnées locales. Les assurances, qualifications, affiliations, références de chantiers et
informations métier doivent être confirmées par l’entreprise ; aucun statut RGE n’est annoncé.

Méthodes utilisées : [Claude SEO](https://github.com/AgriciDaniel/claude-seo),
[OpenSEO](https://github.com/every-app/open-seo), [Search Console MCP](https://mcpsearchconsole.com/mcp)
et [GEO Optimizer](https://github.com/Auriti-Labs/geo-optimizer-skill). Aucune donnée Google authentifiée
ni mesure de visibilité IA n’a été obtenue via ces connecteurs. Les recommandations ont été confrontées
aux documents officiels actuels et aux contrôles du site réel.
