/* ============================================================
   FinWise AI - Shared Session State
   The Loan, Credit and EMI modules write their latest result
   into FinWiseState; the AI Tips and Cloud History modules
   read from it. Loaded before every feature module.
   ============================================================ */

window.FinWiseState = {
  loan: null,    // { income, obl, cs, riskTier, verdict, eligibleCeiling, rate, ... }
  credit: null,  // { score, band, source: 'quick'|'detailed', ... }
  emi: null,     // { principal, rate, months, emi, totalInterest, totalPayment }
  goal: null,
  risk: null
};

/* Credentials the user types into the page. These live in memory for
   this tab only - never localStorage, never sent anywhere except the
   service they belong to. Cleared the moment the tab closes. */
window.FinWiseRuntime = {
  apiKey: '',
  sheetsEndpoint: (window.FINWISE_CONFIG && window.FINWISE_CONFIG.SHEETS_ENDPOINT) || ''
};
