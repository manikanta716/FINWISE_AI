# FinWise AI

**Intelligent Loan Eligibility, Credit Analysis & Financial Advisory Platform** — a Generative-AI-powered fintech demo built with HTML, CSS and vanilla JavaScript, backed by a real Claude API integration and optional Google Sheets cloud storage.

No build step, no framework, no dependencies to install. Serve the folder and it runs.

## Features — Four Core Tools

1. **Loan Eligibility Checker** — Derives an eligible loan ceiling from income, existing obligations and credit-tier income multipliers, and classifies borrower risk as **Low / Medium / High**. Optionally plan a specific amount + tenure to see an indicative EMI and whether it fits your ceiling.
2. **Credit Score Analyzer** — *Quick Classify*: type a score you already know (300–900) for an instant band + actionable recommendations. *Detailed Analyzer*: a FICO-style five-factor simulator (payment history, utilization, credit age, account mix, inquiries) that computes a score and renders it as a radar chart.
3. **EMI Calculator** — Standalone, fully manual: principal, annual rate and tenure → monthly EMI, total interest and total payment, with a principal-vs-interest chart.
4. **AI Financial Tips** — A deterministic needs/wants/savings snapshot plus a **live Claude API call** that reads your session (loan + credit + EMI results, goal, risk appetite) and generates a personalized recommendation set, credit improvement strategies, EMI optimization suggestions and a risk classification report.

A **Cloud History** panel (Google Sheets + Apps Script) lets you save a session snapshot and reload past ones.

## Architecture

The three deterministic calculators are pure client-side JavaScript and always work offline. Only the AI Tips panel and Cloud History touch the network.

```
Browser (index.html, css/, js/)
   │
   ├── Loan · Credit · EMI · Quick Snapshot
   │      run entirely client-side, no network
   │
   ├── AI Financial Tips — two interchangeable modes, chosen in js/config.js
   │
   │    (A) Browser-key mode        AI_TIPS_ENDPOINT: ''      ← default
   │        You paste a Claude key into the page.
   │        Browser ──────────────────────────► api.anthropic.com
   │        Key lives in the tab for the session only.
   │        Works on GitHub Pages, or any plain static host.
   │
   │    (B) Serverless mode         AI_TIPS_ENDPOINT: '/api/financial-tips'
   │        Browser ──► Netlify Function ──► api.anthropic.com
   │                    (holds ANTHROPIC_API_KEY server-side)
   │        Key never reaches the browser. Needs Netlify or Vercel.
   │        The API-key field hides itself automatically.
   │
   └── Cloud History  →  Google Apps Script Web App
                         (bound to your own Google Sheet)
                         URL typed into the page, or preset in config.js
```

### Which AI mode should I use?

| | Browser-key (default) | Serverless |
|---|---|---|
| Setup | Paste a key into the page | Deploy + set an env var |
| Host | Anything, incl. GitHub Pages | Netlify / Vercel |
| Key exposure | Lives in your own tab, session only. Never written to `localStorage`, never sent anywhere except Anthropic | Never leaves the server |
| Good for | Personal use, local dev, demos you drive yourself | A public link other people will use |

**The one rule:** in browser-key mode, never commit a real key and never publish the page with a key pre-filled. Anyone who loads a public page in browser-key mode is expected to bring their own key. If you want strangers to use *your* key, that is exactly what serverless mode is for.

## Tech Stack

- HTML5 / CSS3 (custom properties, no framework)
- Vanilla JavaScript (ES6, classic scripts, no build tooling)
- [Chart.js](https://www.chartjs.org/) via CDN for radar/doughnut charts
- Netlify Functions (Node) as an optional secure proxy to the Anthropic API
- Google Apps Script + Google Sheets as a lightweight cloud database
- Google Fonts: Fraunces, Public Sans, JetBrains Mono

## Project Structure

```
finwise-ai/
├── index.html                        # App shell — markup for all 4 tabs
├── css/
│   └── styles.css                    # All styling
├── js/
│   ├── utils.js                      # fmtINR, $, bindRange, emiFor, showNote
│   ├── state.js                      # window.FinWiseState — shared session object
│   ├── config.js                     # Endpoints + model. Both blank = zero-config
│   ├── loan.js                       # Loan eligibility + risk tier logic
│   ├── credit.js                     # Quick classify + detailed credit analyzer
│   ├── emi.js                        # Standalone EMI calculator
│   ├── aitips.js                     # Budget snapshot + Claude call + rendering
│   ├── sheets.js                     # Cloud History save/load
│   └── main.js                       # Tabs, session header, first paint (loads last)
├── netlify/functions/
│   └── financial-tips.js             # Optional serverless proxy to the Claude API
├── google-apps-script/
│   └── Code.gs                       # Paste into Apps Script to enable Cloud History
├── netlify.toml                      # Netlify build + function + redirect config
├── .env.example                      # Documents ANTHROPIC_API_KEY (no real secret)
├── README.md
├── DEPLOYMENT.md                     # Step-by-step: GitHub → Netlify → Sheets
├── .gitignore
└── LICENSE
```

### Script load order

The `<script>` tags at the bottom of `index.html` are ordered deliberately:

1. **`utils.js`** — defines `fmtINR`, `$`, `bindRange`, `emiFor`, `showNote`. Everything below calls these.
2. **`state.js`** — creates `window.FinWiseState`, the object tool modules write to and AI Tips reads.
3. **`config.js`** — creates `window.FINWISE_CONFIG`.
4. **`loan.js` → `sheets.js`** — each module binds its own sliders and buttons *at load time*, which is why all tags sit at the end of `<body>`: the elements must already exist.
5. **`main.js`** — last, because it calls functions the modules above define.

Moving `main.js` earlier, or any module above `utils.js`, will break the page.

### How the modules share data

Each tool writes its result into `window.FinWiseState` (`.loan`, `.credit`, `.emi`, `.goal`, `.risk`, `.budget`) and then calls `refreshAiTipsAvailability()`. The AI Tips tab reads whatever is there — so tips get richer as you run more tools, and it never blocks on tools you skipped.

## Running Locally

Serve the folder over HTTP rather than double-clicking `index.html` — `file://` origins are blocked by CORS on the Anthropic call:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

All three calculators work immediately. For AI Tips, paste a key from [console.anthropic.com](https://console.anthropic.com) into the field on the fourth tab.

**Serverless mode locally** — requires the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

Set `AI_TIPS_ENDPOINT: '/api/financial-tips'` in `js/config.js`, and put your key in a local `.env` (never commit it):

```
ANTHROPIC_API_KEY=sk-ant-...
```

For full deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Disclaimer

FinWise AI mixes transparent rule-based calculators with live Claude-generated content. It is not a real credit bureau, lender, or licensed financial advisor. The scoring formulas are plausible heuristics for demonstration, not any bureau's actual model. AI-generated text can be wrong — verify anything financially significant with a licensed professional.

## License

MIT — see [LICENSE](./LICENSE).
