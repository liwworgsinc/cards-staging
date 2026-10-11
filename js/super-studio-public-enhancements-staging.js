/* LIW Cards staging — Super Studio public completion layer.
   Keeps business hours and deposit presentation attached to independent Super Studio state. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PUBLIC_ENHANCEMENTS__)return;
  window.__LIW_SUPER_STUDIO_PUBLIC_ENHANCEMENTS__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let lastCardId='';

  function client(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||null;}
  }

  function depositLabel(meta){
    if(!meta||meta.depositType==='none'||!meta.depositType)return '';
    const raw=String(meta.depositValue||'').trim();
    if(meta.depositType==='percent')return raw?`Deposit: ${raw.replace(/%$/,'')}%`:'Percentage deposit required';
    if(meta.depositType==='flat')return raw?`Deposit: ${raw.startsWith('$')?raw:`$${raw}`}`:'Deposit required';
    return '';
  }

  function apply(data){
    const host=q('#super-studio-public');
    if(!host||!data)return false;
    const hours=String(data.studioInfo?.hours||'').trim();
    const info=q('.ss-info > div',host);
    if(hours&&info&&!q('[data-ss-public-hours]',info)){
      const row=document.createElement('p');
      row.dataset.ssPublicHours='true';
      row.innerHTML=`<strong>Hours:</strong> ${esc(hours)}`;
      info.prepend(row);
    }

    const metas=Array.isArray(data.serviceMeta)?data.serviceMeta:[];
    qa('.ss-service-card',host).forEach((card,index)=>{
      if(q('[data-ss-public-deposit]',card))return;
      const name=String(q('h3',card)?.textContent||'').trim();
      const meta=metas.find(item=>String(item?.serviceName||'').trim().toLowerCase()===name.toLowerCase())||metas[index];
      const label=depositLabel(meta);
      if(!label)return;
      const bottom=q('.ss-service-bottom',card);
      if(!bottom)return;
      const note=document.createElement('small');
      note.dataset.ssPublicDeposit='true';
      note.textContent=label;
      note.style.display='block';
      note.style.gridColumn='1 / -1';
      note.style.color='#667085';
      note.style.fontSize='.56rem';
      bottom.insertAdjacentElement('afterend',note);
    });
    return true;
  }

  async function load(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio')return;
    if(lastCardId===card.id&&q('[data-ss-public-enhanced]'))return;
    const c=client();if(!c)return;
    try{
      const {data,error}=await c.from('super_studio_state_staging').select('data').eq('card_id',card.id).maybeSingle();
      if(error)throw error;
      let tries=0;
      const timer=setInterval(()=>{
        tries+=1;
        if(apply(data?.data||{})){
          lastCardId=card.id;
          q('#super-studio-public')?.setAttribute('data-ss-public-enhanced','true');
          clearInterval(timer);
        }else if(tries>40)clearInterval(timer);
      },100);
    }catch(error){console.warn('Super Studio public enhancement load:',error);}
  }

  document.addEventListener('liw:public-card-rendered',event=>void load(event.detail?.card));
  setTimeout(()=>{try{const card=typeof publicCard!=='undefined'?publicCard:null;if(card)void load(card);}catch(_){}},0);
})();
