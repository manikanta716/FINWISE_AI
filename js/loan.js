/* ============================================================
   FinWise AI - Loan Eligibility Module
   Rule-based underwriting:
     - Eligible ceiling = (income - existing obligations) x a
       credit-tier income multiplier (a common pre-qualification
       heuristic Indian lenders quote, e.g. "up to 20x salary").
     - Risk tier (Low/Medium/High) reflects general credit-
       worthiness: credit score + existing debt burden -
       independent of any specific amount being requested.
     - Verdict combines risk tier with the ceiling.
     - Amount + tenure are OPTIONAL: if set, we also show an
       indicative EMI for that request and flag whether it fits
       inside the eligible ceiling.
   ============================================================ */

bindRange('income','v_income', v=>fmtINR(v));
bindRange('obl','v_obl', v=>fmtINR(v));
bindRange('amt','v_amt', v=>fmtINR(v));
bindRange('ten','v_ten', v=>v);
bindRange('cs','v_cs', v=>v);
bindRange('age','v_age', v=>v);

function creditTierMultiplier(cs){
  if(cs>=750) return 24;
  if(cs>=700) return 20;
  if(cs>=650) return 15;
  if(cs>=600) return 10;
  if(cs>=550) return 6;
  return 3;
}

/* Rate premiums keyed case-insensitively so the lookup keeps working
   whatever casing the <select> in index.html uses for its values. */
const LOAN_TYPE_PREMIUM = {
  personal: 2.0,
  home:     0,
  vehicle:  1.0,
  auto:     1.0,
  business: 2.5
};

function rateForScore(cs, loanType){
  let base;
  if(cs>=780) base=8.5;
  else if(cs>=750) base=9.5;
  else if(cs>=700) base=11.0;
  else if(cs>=650) base=13.0;
  else if(cs>=600) base=15.5;
  else base=18.5;
  const adj = LOAN_TYPE_PREMIUM[String(loanType).toLowerCase()] ?? 0;
  return +(base+adj).toFixed(2);
}

function riskTierFor(cs, income, obl){
  const existingDTI = income>0 ? obl/income : 1;
  if(cs>=700 && existingDTI<=0.20) return 'Low';
  if(cs>=600 && existingDTI<=0.40) return 'Medium';
  return 'High';
}

function verdictFor(riskTier, eligibleCeiling){
  if(riskTier==='Low' && eligibleCeiling>0) return 'Approved';
  if(riskTier==='Medium' && eligibleCeiling>0) return 'Conditional Review';
  return 'Not Eligible';
}

function runLoanEligibility(){
  const income = Number($('income').value);
  const obl = Number($('obl').value);
  const amt = Number($('amt').value);
  const ten = Number($('ten').value);
  const cs = Number($('cs').value);
  const age = Number($('age').value);
  const emp = $('emp').value;
  const loanType = $('loanType').value;

  const rate = rateForScore(cs, loanType);
  const riskTier = riskTierFor(cs, income, obl);
  const adjIncome = Math.max(0, income - obl);
  const eligibleCeiling = Math.round(adjIncome * creditTierMultiplier(cs));
  const verdict = verdictFor(riskTier, eligibleCeiling);

  // Optional indicative EMI for the specific amount/tenure requested
  const requestEmi = emiFor(amt, rate, ten);
  const fitsWithinCeiling = amt <= eligibleCeiling;

  const result = {
    income, obl, amt, ten, cs, age, emp, loanType,
    rate, riskTier, eligibleCeiling, verdict,
    requestEmi: Math.round(requestEmi),
    fitsWithinCeiling,
    totalRepayment: Math.round(requestEmi*ten)
  };

  window.FinWiseState.loan = result;
  renderLoanReceipt(result);
  if(typeof refreshAiTipsAvailability === 'function') refreshAiTipsAvailability();
}

function renderLoanReceipt(d){
  const wrap = $('loanResultWrap');
  const riskClass = d.riskTier==='Low' ? 'pos' : d.riskTier==='Medium' ? 'neu' : 'neg';
  wrap.innerHTML = `
    <div class="receipt">
      <div class="perf"></div>
      <div class="receipt-inner">
        <div class="receipt-title">FinWise AI \u2014 Underwriting Slip</div>
        <div class="receipt-sub">${d.loanType.toUpperCase()} LOAN \u00b7 CREDIT SCORE ${d.cs}</div>
        <div class="stamp-row">
          <div class="stamp ${d.verdict==='Approved'?'approve':d.verdict==='Conditional Review'?'review':'decline'}">${d.verdict}</div>
          <span class="tag ${riskClass} risk-pill">${d.riskTier} Risk</span>
        </div>
        <div class="rline"><span class="rlabel">Eligible Loan Amount</span><span class="rval">${fmtINR(d.eligibleCeiling)}</span></div>
        <div class="rline"><span class="rlabel">Applicable Interest Rate</span><span class="rval">${d.rate}% p.a.</span></div>
        <div class="rline"><span class="rlabel">Existing Obligations</span><span class="rval">${fmtINR(d.obl)}</span></div>
        <div class="rline"><span class="rlabel">\u2014 Requested Amount</span><span class="rval">${fmtINR(d.amt)}</span></div>
        <div class="rline"><span class="rlabel">\u2014 Indicative EMI (${d.ten} mo)</span><span class="rval">${fmtINR(d.requestEmi)}</span></div>
        <div class="rline"><span class="rlabel">\u2014 Total Repayment</span><span class="rval">${fmtINR(d.totalRepayment)}</span></div>
        <div class="fit-note ${d.fitsWithinCeiling?'fit-ok':'fit-warn'}">
          ${d.fitsWithinCeiling
            ? 'Your requested amount is within your eligible ceiling.'
            : `Your requested amount exceeds your eligible ceiling by ${fmtINR(d.amt-d.eligibleCeiling)} \u2014 consider a lower amount or a longer tenure.`}
        </div>
      </div>
      <div class="perf"></div>
    </div>
  `;
}

$('runLoan').addEventListener('click', runLoanEligibility);
