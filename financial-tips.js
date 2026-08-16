/* ============================================================
   FinWise AI — Netlify Function: /api/financial-tips

   OPTIONAL. The app's default path is the API-key field on the
   AI Financial Tips tab: the browser calls Anthropic directly
   with the visitor's own key, so no backend is needed and the
   site runs fine on GitHub Pages.

   Deploy this function instead when you want visitors to use
   the tips feature WITHOUT their own key. It calls Anthropic
   with a key that lives only in this server-side environment,
   never shipped to the browser. Two steps to enable it:
     1. Set ANTHROPIC_API_KEY in your Netlify site's
        Environment Variables.
     2. Set AI_TIPS_ENDPOINT: '/api/financial-tips' in
        js/config.js.
   See DEPLOYMENT.md.
   ============================================================ */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const MODEL = 'claude-sonnet-5'; // swap to 'claude-haiku-4-5-20251001' for a cheaper/faster option

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this deployment. Set it in your Netlify site\u2019s Environment Variables, then redeploy.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const prompt = buildPrompt(payload);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: data?.error?.message || 'Claude API request failed.' })
      };
    }

    const text = (data.content || []).map(b => b.text || '').join('\n');
    const cleaned = text.replace(/```json|```/g, '').trim();

    let structured;
    try {
      structured = JSON.parse(cleaned);
    } catch (e) {
      structured = {
        risk_classification: { tier: 'Unknown', summary: 'Could not parse a structured response.' },
        loan_eligibility_summary: text.slice(0, 400),
        credit_evaluation_summary: '',
        personalized_recommendations: [],
        credit_improvement_strategies: [],
        emi_optimization_suggestions: []
      };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(structured) };
  } catch (err) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

function buildPrompt(payload) {
  const { loan, credit, emi, goal, risk } = payload || {};
  return `You are a careful, factual financial-advisory assistant embedded in a demo fintech app called FinWise AI (India-focused, amounts in INR).

Given the structured session data below, respond with ONLY a single valid JSON object — no markdown fences, no prose outside the JSON — matching exactly this schema:

{
  "risk_classification": { "tier": "Low" | "Medium" | "High", "summary": "one sentence" },
  "loan_eligibility_summary": "2-3 sentences",
  "credit_evaluation_summary": "2-3 sentences",
  "personalized_recommendations": ["short actionable point", "..."],
  "credit_improvement_strategies": ["short actionable point", "..."],
  "emi_optimization_suggestions": ["short actionable point", "..."]
}

Keep each array to 3-4 concise, concrete, non-generic bullet points grounded in the numbers given below. If a tool wasn't run yet, reason sensibly from whatever data IS available rather than inventing figures, and say so briefly in the relevant summary.

SESSION DATA
Loan Eligibility Tool output: ${loan ? JSON.stringify(loan) : 'not run yet'}
Credit Analyzer Tool output: ${credit ? JSON.stringify(credit) : 'not run yet'}
EMI Calculator Tool output: ${emi ? JSON.stringify(emi) : 'not run yet'}
Stated financial goal: ${goal || 'not specified'}
Stated risk appetite: ${risk || 'not specified'}

Respond with the JSON object only.`;
}
