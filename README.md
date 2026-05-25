# Rénovation Metbach — site vitrine

Site statique pour **Rénovation Metbach**, artisan tout corps d'état basé en Haute-Savoie.
8 métiers : bardage, petits travaux, revêtement de sol, fondations, aménagement paysager,
clôtures, déménagement, arboriculture.

## Stack

- HTML5 / CSS3 / JavaScript natif (zéro build, zéro dépendance npm)
- Tailwind CSS via CDN (avec config inline pour le thème)
- Lucide icons via CDN
- Google Fonts : Bricolage Grotesque, Inter, Instrument Serif
- Animations : CSS keyframes + IntersectionObserver pour les reveals

## Structure

```
.
├── index.html                  # Page d'accueil (hero, services, à propos, process, réalisations, avis, FAQ, contact)
├── services/                   # 8 pages dédiées par métier
│   ├── bardage.html
│   ├── petits-travaux.html
│   ├── revetement-sol.html
│   ├── fondations.html
│   ├── amenagement-paysager.html
│   ├── clotures.html
│   ├── demenagement.html
│   └── arboriculture.html
├── css/styles.css              # Styles custom (thème, animations, composants)
├── js/script.js                # Interactions (scroll, menu mobile, reveals, compteurs, formulaire)
├── robots.txt
└── sitemap.xml
```

## Avant la mise en ligne — à remplacer

Cherche-remplace dans tout le projet :

| Placeholder                          | Valeur réelle à mettre               |
|--------------------------------------|--------------------------------------|
| `06 00 00 00 00`                     | Numéro de téléphone réel             |
| `+33600000000`                       | Idem au format E.164 (`tel:` href)   |
| `contact@renovation-metbach.fr`      | Email réel                           |
| `renovation-metbach.fr`              | Domaine réel                         |

Ces valeurs sont présentes dans : `index.html`, les 8 pages `services/*.html`,
`robots.txt`, `sitemap.xml`, et le JSON-LD de l'index.

## Visuels

Les images sont actuellement servies depuis **Unsplash** (placeholders thématiques).
À terme, remplacer par les vraies photos des chantiers dans `assets/img/` et
adapter les balises `<img src=...>`.

## Déploiement

C'est un site 100% statique. Tu peux le déployer en uploadant le dossier sur :
- **Netlify** : `netlify deploy --prod --dir=.` (ou drag-and-drop sur netlify.com)
- **Vercel** : `vercel --prod`
- **OVH / Infomaniak / IONOS** : FTP du dossier dans `www/`
- **GitHub Pages** : push sur `main`, activer Pages dans les settings

## Développement local

Aucun build nécessaire. Pour ouvrir le site :
```bash
# Option 1 — double-clic sur index.html dans le Finder
open index.html

# Option 2 — petit serveur local (Python)
python3 -m http.server 8000
# puis http://localhost:8000
```

## Inspirations design

Le site combine les principes de plusieurs design systems modernes :
- **Tailwind CSS** — système d'utilités CSS, base du theme custom
- **shadcn/ui** — composants minimaux, accent sur la typo et l'espacement
- **Aceternity UI** & **Magic UI** — effets visuels (aurora, gradient text, bento grid)
- **Radix Primitives** — patterns d'interaction accessibles
- **Framer Motion / Animate.css** — animations subtiles et orchestrées

— Conçu par **Celexia**.
