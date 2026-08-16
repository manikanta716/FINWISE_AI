/* ============================================================
   FinWise AI - Deployment Configuration

   BOTH FIELDS ARE OPTIONAL. Left blank (the default), the app
   behaves exactly like the standalone build: you paste your
   Claude API key and your Google Apps Script URL into the two
   fields on the "AI Financial Tips" tab, and neither is ever
   written to disk.

   Fill these in only if you want a default baked into the
   deployment - see DEPLOYMENT.md.
   ============================================================ */

window.FINWISE_CONFIG = {
  // OPTIONAL serverless proxy (Netlify/Vercel) that holds a Claude
  // API key server-side, so visitors don't need their own key.
  // Used ONLY when the API-key field on the page is left empty.
  // Set to '/api/financial-tips' to enable it.
  AI_TIPS_ENDPOINT: '',

  // OPTIONAL default Google Apps Script Web App URL. When set, it
  // pre-fills the Cloud History field so you don't paste it every
  // session. Example: 'https://script.google.com/macros/s/AKfycb.../exec'
  SHEETS_ENDPOINT: ''
};
