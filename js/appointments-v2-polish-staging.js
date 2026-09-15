/* LIW Cards — Appointments V2 usability polish, staging only. */
(function(){
  'use strict';
  if(window.__LIW_APPOINTMENTS_V2_POLISH__)return;
  window.__LIW_APPOINTMENTS_V2_POLISH__=true;

  const $=s=>document.querySelector(s);
  let user=null;
  let card=null;
  let dirty=false;
  let lastSavedAt=0;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function activeCardId(){return $('#booking-card-select')?.value||'';}
  function routeMode(){return document.querySelector('input[name="booking-route-mode"]:checked')?.value||'liw';}
  function serviceCount(){return document.querySelectorAll('#booking-service-list [data-service-enabled]:checked').length;}
  function bookingEnabled(){return $('#booking-enabled')?.checked===true;}
  function calendarState(){
    const root=$('#booking-google-calendar');
    if(!root||root.hidden)return {label:'Calendar off',kind:'muted'};
    const badge=root.querySelector('.booking-google-status');
    const text=String(badge?.textContent||'').trim();
    if(/connected/i.test(text)&&!/not connected|reconnect/i.test(text))return {label:'Google connected',kind:'good'};
    if(/reconnect/i.test(text))return {label:'Google reconnect',kind:'warn'};
    return {label:'Google not connected',kind:'muted'};
  }
  function publicUrl(){
    if(!card?.slug)return '#';
    return `card.html?slug=${encodeURIComponent(card.slug)}`;
  }
  function ownerLabel(){
    const name=String(card?.full_name||'').trim();
    const company=String(card?.company_name||card?.internal_label||'').trim();
    if(name&&company&&name.toLowerCase()!==company.toLowerCase())return `${name} — ${company}`;
    return name||company||'Selected card';
  }

  async function loadCard(){
    if(!user||!activeCardId())return;
    const {data,error}=await supabaseClient.from('digital_cards')
      .select('id,slug,full_name,company_name,internal_label,status')
      .eq('id',activeCardId()).eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    card=data||null;
  }

  function injectOverview(){
    const panel=$('.booking-layout > div:first-child .booking-panel');
    const head=panel?.querySelector('.booking-panel-head');
    if(!panel||!head)return;
    let bar=$('#booking-v2-overview');
    if(!bar){
      bar=document.createElement('div');
      bar.id='booking-v2-overview';
      bar.className='booking-v2-overview';
      head.insertAdjacentElement('afterend',bar);
    }
    renderOverview();
  }

  function renderOverview(){
    const root=$('#booking-v2-overview');
    if(!root)return;
    const mode=routeMode();
    const cal=calendarState();
    const enabled=bookingEnabled();
    const count=serviceCount();
    root.innerHTML=`
      <div class="booking-v2-overview-copy">
        <span class="booking-v2-overview-kicker">Selected card</span>
        <strong title="${esc(ownerLabel())}">${esc(ownerLabel())}</strong>
      </div>
      <div class="booking-v2-health" aria-label="Booking setup status">
        <span class="booking-v2-chip ${enabled?'good':'muted'}"><i></i>${enabled?'Booking on':'Booking off'}</span>
        <span class="booking-v2-chip ${mode==='liw'?'good':'external'}"><i></i>${mode==='liw'?'LIW booking':'External provider'}</span>
        ${mode==='liw'?`<span class="booking-v2-chip ${cal.kind}"><i></i>${esc(cal.label)}</span><span class="booking-v2-chip ${count?'good':'warn'}"><i></i>${count} service${count===1?'':'s'} active</span>`:''}
      </div>
      <div class="booking-v2-overview-actions">
        ${card?.slug?`<a class="btn btn-light btn-sm" href="${esc(publicUrl())}" target="_blank" rel="noopener"><i data-lucide="external-link" size="14"></i> Test booking</a>`:''}
      </div>`;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function addStepLabels(){
    const route=$('#booking-route-v2');
    if(route&&!route.querySelector('[data-liw-step]')){
      const heading=route.querySelector('.booking-route-heading > div');
      heading?.insertAdjacentHTML('afterbegin','<span class="booking-v2-step" data-liw-step>1 · Choose booking method</span>');
    }
    const paid=$('#paid-scheduling-settings');
    const availability=paid?.querySelector('.booking-subhead');
    if(availability&&!availability.querySelector('[data-liw-step]'))availability.querySelector('div')?.insertAdjacentHTML('afterbegin','<span class="booking-v2-step" data-liw-step>2 · Set your schedule</span>');
    const services=$('.booking-services-head');
    if(services&&!services.querySelector('[data-liw-step]'))services.querySelector('div')?.insertAdjacentHTML('afterbegin','<span class="booking-v2-step" data-liw-step>3 · Choose services</span>');
    const google=$('#booking-google-calendar .booking-google-brand > div');
    if(google&&!google.querySelector('[data-liw-step]'))google.insertAdjacentHTML('afterbegin','<span class="booking-v2-step" data-liw-step>4 · Connect your calendar</span>');
  }

  function improveActivity(){
    const panel=$('.booking-layout > div:last-child .booking-panel');
    const head=panel?.querySelector('.booking-panel-head');
    if(head&&!head.querySelector('.booking-v2-activity-helper')){
      const copy=head.querySelector('div');
      copy?.insertAdjacentHTML('beforeend','<span class="booking-v2-activity-helper">Your newest requests and appointments appear here.</span>');
    }
    const empty=$('#booking-feed .booking-empty');
    if(empty&&/no client activity|loading activity/i.test(empty.textContent||'')){
      empty.innerHTML='<div class="booking-v2-empty-icon"><i data-lucide="calendar-plus" size="20"></i></div><strong>No appointments yet</strong><span>Use <b>Test booking</b> to run through the customer experience, or share the public card.</span>';
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
  }

  function markDirty(){
    if(dirty)return;
    dirty=true;
    const save=$('#booking-save');
    if(save){save.classList.add('booking-v2-save-dirty');save.dataset.originalLabel=save.dataset.originalLabel||save.innerHTML;save.innerHTML='<i data-lucide="save" size="17"></i> Save changes';}
    const bar=$('.booking-savebar');
    if(bar&&!bar.querySelector('.booking-v2-unsaved'))bar.insertAdjacentHTML('afterbegin','<span class="booking-v2-unsaved"><i></i> Unsaved changes</span>');
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function clearDirty(){
    dirty=false;lastSavedAt=Date.now();
    $('.booking-v2-unsaved')?.remove();
    const save=$('#booking-save');
    if(save){save.classList.remove('booking-v2-save-dirty');save.innerHTML='<i data-lucide="check" size="17"></i> Saved';setTimeout(()=>{if(!dirty&&save)save.innerHTML='<i data-lucide="check" size="17"></i> Save booking setup';if(window.lucide)try{lucide.createIcons();}catch(_){ }},1400);}
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function wireDirtyState(){
    const panel=$('.booking-layout > div:first-child .booking-panel');
    if(!panel||panel.dataset.liwDirtyWired)return;
    panel.dataset.liwDirtyWired='true';
    panel.addEventListener('input',event=>{
      if(event.target.closest('#booking-google-calendar'))return;
      if(event.target.id==='booking-route-test-link')return;
      markDirty();setTimeout(renderOverview,0);
    });
    panel.addEventListener('change',event=>{
      if(event.target.closest('#booking-google-calendar'))return;
      markDirty();setTimeout(renderOverview,0);
    });
    $('#booking-save')?.addEventListener('click',()=>{
      const save=$('#booking-save');
      setTimeout(()=>{
        if(save&&!save.disabled&&Date.now()-lastSavedAt>500)clearDirty();
      },1100);
    });
  }

  function observe(){
    const target=$('.booking-main')||document.body;
    let timer=0;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{addStepLabels();improveActivity();renderOverview();},80);
    }).observe(target,{childList:true,subtree:true});
  }

  async function refresh(){
    try{await loadCard();injectOverview();addStepLabels();improveActivity();wireDirtyState();renderOverview();}catch(error){console.warn('[LIW Appointments V2 polish]',error);}
  }

  async function init(){
    try{
      user=await requireUser();if(!user)return;
      await refresh();
      $('#booking-card-select')?.addEventListener('change',()=>setTimeout(()=>{dirty=false;$('.booking-v2-unsaved')?.remove();refresh();},180));
      observe();
      setTimeout(refresh,500);
      setTimeout(refresh,1200);
    }catch(error){console.warn('[LIW Appointments V2 polish init]',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,160),{once:true});
  else setTimeout(init,160);
})();
