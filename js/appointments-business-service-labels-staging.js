/* LIW Cards staging — make business ownership obvious throughout Appointments. */
(function(){
  'use strict';
  if(window.__LIW_APPOINTMENT_BUSINESS_LABELS__)return;
  window.__LIW_APPOINTMENT_BUSINESS_LABELS__=true;

  const $=selector=>document.querySelector(selector);
  let user=null;
  let cards=[];
  let cardMap=new Map();
  let previousLabelTimer=0;
  let previousLabelRunning=false;

  function escText(value){return String(value??'').trim();}
  function normalize(value){return String(value??'').trim().toLowerCase();}
  function cleanPlaceholder(value){
    return normalize(value)
      .replace(/[«»{}\[\]<>]/g,'')
      .replace(/[_-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function meaningful(value){
    const raw=escText(value);
    if(!raw)return '';
    const cleaned=cleanPlaceholder(raw);
    const placeholders=new Set(['name','full name','your name','company','company name','business','business name','card','card name']);
    return placeholders.has(cleaned)?'':raw;
  }
  function personName(card){return meaningful(card?.full_name);}
  function cardName(card){
    const internal=meaningful(card?.internal_label);
    const company=meaningful(card?.company_name);
    if(internal)return internal;
    if(company)return company;
    const slug=meaningful(card?.slug);
    return slug?slug.replace(/[-_]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase()):'Untitled card';
  }
  function businessName(card){
    return meaningful(card?.company_name)||meaningful(card?.internal_label)||personName(card)||'Untitled business';
  }
  function displayCardLabel(card){
    const cardText=cardName(card);
    const person=personName(card);
    return person&&normalize(person)!==normalize(cardText)?`${cardText} — ${person}`:cardText;
  }
  function serviceSignature(row){
    return JSON.stringify([
      normalize(row?.name),
      normalize(row?.description),
      Number(row?.price_cents??-1),
      normalize(row?.payment_url)
    ]);
  }
  function activeCardId(){return $('#booking-card-select')?.value||'';}
  function activeCard(){return cardMap.get(String(activeCardId()))||null;}
  function requestedCardId(){return new URLSearchParams(location.search).get('card')||'';}

  async function loadCards(){
    if(!user)return;
    const {data,error}=await supabaseClient
      .from('digital_cards')
      .select('id,slug,company_name,full_name,internal_label,status,updated_at')
      .eq('user_id',user.id)
      .order('updated_at',{ascending:false});
    if(error)throw error;
    cards=data||[];
    cardMap=new Map(cards.map(card=>[String(card.id),card]));
  }

  async function applyRequestedCard(){
    const requested=requestedCardId();
    if(!requested||!cardMap.has(String(requested)))return false;
    for(let attempt=0;attempt<35;attempt+=1){
      const select=$('#booking-card-select');
      if(select&&[...select.options].some(option=>String(option.value)===String(requested))){
        const changed=String(select.value)!==String(requested);
        select.value=requested;
        if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
        setTimeout(refreshVisibleLabels,100);
        return true;
      }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    return false;
  }

  function annotateCardPicker(){
    const select=$('#booking-card-select');
    if(!select||!cards.length)return;
    [...select.options].forEach(option=>{
      const card=cardMap.get(String(option.value));
      if(!card)return;
      const label=`${displayCardLabel(card)}${card.status==='published'?'':' · Draft'}`;
      if(option.textContent!==label)option.textContent=label;
    });
  }

  function annotateCurrentServices(){
    const business=businessName(activeCard());
    document.querySelectorAll('#booking-service-list .booking-service-row').forEach(row=>{
      const strong=row.querySelector('.booking-service-copy strong');
      if(!strong)return;
      if(!strong.dataset.liwOriginalServiceName)strong.dataset.liwOriginalServiceName=strong.textContent.trim();
      const serviceName=strong.dataset.liwOriginalServiceName||strong.textContent.trim();
      const label=`${business} — ${serviceName}`;
      if(strong.textContent!==label)strong.textContent=label;
      strong.title=`Business: ${business}`;
    });
  }

  function annotateNewServiceDialog(){
    const copy=$('#booking-service-dialog-copy');
    const newView=$('#booking-new-service-view');
    if(!copy||!newView||newView.hidden)return;
    const label=`Create a service for ${businessName(activeCard())}.`;
    if(copy.textContent!==label)copy.textContent=label;
  }

  async function previousCandidates(){
    const currentId=activeCardId();
    if(!currentId||!cards.length)return [];
    const ids=cards.map(card=>card.id);
    const [allResult,currentResult]=await Promise.all([
      supabaseClient.from('card_services')
        .select('id,card_id,name,description,price_cents,payment_url,is_enabled,created_at')
        .in('card_id',ids)
        .eq('is_enabled',true)
        .order('created_at',{ascending:false}),
      supabaseClient.from('card_services')
        .select('id,card_id,name,description,price_cents,payment_url,is_enabled')
        .eq('card_id',currentId)
        .eq('is_enabled',true)
    ]);
    if(allResult.error)throw allResult.error;
    if(currentResult.error)throw currentResult.error;
    const currentSignatures=new Set((currentResult.data||[]).map(serviceSignature));
    const seen=new Set();
    const items=[];
    (allResult.data||[]).forEach(row=>{
      if(String(row.card_id)===String(currentId))return;
      const signature=serviceSignature(row);
      if(currentSignatures.has(signature)||seen.has(signature))return;
      seen.add(signature);
      items.push(row);
    });
    return items;
  }

  async function annotatePreviousServices(){
    if(previousLabelRunning)return;
    const rows=[...document.querySelectorAll('#booking-previous-service-list .booking-previous-row')];
    if(!rows.length)return;
    previousLabelRunning=true;
    try{
      const items=await previousCandidates();
      rows.forEach((row,index)=>{
        const item=items[index];
        if(!item)return;
        const source=cardMap.get(String(item.card_id));
        const business=businessName(source);
        const strong=row.querySelector('strong');
        const em=row.querySelector('em');
        if(strong){
          const serviceName=escText(item.name)||strong.textContent.trim();
          const label=`${business} — ${serviceName}`;
          if(strong.textContent!==label)strong.textContent=label;
          strong.title=`Business: ${business}`;
        }
        if(em){
          const sourceLabel=`Business: ${business}`;
          if(em.textContent!==sourceLabel)em.textContent=sourceLabel;
        }
      });
    }catch(error){
      console.warn('[LIW Appointments] business labels:',error);
    }finally{
      previousLabelRunning=false;
    }
  }

  function schedulePreviousLabels(delay=60){
    if(previousLabelTimer)clearTimeout(previousLabelTimer);
    previousLabelTimer=setTimeout(()=>{
      previousLabelTimer=0;
      annotatePreviousServices();
    },delay);
  }

  function refreshVisibleLabels(){
    annotateCardPicker();
    annotateCurrentServices();
    annotateNewServiceDialog();
    if(!$('#booking-previous-service-view')?.hidden)schedulePreviousLabels(20);
  }

  async function init(){
    try{
      user=await requireUser();
      if(!user)return;
      await loadCards();
      refreshVisibleLabels();
      applyRequestedCard().catch(error=>console.warn('[LIW Appointments] requested card:',error));

      $('#booking-card-select')?.addEventListener('change',()=>setTimeout(refreshVisibleLabels,80));
      $('#booking-add-service')?.addEventListener('click',()=>setTimeout(annotateNewServiceDialog,60));
      $('#booking-use-previous')?.addEventListener('click',()=>schedulePreviousLabels(140));

      const serviceRoot=$('#booking-service-list');
      if(serviceRoot){
        new MutationObserver(()=>annotateCurrentServices()).observe(serviceRoot,{childList:true,subtree:true});
      }
      const previousRoot=$('#booking-previous-service-list');
      if(previousRoot){
        new MutationObserver(()=>schedulePreviousLabels(40)).observe(previousRoot,{childList:true,subtree:true});
      }
    }catch(error){
      console.warn('[LIW Appointments] unable to load business labels:',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* Appointments V2 staging-only asset loader. This file is only present on appointments.html. */
(function mountAppointmentsV2Owner(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(!document.querySelector('link[data-liw-appointments-v2]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/booking-appointments-v2-staging.css?v=20260909-1';
    style.dataset.liwAppointmentsV2='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-appointments-v2]')){
    const script=document.createElement('script');
    script.src='js/booking-appointments-v2-staging.js?v=20260909-1';
    script.defer=true;
    script.dataset.liwAppointmentsV2='true';
    document.body.appendChild(script);
  }
})();