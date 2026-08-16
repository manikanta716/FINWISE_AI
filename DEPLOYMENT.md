# Deployment Guide

FinWise AI ships zero-config: with `js/config.js` untouched, the three calculators work anywhere you can serve static files, and AI Tips works as soon as a user pastes their own Claude key into the page.

So only **Part 1** is genuinely required. Parts 2–4 are opt-in.

| Part | What it gets you | Required? |
|---|---|---|
| 1 — Push to GitHub | Version control | Yes |
| 2 — Static host (Pages / Netlify drop) | A public URL | Yes, to go live |
| 3 — Serverless AI key | Visitors don't need their own key | Optional |
| 4 — Google Sheets | Cloud History across sessions | Optional |

---

## Part 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: FinWise AI"
git branch -M main
git remote add origin https://github.com/<your-username>/finwise-ai.git
git push -u origin main
```

Confirm `.gitignore` is in place first — it excludes `.env`, so a real key can't be committed by accident.

---

## Part 2 — Put it on a static host

### Option A: GitHub Pages (simplest)

1. Repo **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**.
2. Live at `https://<username>.github.io/finwise-ai/`.

Everything works, including AI Tips — each visitor supplies their own key on the AI Tips tab. Nothing else to configure.

### Option B: Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → pick the repo.
2. Build command: **empty**. Publish directory: **`.`** (Netlify reads both from `netlify.toml`).
3. **Deploy.**

Same behaviour as Pages until you do Part 3.

---

## Part 3 — Serverless AI key (optional)

Do this when you want a public link where **visitors don't need their own Claude key** — your key does the work, and stays on the server.

Requires Netlify or Vercel; GitHub Pages cannot run the function.

1. **Get a key.** [console.anthropic.com](https://console.anthropic.com) → create an API key → make sure billing is enabled (API usage is metered, and this will be billed to you for every visitor).
2. **Switch the app to serverless mode.** In `js/config.js`:
   ```js
   AI_TIPS_ENDPOINT: '/api/financial-tips',
   ```
   The API-key field on the AI Tips tab hides itself automatically once this is set.
3. **Add the key to Netlify.** Site → **Site configuration → Environment variables → Add a variable**.
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from step 1
   - Scope: all deploy contexts
4. **Commit and redeploy** so both the config change and the env var take effect:
   ```bash
   git add js/config.js && git commit -m "Enable serverless AI tips" && git push
   ```
5. **Verify.** Open the site → **AI Financial Tips** → **Generate AI Financial Tips**. Live content should appear in a few seconds, with no key field on the page.

> **Cost note:** in serverless mode every click of *Generate AI Financial Tips* bills your account. If the link is public, consider leaving browser-key mode on instead, or adding rate limiting to the function.

### Vercel instead of Netlify

Vercel uses the same `/api/*` convention natively. Move `netlify/functions/financial-tips.js` to `api/financial-tips.js` at the repo root, and change the export from Netlify's signature:

```js
exports.handler = async function (event) { ... return { statusCode, headers, body } }
```

to Vercel's:

```js
module.exports = async (req, res) => { ... res.status(200).json(structured) }
```

Set `ANTHROPIC_API_KEY` the same way in Vercel's Environment Variables. `js/config.js` needs no change — it already points at the platform-agnostic path.

---

## Part 4 — Google Sheets Cloud History (optional)

1. Create a new Google Sheet (any name).
2. **Extensions → Apps Script.**
3. Delete the placeholder code, paste in the entire contents of `google-apps-script/Code.gs`. *(The same code is also viewable in-app under "Show Google Apps Script code" on the AI Tips tab.)*
4. Save the project (any name).
5. **Deploy → New deployment → type "Web app".**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. **Deploy**, authorize the permissions (you'll get an "unverified app" warning since it's your own script — **Advanced → Go to (project name)**), and copy the URL ending in `/exec`.
7. **Open that `/exec` URL directly in a browser tab once.** This completes Google's one-time authorization. You should see `{"ok":true,"message":"FinWise AI Sheets backend is running."}`. Skipping this is the most common reason saves silently fail.
8. Use the URL, either way:
   - **Per session (no code change):** paste it into the *Google Apps Script Web App URL* field on the AI Tips tab.
   - **Permanently:** set it in `js/config.js` so it prefills that field on every load —
     ```js
     SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycb.../exec'
     ```
     then `git add js/config.js && git commit -m "Connect Sheets" && git push`.
9. **Verify.** **Save Session to Cloud** → **Refresh History**. A `FinWiseHistory` tab appears in your Sheet with the row.

> The Sheet is bound to *your* Google account and set to "Anyone" access, meaning anyone who knows the `/exec` URL can append rows. Don't commit that URL to a public repo unless you're fine with that.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| AI Tips: "Paste your Claude API key above first" | Browser-key mode with an empty field — that's the prompt, just paste a key |
| AI Tips: CORS error, page opened by double-click | You're on a `file://` origin. Serve over HTTP: `python3 -m http.server 8000` |
| AI Tips: 401 / authentication error | Key is invalid, or billing isn't enabled on the Anthropic account |
| AI Tips: "Couldn't reach Claude" in serverless mode | `ANTHROPIC_API_KEY` isn't set in Netlify, or you didn't redeploy after adding it |
| AI Tips works with `netlify dev` but not live | Env var is in local `.env` but not in the Netlify dashboard — add it there too |
| Function 404s on Netlify | Confirm `netlify.toml` is committed at the repo root — it defines the `/api/*` redirect |
| Key field still visible after Part 3 | `AI_TIPS_ENDPOINT` in `js/config.js` is still `''`, or the change wasn't pushed |
| Cloud History save does nothing | No URL in the field and none in `config.js` |
| Save "succeeds" but the Sheet stays empty | You skipped step 7 — open the `/exec` URL once to authorize |
| Page is blank / nothing responds | Open DevTools console. A `[FinWise] …() is not defined` warning means the `<script>` order in `index.html` was changed — see README |
| Charts don't render | The Chart.js CDN `<script>` in `<head>` was removed or is blocked |
