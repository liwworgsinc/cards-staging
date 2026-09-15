/* LIW Cards staging — keep card-editor context while managing Appointments. */
(function(){
  'use strict';
  if(window.__LIW_APPOINTMENTS_EDITOR_RETURN__)return;
  window.__LIW_APPOINTMENTS_EDITOR_RETURN__=true;

  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const $=selector=>document.querySelector(selector);
  const valid=value=>UUID_RE.test(String(value||'').trim());

  function requestedCard(){
    const value=new URLSearchParams(location.search).get('card')||'';
    return valid(value)?value:'';
  }

  function selectedCard(){
    const value=String($('#booking-card-select')?.value||'').trim();
    return valid(value)?value:'';
  }

  function activeCard(){return selectedCard()||requestedCard();}

  function addStyle(){
    if($('#appointments-editor-return-style'))return;
    const style=document.createElement('style');
    style.id='appointments-editor-return-style';
    style.textContent=`
      .appointments-editor-return{display:flex;align-items:center;flex:0 0 auto;margin-left:auto}
      .appointments-editor-return .btn{min-height:42px;padding:9px 12px;gap:7px;border-radius:11px;white-space:nowrap;text-decoration:none;font-weight:800}
      .appointments-editor-return .btn span{display:inline-block}
      @media(max-width:1100px){.appointments-editor-return{margin-left:0}}
      @media(max-width:900px){.booking-title-wrap{order:1}.appointments-editor-return{order:2;margin-left:auto}.booking-card-picker{order:3;width:100%!important}}
      @media(max-width:640px){.appointments-editor-return{width:100%;margin:0}.appointments-editor-return .btn{width:100%;justify-content:center;min-height:40px}}
    `;
    document.head.appendChild(style);
  }

  function ensureButton(){
    let wrap=$('#appointments-editor-return');
    if(wrap)return wrap;
    const topbar=$('.booking-topbar');
    if(!topbar)return null;
    addStyle();
    wrap=document.createElement('div');
    wrap.id='appointments-editor-return';
    wrap.className='appointments-editor-return';
    wrap.hidden=true;
    wrap.innerHTML='<a class="btn btn-light btn-sm" id="appointments-editor-return-link" href="editor.html"><i data-lucide="arrow-left" size="16"></i><span>Back to edit card</span></a>';
    const picker=$('.booking-card-picker');
    if(picker&&picker.parentElement===topbar)topbar.insertBefore(wrap,picker);
    else topbar.appendChild(wrap);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return wrap;
  }

  function sync(){
    const wrap=ensureButton();
    if(!wrap)return;
    const id=activeCard();
    const link=$('#appointments-editor-return-link');
    if(!id||!link){wrap.hidden=true;return;}
    link.href=`editor.html?id=${encodeURIComponent(id)}`;
    const picker=$('#booking-card-select');
    const selected=picker?.selectedOptions?.[0]?.textContent?.trim()||'';
    link.title=selected?`Back to editing ${selected}`:'Back to editing this card';
    link.setAttribute('aria-label',link.title);
    wrap.hidden=false;
  }

  function watch(attempt=0){
    const picker=$('#booking-card-select');
    ensureButton();
    sync();
    if(!picker){
      if(attempt<80)setTimeout(()=>watch(attempt+1),100);
      return;
    }
    if(picker.dataset.editorReturnWired==='true')return;
    picker.dataset.editorReturnWired='true';
    picker.addEventListener('change',()=>setTimeout(sync,0));
    new MutationObserver(()=>sync()).observe(picker,{childList:true,subtree:true});
    sync();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>watch(),{once:true});
  else watch();
})();
