/* LIW Cards — STAGING ONLY — clearer Virtual Background card labels */
(function(){
  'use strict';

  function cardLabel(card){
    const company=String(card?.company_name||'').trim();
    const person=String(card?.full_name||'').trim();
    const fallback=String(card?.internal_label||'Untitled card').trim()||'Untitled card';
    const identity=[company,person].filter(Boolean).join(' · ')||fallback;
    const status=card?.status==='published'?'Published':'Draft';
    return `${identity} · ${status}`;
  }

  function syncCardLabels(){
    const select=document.getElementById('vb-card-select');
    if(!select)return;

    let cards=[];
    try{
      if(typeof virtualBackgroundState!=='undefined'&&Array.isArray(virtualBackgroundState.cards)){
        cards=virtualBackgroundState.cards;
      }
    }catch(_){return;}
    if(!cards.length)return;

    const selected=select.value;
    cards.forEach(card=>{
      const option=Array.from(select.options).find(item=>item.value===String(card.id));
      if(!option)return;
      const label=cardLabel(card);
      if(option.textContent!==label)option.textContent=label;
    });
    if(selected)select.value=selected;
  }

  const select=document.getElementById('vb-card-select');
  if(select){
    const observer=new MutationObserver(syncCardLabels);
    observer.observe(select,{childList:true,subtree:true});
  }

  syncCardLabels();
  setTimeout(syncCardLabels,150);
  setTimeout(syncCardLabels,600);
  setTimeout(syncCardLabels,1400);
})();