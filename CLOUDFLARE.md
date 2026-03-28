# Deploying to Cloudflare Pages

**Via the dashboard (recommended):**

1. Push to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create application → Connect to Git
3. Select this repo and set:
   - Build command: `npm run build`
   - Build output directory: `dist`

**Via CLI:**

```bash
npm run build
npx wrangler pages deploy dist
```
