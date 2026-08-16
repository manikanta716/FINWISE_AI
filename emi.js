/* ============================================================
   FinWise AI - Standalone EMI Calculator Module
   User-controlled principal, annual rate and tenure. Unlike the
   Loan Eligibility tab, the rate here is fully manual so people
   can plan "what if" scenarios independent of a credit-score
   lookup.
   ============================================================ */

bindRange('emiPrincipal','v_emiPrincipal', v=>fmtINR(v));
bindRange('emiRate','v_emiRate', v=>v+'%');
bindRange('emiTenure','v_emiTenure', v=>v);

let emiChart;

function runEmiCalculator(){
  const principal = Number($('emiPrincipal').value);
  const rate = Number($('emiRate').value);
  const months = Number($('emiTenure').value);

  const emi = emiFor(principal, rate, months);
  const totalPayment = emi*months;
  const totalInterest = totalPayment - principal;

  $('emiOut').textContent = fmtINR(emi);
  $('emiTotalInterest').textContent = fmtINR(totalInterest);
  $('emiTotalPayment').textContent = fmtINR(totalPayment);
  $('emiPrincipalOut').textContent = fmtINR(principal);

  const ctx = document.getElementById('emiChart');
  const data = {
    labels:['Principal','Total Interest'],
    datasets:[{
      data:[principal, Math.max(0,totalInterest)],
      backgroundColor:['#2F6F4E','#B4791F'],
      borderColor:'#123437', borderWidth:3
    }]
  };
  const opts = {
    responsive:true,
    plugins:{ legend:{ labels:{color:'#ECE7D8', font:{family:'Public Sans', size:12}} } },
    cutout:'62%'
  };
  if(emiChart){ emiChart.data=data; emiChart.options=opts; emiChart.update(); }
  else { emiChart = new Chart(ctx, {type:'doughnut', data, options:opts}); }

  window.FinWiseState.emi = {
    principal, rate, months,
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment)
  };
  if(typeof refreshAiTipsAvailability === 'function') refreshAiTipsAvailability();
}

$('runEmi').addEventListener('click', runEmiCalculator);
