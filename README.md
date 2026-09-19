# Ismophilie

Dictionnaire des notions en `-isme` extraites de *La philosophie de A à Z*.
Application Vite en JavaScript, sans serveur ni base de données.

## Développement

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm run preview
```

Le site compilé est dans `dist/`.

## Vercel

Importer le dépôt dans Vercel avec la racine du dépôt comme **Root Directory**.
La configuration `vercel.json` indique le preset **Vite**, la commande
`npm run build` et le dossier de sortie `dist`.
Aucune variable d’environnement n’est nécessaire. Le JSON est déjà inclus :
Python et l’ouvrage source ne sont pas nécessaires au build.

Documentation : https://vercel.com/docs/frameworks/frontend/vite

## Structure

- `index.html` : page d’entrée.
- `src/main.js`, `src/styles.css` : interface, navigation et recherche.
- `src/data/ismes.json` : contenu extrait, inclus dans le build.
- `public/` : favicon.
- `scripts/extract_ismes.py` : extraction Python, sans dépendance externe.

## Régénérer le contenu

Avec le dossier XHTML de l’ouvrage à la racine :

```bash
npm run extract
```

Le script reconstitue les titres coupés, indexe les sous-entrées et les articles
communs, suit les entrées entre les pages, sépare les sens, les explications,
les termes voisins, les termes opposés et les renvois. Il décode également
les principaux caractères des polices embarquées. Les termes opposés sont
ceux explicitement indiqués dans le livre ; aucune opposition n’est inventée.
Certaines entrées sont uniquement des renvois vers d’autres articles.
Les liens entre notions ne sont proposés que si la cible figure dans l’index.

Le texte provient d’un export à mise en page fixe : sa segmentation reste
heuristique. Les numéros de page permettent de retrouver les passages source.

L’audit du contenu et ses limites sont documentés dans [scripts/extraction-notes.md](scripts/extraction-notes.md).
