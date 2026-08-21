(function(){
  'use strict';

  function cleanPlan(value){return String(value||'Agency').replace(/\s+preview$/i,'').trim()||'Agency';}

  function sync(){
    const shell=document.querySelector('#settings .agency-settings-shell');
    if(!shell)return false;
    const plan=cleanPlan(document.getElementById('agency-sidebar-plan')?.textContent);
    const capacity=String(document.getElementById('agency-capacity-display')?.textContent||'').trim();
    const match=capacity.match(/(\d+)\s*\/\s*(\d+)/);
    const used=match?.[1]||String(document.getElementById('agency-card-count')?.textContent||'0').trim();
    const limit=match?.[2]||'';

    const summaryStats=shell.querySelectorAll('.agency-settings-summary-stats>span b');
    if(summaryStats[0])summaryStats[0].textContent=plan;
    if(summaryStats[1]&&capacity)summaryStats[1].textContent=capacity;

    shell.querySelectorAll('.agency-setting-row').forEach(row=>{
      const label=row.querySelector('.agency-setting-row-copy strong')?.textContent||'';
      if(label.includes('Current plan')){
        const value=row.querySelector('.agency-setting-value');
        if(value)value.textContent=plan;
      }
    });

    const planTitle=shell.querySelector('.agency-settings-plan-top strong');
    if(planTitle)planTitle.textContent=plan;
    const usedNode=shell.querySelector('.agency-settings-capacity-line span b');
    if(usedNode)usedNode.textContent=used;
    const limitNode=shell.querySelector('.agency-settings-capacity-line>strong');
    if(limitNode&&limit)limitNode.textContent=`${limit} capacity`;
    return true;
  }

  function boot(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(sync()||attempts>40)clearInterval(timer);
    },125);
    window.addEventListener('hashchange',()=>setTimeout(sync,0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
