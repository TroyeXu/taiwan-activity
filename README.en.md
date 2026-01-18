# Taiwan Tourism Activity Map

Interactive map for discovering tourism activities across Taiwan with search, filters, and favorites.

Chinese README: [README.md](README.md)

## Features

- Interactive map with clustered markers
- Multi-filter search: keyword, category, region, date, favorites
- Favorites list with grouping and export
- Responsive UI for mobile, tablet, and desktop

## Tech Stack

- Nuxt 4 + Vue 3
- Element Plus + Tailwind CSS
- Leaflet + OpenStreetMap
- SQLite (`public/tourism.sqlite`) + SQL.js
- Pinia
- TypeScript + ESLint + Prettier + Vitest

## Quick Start

Requirements: Node.js 18+, npm

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Common Scripts

```bash
# Dev / Build
npm run dev
npm run build
npm run preview
npm run generate

# Code quality
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck

# Tests
npm run test
npm run test:run
npm run test:coverage
```

## Deployment (GitHub Pages)

1. Ensure `app.baseURL` in `nuxt.config.ts` matches `/<repo>/` (example: `/taiwan-activity/`)
2. Build static site: `npm run generate` (output in `.output/public`)
3. This repo already includes `.github/workflows/deploy-simple.yml` (edit if needed):

```yaml
name: Simple Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      - name: Build
        run: npm run generate
      - name: List output files
        run: |
          echo "=== Output directory structure ==="
          ls -la .output/public/
          echo "=== Check if tourism.sqlite exists ==="
          ls -lh .output/public/tourism.sqlite || echo "tourism.sqlite not found!"
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./.output/public
          force_orphan: true
          enable_jekyll: false
          keep_files: false
          cname: # Leave empty unless you have a custom domain
```

4. GitHub Pages settings: Source = Deploy from a branch, Branch = `gh-pages` / `/`
5. Visit `https://<user>.github.io/<repo>/`

## Project Structure

```
.
├── app/            # Nuxt app (pages, components, composables)
├── server/         # Nitro API
├── public/         # Static files and tourism.sqlite
├── crawler/        # Crawlers and import tools
├── scripts/        # SQL and maintenance scripts
└── docs/           # Project and data docs
```

## Data and Crawlers

- Main database file: `public/tourism.sqlite`
- See `docs/crawler-simple-guide.md` and `docs/deployment-and-data-management.md` for data updates

### Crawler Quick Commands (crawler/)

Run these in `crawler/`:

```bash
cd crawler
npm install

# Government sources
npm run crawl:gov
npm run crawl:gov-quick
npm run crawl:gov-local

# Commercial sources and full run
npm run crawl:all
npm run crawl:klook
npm run crawl:kkday
npm run crawl:taiwan

# Full pipeline (crawl + convert + import)
npm run crawl:full
npm run crawl:full-quick
npm run crawl:full-local

# Import JSON into SQLite
node import-to-database.js path/to/activities.json

# Health check
npm run health
```

More details in `crawler/HOW_TO_RUN_CRAWLERS.md`.

## Contributing

Issues and pull requests are welcome.

## License

MIT License
