/* ============================================================
   FinWise AI - Cloud History Module
   Persists a snapshot of the current session to a Google Sheet
   via a Google Apps Script Web App, and lists past snapshots.

   The endpoint comes from the field on the page, so no deploy
   step is needed to try it. If SHEETS_ENDPOINT is set in
   js/config.js, that value pre-fills the field instead.
   ============================================================ */

function getSheetsEndpoint(){
  return window.FinWiseRuntime.sheetsEndpoint;
}

$('sheetsEndpointInput').addEventListener('input', e => {
  window.FinWiseRuntime.sheetsEndpoint = e.target.value.trim();
});

async function saveSessionToCloud(){
  const endpoint = getSheetsEndpoint();
  if(!endpoint){
    showNote('cloudNote', 'Paste your Google Apps Script URL above first (see the setup note below).', 'neu-note');
    return;
  }
  const summary = {
    loan: window.FinWiseState.loan,
    credit: window.FinWiseState.credit,
    emi: window.FinWiseState.emi,
    goal: window.FinWiseState.goal,
    risk: window.FinWiseState.risk
  };
  try{
    // Apps Script web apps don't reliably send CORS headers for POST,
    // so this is a fire-and-forget request (no readable response).
    await fetch(endpoint, {
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({ tool:'session-snapshot', summary })
    });
    showNote('cloudNote', 'Saved to your cloud history.', 'pos-note');
    setTimeout(loadCloudHistory, 800); // give Sheets a moment to append the row
  }catch(err){
    showNote('cloudNote', `Could not save (${err.message}).`, 'neg-note');
  }
}

async function loadCloudHistory(){
  const el = $('historyList');
  if(!el) return;
  const endpoint = getSheetsEndpoint();
  if(!endpoint){
    el.innerHTML = '<li><span class="tag neu">Setup</span><span>Paste your Google Apps Script URL above to enable cloud history.</span></li>';
    return;
  }
  try{
    const res = await fetch(endpoint + '?action=history');
    const data = await res.json();
    if(!data.ok || !data.records || !data.records.length){
      el.innerHTML = '<li><span class="tag neu">Empty</span><span>No saved records yet \u2014 run some tools and save a snapshot.</span></li>';
      return;
    }
    el.innerHTML = data.records.map(r=>{
      const when = new Date(r.timestamp).toLocaleString('en-IN');
      const bits = [];
      if(r.summary?.loan) bits.push(`Loan: ${r.summary.loan.verdict}`);
      if(r.summary?.credit) bits.push(`Credit: ${r.summary.credit.band}`);
      if(r.summary?.emi) bits.push(`EMI: ${fmtINR(r.summary.emi.emi)}`);
      return `<li><span class="tag neu">${when}</span><span>${bits.join(' \u00b7 ') || r.tool}</span></li>`;
    }).join('');
  }catch(err){
    el.innerHTML = `<li><span class="tag neg">Error</span><span>Could not load history (${err.message}).</span></li>`;
  }
}

$('saveToCloud').addEventListener('click', saveSessionToCloud);
$('refreshHistory').addEventListener('click', loadCloudHistory);
