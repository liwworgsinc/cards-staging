/* LIW Cards — staging guard for approval requests on cards that are already live. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_LIVE_APPROVAL_GUARD__)return;
  window.__LIW_AGENCY_LIVE_APPROVAL_GUARD__=true;

  let requestSerial=0;
  const $=selector=>document.querySelector(selector);

  function ensureStyles(){
    if(document.getElementById('agency-live-approval-guard-style'))return;
    const style=document.createElement('style');
    style.id='agency-live-approval-guard-style';
    style.textContent=`
      .agency-live-review-note{display:flex;gap:9px;align-items:flex-start;margin:13px 20px 0;padding:10px 12px;border:1px solid #cfe3d7;border-radius:11px;background:#f1faf5;color:#17633a;font-size:.64rem;line-height:1.45}
      .agency-live-review-note strong{display:block;margin-bottom:2px;color:#0f5132;font-size:.66rem}
      .agency-approval-auto-publish.is-live-card{opacity:.68;background:#f7f8fa!important;border-color:#e2e6ec!important;cursor:not-allowed}
      .agency-approval-auto-publish.is-live-card input{cursor:not-allowed}
      @media(max-width:620px){.agency-live-review-note{margin-left:14px;margin-right:14px}}
    `;
    document.head.appendChild(style);
  }

  function ensureNote(dialog){
    let note=dialog.querySelector('[data-live-review-note]');
    if(note)return note;
    note=document.createElement('div');
    note.className='agency-live-review-note';
    note.dataset.liveReviewNote='true';
    note.hidden=true;
    note.innerHTML='<i data-lucide="radio-tower" size="16"></i><div><strong>Already live</strong><span>This card was published before this review. Client approval records sign-off only; it will not publish or unpublish the card.</span></div>';
    const auto=dialog.querySelector('.agency-approval-auto-publish');
    if(auto)auto.insertAdjacentElement('beforebegin',note);
    return note;
  }

  function setAutoCopy(auto,isLive){
    if(!auto)return;
    const input=auto.querySelector('#agency-approval-auto-publish');
    const strong=auto.querySelector('strong');
    const small=auto.querySelector('small');
    auto.classList.toggle('is-live-card',isLive);
    if(input){
      if(isLive)input.checked=false;
      input.disabled=isLive;
      input.dataset.cardAlreadyLive=isLive?'true':'false';
    }
    if(strong)strong.textContent=isLive?'Auto-publish not applicable':'Auto-publish after client approval';
    if(small)small.textContent=isLive
      ? 'This card is already public. Approval will not change its live status.'
      : 'Optional. If the client approves and the card passes publishing checks, LIW Cards makes it live automatically.';
  }

  async function syncSelectedCard(){
    const dialog=$('#agency-approval-send-dialog');
    if(!dialog)return;
    ensureStyles();
    const note=ensureNote(dialog);
    const auto=dialog.querySelector('.agency-approval-auto-publish');
    const cardId=String(dialog.querySelector('#agency-approval-card-id')?.value||'').trim();
    if(!cardId){setAutoCopy(auto,false);note.hidden=true;return;}

    const serial=++requestSerial;
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('status').eq('id',cardId).maybeSingle();
      if(serial!==requestSerial)return;
      if(error)throw error;
      const isLive=String(data?.status||'')==='published';
      setAutoCopy(auto,isLive);
      note.hidden=!isLive;
      const status=dialog.querySelector('#agency-approval-current-status');
      if(isLive&&status)status.textContent='Live card';
      if(window.lucide)try{lucide.createIcons();}catch(_){}
    }catch(error){
      console.warn('Agency live-card approval guard:',error);
      setAutoCopy(auto,false);
      note.hidden=true;
    }
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='agency-approval-card-select')setTimeout(syncSelectedCard,0);
  });
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-open-agency-approval],[data-send-card-approval]'))setTimeout(syncSelectedCard,100);
  });
  document.addEventListener('submit',event=>{
    if(event.target?.id!=='agency-approval-send-form')return;
    const input=$('#agency-approval-auto-publish');
    if(input?.dataset.cardAlreadyLive==='true')input.checked=false;
  },true);

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==='attributes'&&mutation.target?.id==='agency-approval-send-dialog'&&mutation.target.hasAttribute('open')){setTimeout(syncSelectedCard,0);return;}
      for(const node of mutation.addedNodes||[]){if(node.nodeType===1&&(node.id==='agency-approval-send-dialog'||node.querySelector?.('#agency-approval-send-dialog'))){setTimeout(syncSelectedCard,0);return;}}
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
})();
