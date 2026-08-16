/* ============================================================
   FinWise AI - AI Financial Tips Module
   Two layers:
     1. Quick Snapshot - deterministic needs/wants/savings split,
        emergency-fund target and risk-based allocation. Always
        works, no network call.
     2. AI-Generated Tips - sends the combined session state
        (loan + credit + EMI + goal/risk) to Claude and renders a
        structured recommendation set.

   How the Claude call is authenticated:
     - Default: the key the user types into the field on the page.
       It stays in this tab's memory only and goes straight to
       api.anthropic.com. Nothing to deploy, works on GitHub Pages.
     - Optional: if the field is empty AND AI_TIPS_ENDPOINT is set
       in js/config.js, the request goes to your serverless proxy
       instead, which holds the key server-side. See DEPLOYMENT.md.
   ============================================================ */

bindRange('ainc','v_ainc', v=>fmtINR(v));
bindRange('aexp','v_aexp', v=>fmtINR(v));
bindRange('adebt','v_adebt', v=>fmtINR(v));
bindRange('asav','v_asav', v=>fmtINR(v));

let budgetChart;

const riskAllocations = {
  conservative:{equity:25, debt:55, gold:12, cash:8},
  moderate:{equity:50, debt:30, gold:10, cash:10},
  aggressive:{equity:75, debt:12, gold:8, cash:5}
};

function refreshAiTipsAvailability(){
  const have = ['loan','credit','emi'].filter(k => window.FinWiseState[k]).length;
  const el = $('aiTipsContext');
  if(el) el.textContent = `Using data from ${have} of 3 tools run so far (Loan, Credit, EMI). Run more for richer tips, or generate now with what you have.`;
}

/* ---------------- 1. Deterministic budget snapshot ---------------- */
function runBudgetSnapshot(){
  const inc = Number($('ainc').value);
  const exp = Number($('aexp').value);
  const debt = Number($('adebt').value);
  const sav = Number($('asav').value);
  const goal = $('goal').value;
  const risk = $('risk').value;

  const needs = exp + debt;
  const surplus = inc - needs;
  const dti = debt/inc;

  const needsPct = Math.min(70, Math.round((needs/inc)*100));
  let savingsPct = Math.max(10, Math.round(((inc*0.20))/inc*100));
  let wantsPct = 100 - needsPct - savingsPct;
  if(wantsPct<5){ wantsPct=5; savingsPct = 100-needsPct-wantsPct; }

  const emergencyTarget = exp*6;

  $('allocBars').innerHTML = [
    {label:'Needs (rent, bills, debt)', pct:needsPct},
    {label:'Wants (lifestyle, discretionary)', pct:wantsPct},
    {label:'Savings & Investing', pct:savingsPct},
  ].map(r=>`
    <div class="bar-row">
      <div class="bl"><span>${r.label}</span><span>${r.pct}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${r.pct}%"></div></div>
    </div>
  `).join('');

  const ctx = document.getElementById('budgetChart');
  const data = {
    labels:['Needs','Wants','Savings'],
    datasets:[{
      data:[needsPct, wantsPct, savingsPct],
      backgroundColor:['#A63D33','#B4791F','#2F6F4E'],
      borderColor:'#123437', borderWidth:3
    }]
  };
  const opts = {
    responsive:true,
    plugins:{ legend:{ labels:{color:'#ECE7D8', font:{family:'Public Sans', size:12}} } },
    cutout:'62%'
  };
  if(budgetChart){ budgetChart.data=data; budgetChart.options=opts; budgetChart.update(); }
  else { budgetChart = new Chart(ctx, {type:'doughnut', data, options:opts}); }

  const alloc = riskAllocations[risk];
  const notes = [];
  notes.push({tag: dti<=0.36?'pos':dti<=0.5?'neu':'neg',
    text:`Debt-to-income is ${(dti*100).toFixed(1)}%. ${dti<=0.36?'This is within the healthy range lenders prefer (under 36%).':dti<=0.5?'This is elevated \u2014 prioritise paying down high-interest debt before taking on more.':'This is high risk territory \u2014 a debt paydown plan should come before new borrowing or investing.'}`});
  notes.push({tag: sav>=emergencyTarget?'pos':'neu',
    text:`Emergency fund target is ${fmtINR(emergencyTarget)} (6 months of expenses). You currently hold ${fmtINR(sav)}${sav>=emergencyTarget?' \u2014 target met.':`, a gap of ${fmtINR(emergencyTarget-sav)}.`}`});
  notes.push({tag:'neu',
    text:`Suggested investment mix for a ${risk} risk appetite: ${alloc.equity}% equity, ${alloc.debt}% debt/fixed income, ${alloc.gold}% gold, ${alloc.cash}% cash equivalents.`});
  notes.push({tag: surplus>0?'pos':'neg',
    text: surplus>0 ? `Monthly surplus after fixed needs is ${fmtINR(surplus)} \u2014 this is your working capital for goals.` : `Expenses and debt exceed income by ${fmtINR(-surplus)} \u2014 this needs to be addressed before any savings plan will hold.`});

  $('advisoryNotes').innerHTML = notes.map(n=>{
    const tagText = n.tag==='pos'?'Good':n.tag==='neg'?'Alert':'Note';
    return `<li><span class="tag ${n.tag}">${tagText}</span><span>${n.text}</span></li>`;
  }).join('');

  window.FinWiseState.goal = goal;
  window.FinWiseState.risk = risk;
  refreshAiTipsAvailability();
}

/* ---------------- 2. Live Claude call ---------------- */

/* The key never leaves this tab except as the auth header on the
   request to Anthropic. It is not stored, logged or echoed. */
$('apiKeyInput').addEventListener('input', e => {
  window.FinWiseRuntime.apiKey = e.target.value.trim();
});

function buildPrompt(payload){
  const { loan, credit, emi, goal, risk } = payload;
  return `You are a careful, factual financial-advisory assistant embedded in a demo fintech app called FinWise AI (India-focused, amounts in INR).

Given the structured session data below, respond with ONLY a single valid JSON object (no markdown fences, no prose outside the JSON) matching exactly this schema:

{
  "risk_classification": { "tier": "Low" | "Medium" | "High", "summary": "one sentence" },
  "loan_eligibility_summary": "2-3 sentences",
  "credit_evaluation_summary": "2-3 sentences",
  "personalized_recommendations": ["short actionable point", "..."],
  "credit_improvement_strategies": ["short actionable point", "..."],
  "emi_optimization_suggestions": ["short actionable point", "..."]
}

Keep each array to 3-4 concise, concrete, non-generic bullet points grounded in the numbers given. If a tool wasn't run yet, reason sensibly from whatever data IS available rather than inventing figures.

SESSION DATA
Loan Eligibility Tool: ${loan ? JSON.stringify(loan) : "not run yet"}
Credit Analyzer Tool: ${credit ? JSON.stringify(credit) : "not run yet"}
EMI Calculator Tool: ${emi ? JSON.stringify(emi) : "not run yet"}
Stated goal: ${goal || "not specified"}
Stated risk appetite: ${risk || "not specified"}

Respond with the JSON object only.`;
}

/** Parse Claude's reply into the structured object the renderer expects. */
function parseTipsResponse(data){
  const text = (data.content||[]).map(b=>b.text||'').join('\n');
  const cleaned = text.replace(/```json|```/g,'').trim();
  return JSON.parse(cleaned);
}

/** Default path: browser talks to Anthropic directly with the user's key. */
async function callClaudeDirect(prompt, apiKey){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key': apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body: JSON.stringify({
      model:'claude-sonnet-5',
      max_tokens:1200,
      messages:[{role:'user', content: prompt}]
    })
  });
  const data = await res.json();
  if(!res.ok){ throw new Error(data?.error?.message || `Request failed (${res.status})`); }
  return parseTipsResponse(data);
}

/** Optional path: serverless proxy holds the key and returns the JSON. */
async function callTipsProxy(endpoint, payload){
  const res = await fetch(endpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(!res.ok || data.error){ throw new Error(data.error || `Request failed (${res.status})`); }
  return data;
}

async function generateAiTips(){
  const btn = $('generateAiTips');
  const apiKey = window.FinWiseRuntime.apiKey;
  const proxy = (window.FINWISE_CONFIG && window.FINWISE_CONFIG.AI_TIPS_ENDPOINT) || '';

  if(!apiKey && !proxy){
    showNote('aiTipsStatus', 'Paste your Claude API key above first \u2014 it stays in this browser tab only.', 'neu-note');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Thinking\u2026';
  showNote('aiTipsStatus', 'Contacting Claude for a personalized read on your session\u2026', 'neu-note');
  $('aiTipsResults').innerHTML = '';

  const payload = {
    loan: window.FinWiseState.loan,
    credit: window.FinWiseState.credit,
    emi: window.FinWiseState.emi,
    goal: window.FinWiseState.goal || $('goal').value,
    risk: window.FinWiseState.risk || $('risk').value
  };

  try{
    const structured = apiKey
      ? await callClaudeDirect(buildPrompt(payload), apiKey)
      : await callTipsProxy(proxy, payload);
    renderAiTips(structured);
    showNote('aiTipsStatus', 'Generated live by Claude based on your current session.', 'pos-note');
  }catch(err){
    const hint = apiKey
      ? `Couldn't reach Claude (${err.message}). Check your API key and try again.`
      : `Couldn't reach the AI backend (${err.message}). Check AI_TIPS_ENDPOINT in js/config.js, or paste your own API key above.`;
    showNote('aiTipsStatus', hint, 'neg-note');
  }finally{
    btn.disabled = false;
    btn.textContent = 'Generate AI Financial Tips';
  }
}

function renderAiTips(data){
  const el = $('aiTipsResults');
  const riskTag = data.risk_classification?.tier === 'Low' ? 'pos' : data.risk_classification?.tier === 'Medium' ? 'neu' : 'neg';

  const section = (title, items) => `
    <div class="ai-section">
      <div class="ai-section-title">${title}</div>
      <ul class="factor-list">${(items||[]).map(i=>`<li><span class="tag neu">Tip</span><span>${i}</span></li>`).join('') || '<li><span>No suggestions returned.</span></li>'}</ul>
    </div>`;

  el.innerHTML = `
    <div class="ai-section">
      <div class="ai-section-title">Risk Classification</div>
      <p><span class="tag ${riskTag}">${data.risk_classification?.tier || 'Unknown'}</span> ${data.risk_classification?.summary || ''}</p>
    </div>
    <div class="ai-section"><div class="ai-section-title">Loan Eligibility Summary</div><p>${data.loan_eligibility_summary || 'Run the Loan Eligibility tool for a tailored read.'}</p></div>
    <div class="ai-section"><div class="ai-section-title">Credit Evaluation Summary</div><p>${data.credit_evaluation_summary || 'Run the Credit Analyzer for a tailored read.'}</p></div>
    ${section('Personalized Recommendations', data.personalized_recommendations)}
    ${section('Credit Improvement Strategies', data.credit_improvement_strategies)}
    ${section('EMI Optimization Suggestions', data.emi_optimization_suggestions)}
  `;
}

$('runBudgetSnapshot').addEventListener('click', runBudgetSnapshot);
$('generateAiTips').addEventListener('click', generateAiTips);
