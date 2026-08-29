(function(){
  'use strict';

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='css/domains-deals-staging.css?v=20260829-1';
  document.head.appendChild(css);

  let payload=null;
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(...args){
    const response=await originalFetch(...args);
    const url=String(args[0]?.url||args[0]||'');
    if(url.includes('/functions/v1/godaddy-domain-search')){
      response.clone().json().then(data=>{
        payload=data;
        setTimeout(refreshDeals,80);
      }).catch(()=>{});
    }
    return response;
  };

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-domain-years]')||event.target.closest('[data-domain-option]')){
      setTimeout(refreshDeals,20);
    }
  });

  const observer=new MutationObserver(()=>{
    if(payload)setTimeout(refreshDeals,20);
  });
  const result=document.getElementById('domain-result');
  if(result)observer.observe(result,{childList:true,subtree:true,characterData:true,attributes:true});

  function items(){
    if(Array.isArray(payload?.items))return payload.items;
    return payload?.domain?[payload]:[];
  }

  function selectedItem(){
    const name=String(document.getElementById('domain-result-name')?.textContent||'').trim().toLowerCase();
    return items().find(item=>String(item?.domain||'').trim().toLowerCase()===name)||null;
  }

  function money(value){
    if(!value||typeof value.value!=='number')return '';
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:value.currencyCode||'USD'}).format(value.value/100);}
    catch{return `$${(value.value/100).toFixed(2)}`;}
  }

  function refreshDeals(){
    const item=selectedItem();
    const panel=document.getElementById('domain-term-panel');
    if(!item||!panel)return;
    const deals=Array.isArray(item.termDeals)?item.termDeals:[];
    if(!deals.length)return;

    panel.querySelectorAll('[data-domain-years]').forEach(button=>{
      const years=Number(button.dataset.domainYears)||1;
      const deal=deals.find(row=>Number(row?.years)===years);
      let badge=button.querySelector('.liw-term-deal-badge');
      if(years===1||!deal||Number(deal?.savings?.value||0)<=0){
        badge?.remove();
        return;
      }
      if(!badge){
        badge=document.createElement('small');
        badge.className='liw-term-deal-badge';
        button.appendChild(badge);
      }
      const pct=Number(deal.discountPercent)||0;
      badge.textContent=pct>0?`Save ${pct}%`:`Save ${money(deal.savings)}`;
    });

    const active=panel.querySelector('[data-domain-years].active')||panel.querySelector('[aria-pressed="true"]');
    const years=Number(active?.dataset?.domainYears)||1;
    const deal=deals.find(row=>Number(row?.years)===years);
    const total=document.getElementById('domain-term-total');
    const breakdown=document.getElementById('domain-term-breakdown');
    if(!deal||!total||!breakdown)return;

    panel.querySelector('.liw-term-deal-summary')?.remove();
    total.textContent=money(deal.dealTotal)||total.textContent;

    if(years>1&&Number(deal?.savings?.value||0)>0){
      const summary=document.createElement('div');
      summary.className='liw-term-deal-summary';
      summary.innerHTML=`<span>Regular ${escapeText(money(deal.regularTotal))}</span><strong>You save ${escapeText(money(deal.savings))}</strong>`;
      total.insertAdjacentElement('afterend',summary);
      breakdown.textContent=`${years}-year LIW savings applied. Final locked registration quote will be confirmed before payment.`;
    }else{
      breakdown.textContent='Choose 2, 3, 5 or 10 years to unlock a multi-year LIW deal.';
    }
  }

  function escapeText(value){
    return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
})();