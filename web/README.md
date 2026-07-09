# Boardly — landing page

The marketing site for [Boardly](https://github.com/cdrrazan/Boardly), a static single-page app with **no build step** — just HTML, CSS, and a little vanilla JS. It lives on the `web-app` branch so it can be deployed independently of the Action code.

```
web/
├── index.html      # the page
├── styles.css      # design system (light + dark themes)
├── main.js         # theme toggle, mobile menu, copy buttons, scroll reveal
├── favicon.svg     # tab icon
├── og.svg          # social share image
└── _headers        # Cloudflare Pages security + caching headers
```

## Deploy to Cloudflare Pages

Pick **one** of the two options below — don't use both, or you'll get double deploys.

### Option A — Auto-deploy via GitHub Actions (recommended)

The [`deploy-web.yml`](../.github/workflows/deploy-web.yml) workflow uploads `web/` to Cloudflare Pages on every push to `web-app` (Direct Upload). One-time setup:

1. **Create a Direct Upload Pages project** named `boardly`:
   ```bash
   npx wrangler pages project create boardly --production-branch web-app
   ```
2. **Add two repository secrets** (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — a token with the **Cloudflare Pages: Edit** permission
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard → Workers & Pages
3. **Push to `web-app`** (or run the workflow manually). The Action publishes the site and prints the deployment URL in the job summary.

### Option B — Cloudflare Git integration (no Action)

1. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git**, pick **`cdrrazan/Boardly`**.
2. Configure the build:
   - **Production branch:** `web-app`
   - **Framework preset:** `None` · **Build command:** _(empty)_ · **Build output directory:** `web`
3. **Save and Deploy.** Cloudflare rebuilds on every push itself — in this case **delete** `deploy-web.yml` so the site isn't deployed twice.

Either way, add a custom domain under the Pages project's **Custom domains** tab.

### Deploy once from the CLI (optional)

```bash
npm i -g wrangler
wrangler pages deploy web --project-name boardly
```

## Local preview

No tooling required — open `web/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server -d web 8080   # then visit http://localhost:8080
```

## Notes

- **Self-contained & CSP-safe:** no external scripts, fonts, or stylesheets, so the strict Content-Security-Policy in `_headers` holds and the page loads fast anywhere.
- **Theme:** respects the visitor's OS light/dark preference and remembers their manual toggle.
- **Social image:** `og.svg` is an SVG; some networks prefer PNG for link previews — export it to `og.png` and update the `og:image` / `twitter:image` paths in `index.html` if you want maximum compatibility.
