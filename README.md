# Words With Friends Helper

A browser-based tool for finding high-scoring plays in Words With Friends. Filter the dictionary by your rack letters, board patterns, and crossing tiles — results are ranked by score.

## Features

- **Rack letters** — enter your tiles, use `*` or `?` as wildcards
- **Pattern matching** — lock letters in position with `_` (e.g. `d_p` matches *dip*, *dap*, *dep*)
- **Board word crossing** — specify a word already on the board; one of its letters will be used as a crossing tile
- **Board letter anchoring** — specify loose letters on the board; one will be used as an anchor
- Results sorted by tile score, with each tile colour-coded by how it was matched

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Building

```bash
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```

## Deploying

See [CLOUDFLARE.md](CLOUDFLARE.md) for Cloudflare Pages deployment instructions.

## Tech Stack

- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- [Tailwind CSS v3](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) components (Card, Input)
- [an-array-of-english-words](https://github.com/words/an-array-of-english-words) dictionary (~275k words, bundled client-side)
