/* ============================================================
   FinWise AI - Credit Analysis Module
   Two tools in one tab:
     1. Quick Classify - type a score you already know (300-900)
        and get an instant band + actionable recommendations.
     2. Detailed Analyzer - FICO-style five-factor simulator that
        computes a score from underlying behaviour, shown as a
        radar chart.
   ============================================================ */

/* ---------- Shared band logic ---------- */
function bandFor(score){
  if(score>=780) return {band:'Exceptional', color:'#7CC49E', tag:'pos'};
  if(score>=740) return {band:'Very Good',   color:'#9ED2A9', tag:'pos'};
  if(score>=670) return {band:'Good',        color:'#E3B36B', tag:'neu'};
  if(score>=581) return {band:'Fair',        color:'#E29489', tag:'neu'};
  return {band:'Poor', color:'#E06C5D', tag:'neg'};
}

const bandRecommendations = {
  'Exceptional': [
    'You qualify for the best available rates \u2014 keep utilization low and avoid unnecessary new inquiries.',
    'Maintain your on-time payment streak; it is the hardest factor to rebuild if broken.',
    'Review your credit mix occasionally, but don\u2019t open new accounts just to "optimize" further.'
  ],
  'Very Good': [
    'Push utilization under 10% to move into the top tier.',
    'Continue on-time payments \u2014 consistency over the next 6-12 months compounds fast at this level.',
    'Avoid more than one hard inquiry in the next year.'
  ],
  'Good': [
    'Pay down revolving balances \u2014 utilization is likely your biggest lever from here.',
    'Avoid new hard inquiries for the next few months while your average account age grows.',
    'Set up autopay for at least the minimum due, so a single missed payment never slips through.'
  ],
  'Fair': [
    'Prioritize on-time payments above everything else \u2014 this factor alone can move the score fastest.',
    'Work utilization down below 30%, then below 10% as a stretch goal.',
    'Hold off on new credit applications until the score recovers.'
  ],
  'Poor': [
    'Focus first on eliminating any missed or late payments going forward.',
    'Bring credit utilization down aggressively \u2014 pay more than the minimum wherever possible.',
    'Avoid new credit applications until the score shows sustained recovery; each hard inquiry compounds the damage.'
  ]
};

bindRange('quickScore','v_quickScore', v=>v);
bindRange('pay','v_pay', v=>v+'%');
bindRange('util','v_util', v=>v+'%');
bindRange('cage','v_cage', v=>v);
bindRange('acc','v_acc', v=>v);
bindRange('inq','v_inq', v=>v);

/* ---------- 1. Quick classify ---------- */
function runQuickClassify(){
  const score = Number($('quickScore').value);
  const b = bandFor(score);
  $('quickBandOut').textContent = b.band;
  $('quickBandOut').style.color = b.color;
  $('quickScoreEcho').textContent = score;
  $('quickRecs').innerHTML = bandRecommendations[b.band].map(r=>
    `<li><span class="tag ${b.tag}">${b.band}</span><span>${r}</span></li>`
  ).join('');

  window.FinWiseState.credit = { score, band: b.band, source: 'quick' };
  if(typeof refreshAiTipsAvailability === 'function') refreshAiTipsAvailability();
}

/* ---------- 2. Detailed factor-based analyzer ---------- */
let creditChart;

function runCreditAnalysis(){
  const pay = Number($('pay').value);
  const util = Number($('util').value);
  const cage = Number($('cage').value);
  const acc = Number($('acc').value);
  const inq = Number($('inq').value);

  const payScore = pay;
  const utilScore = util<=10?100: util<=30?85: util<=50?60: util<=75?35:10;
  const ageScore = Math.min(100, (cage/15)*100);
  const mixScore = acc===0?20 : acc<=2?55 : acc<=6?90 : acc<=10?75:55;
  const inqScore = inq===0?100 : inq<=2?85 : inq<=4?60 : inq<=6?35:10;

  const weighted = payScore*0.35 + utilScore*0.30 + ageScore*0.15 + mixScore*0.10 + inqScore*0.10;
  const score = Math.round(300 + (weighted/100)*600);
  const b = bandFor(score);

  $('scoreOut').textContent = score;
  $('scoreOut').style.color = b.color;
  $('scoreBand').textContent = b.band + ' \u00b7 300\u2013900 scale';

  const ctx = document.getElementById('creditChart');
  const data = {
    labels:['Payment History','Utilization','Credit Age','Account Mix','New Inquiries'],
    datasets:[{
      label:'Factor Strength',
      data:[payScore, utilScore, ageScore, mixScore, inqScore],
      backgroundColor:'rgba(201,162,39,0.22)',
      borderColor:'#C9A227',
      pointBackgroundColor:'#E4C24E',
      borderWidth:2
    }]
  };
  const opts = {
    responsive:true,
    scales:{ r:{
      angleLines:{color:'#33504F'}, grid:{color:'#33504F'},
      pointLabels:{color:'#ECE7D8', font:{family:'Public Sans', size:11}},
      ticks:{display:false, backdropColor:'transparent'},
      suggestedMin:0, suggestedMax:100
    }},
    plugins:{legend:{display:false}}
  };
  if(creditChart){ creditChart.data=data; creditChart.options=opts; creditChart.update(); }
  else { creditChart = new Chart(ctx, {type:'radar', data, options:opts}); }

  const factors = [
    {label:`On-time payments at ${pay}% \u2014 the single heaviest factor in your score.`, weight:payScore},
    {label:`Credit utilization at ${util}% of available limit.`, weight:utilScore},
    {label:`${cage} year(s) of credit history establishes track record.`, weight:ageScore},
    {label:`${acc} open account(s) shape your credit mix.`, weight:mixScore},
    {label:`${inq} hard inquiry(ies) in the last 12 months.`, weight:inqScore},
  ];
  $('factorList').innerHTML = factors.map(f=>{
    const tagClass = f.weight>=75?'pos':f.weight>=45?'neu':'neg';
    const tagText = f.weight>=75?'Strong':f.weight>=45?'Watch':'Weak';
    return `<li><span class="tag ${tagClass}">${tagText}</span><span>${f.label}</span></li>`;
  }).join('');

  window.FinWiseState.credit = { score, band: b.band, source: 'detailed', pay, util, cage, acc, inq };
  if(typeof refreshAiTipsAvailability === 'function') refreshAiTipsAvailability();
}

$('runQuickClassify').addEventListener('click', runQuickClassify);
$('runCredit').addEventListener('click', runCreditAnalysis);
