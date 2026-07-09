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

This project uses Cloudflare's **Git integration** — Cloudflare rebuilds and deploys automatically on every push to `web-app`. Set it up once:

1. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git**, pick **`cdrrazan/Boardly`**.
2. Configure the build:
   - **Production branch:** `web-app`
   - **Framework preset:** `None`
   - **Build command:** _(leave empty)_
   - **Build output directory:** `web`
3. **Save and Deploy.** Cloudflare serves `web/index.html` at your `*.pages.dev` domain, and redeploys on each push.

Add a custom domain under the Pages project's **Custom domains** tab.

> Because Cloudflare deploys via Git, there is **no GitHub Actions deploy workflow** — that would double-deploy the site.

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

- **Fonts:** the UI font is **Google Sans**, loaded from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`). The Content-Security-Policy in `_headers` allows exactly those two hosts for `style-src`/`font-src`; everything else stays same-origin. Roboto and the system stack are the fallbacks while the font loads.
- **Theme:** dark-only, for a consistent brand look.
- **Social image:** `og.svg` is an SVG; some networks prefer PNG for link previews — export it to `og.png` and update the `og:image` / `twitter:image` paths in `index.html` if you want maximum compatibility.
