/* LIW Cards staging — make Appointments card picker owner-first and easy to scan. */
(function(){
  'use strict';
  if(window.__LIW_APPOINTMENTS_NAME_FIRST_PICKER__)return;
  window.__LIW_APPOINTMENTS_NAME_FIRST_PICKER__=true;

  const select=()=>document.querySelector('#booking-card-select');
  const clean=value=>String(value??'').trim();
  const norm=value=>clean(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  const isPlaceholder=value=>{
    const text=norm(value);
    return !text||['name','full name','your name','untitled card','company','company name','business','business name','card','card name'].includes(text);
  };
  const meaningful=value=>isPlaceholder(value)?'':clean(value);

  function fallbackCardName(card){
    const internal=meaningful(card?.internal_label);
    const company=meaningful(card?.company_name);
    if(company)return company;
    if(internal)return internal;
    const slug=meaningful(card?.slug);
    return slug?slug.replace(/[-_]+/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase()):'Untitled card';
  }

  function optionLabel(card){
    const person=meaningful(card?.full_name);
    const company=meaningful(card?.company_name);
    const internal=meaningful(card?.internal_label);
    const cardName=company||internal||fallbackCardName(card);
    const status=card?.status==='published'?'Published':'Draft';
    if(person){
      return `${person}${cardName&&norm(cardName)!==norm(person)?` — ${cardName}`:''} · ${status}`;
    }
    return `No name set — ${cardName} · ${status}`;
  }

  let user=null;
  let cards=[];

  async function load(){
    if(!window.supabaseClient||typeof requireUser!=='function')return;
    try{
      user=await requireUser();
      if(!user)return;
      const {data,error}=await supabaseClient
        .from('digital_cards')
        .select('id,slug,company_name,full_name,internal_label,status,updated_at')
        .eq('user_id',user.id)
        .order('updated_at',{ascending:false});
      if(error)throw error;
      cards=data||[];
      refresh();
    }catch(error){
      console.warn('[LIW Appointments] name-first picker:',error);
    }
  }

  function refresh(){
    const picker=select();
    if(!picker||!cards.length)return;
    const map=new Map(cards.map(card=>[String(card.id),card]));
    [...picker.options].forEach(option=>{
      const card=map.get(String(option.value));
      if(!card)return;
      const label=optionLabel(card);
      if(option.textContent!==label)option.textContent=label;
      option.title=label;
    });
    const selected=map.get(String(picker.value));
    if(selected)picker.title=optionLabel(selected);
  }

  const observer=new MutationObserver(()=>refresh());
  function watch(){
    const picker=select();
    if(!picker){setTimeout(watch,100);return;}
    observer.observe(picker,{childList:true,subtree:true});
    picker.addEventListener('change',()=>setTimeout(refresh,0));
    load();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});
  else watch();
})();
