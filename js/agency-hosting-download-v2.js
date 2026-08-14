(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  let cards=[];

  function ensureDialog(){
    if($('#agency-hosting-v2-dialog'))return;
    const dialog=document.createElement('dialog');
    dialog.id='agency-hosting-v2-dialog';
    dialog.className='agency-dialog';
    dialog.innerHTML='<div class="agency-dialog-body"><div class="agency-dialog-head"><div><h2>Host client card anywhere</h2><p>Upload once. Future edits stay connected automatically.</p></div><button class="icon-btn" id="agency-hosting-v2-close" type="button">×</button></div><div class="agency-field full"><label for="agency-hosting-v2-select">Client card</label><select id="agency-hosting-v2-select"></select></div><p class="muted">Agency Starter and Agency Pro can export a connected card file for their own hosting.</p><div class="agency-dialog-actions"><button class="btn btn-primary" id="agency-hosting-v2-download" type="button">Download Auto-Sync File</button></div></div>';
    document.body.appendChild(dialog);
    $('#agency-hosting-v2-close').addEventListener('click',()=>dialog.close());
  }

  window.addEventListener('liw:agency-hosting-open',event=>{
    cards=Array.isArray(event.detail?.cards)?event.detail.cards:[];
    if(!cards.length)return;
    ensureDialog();
    const select=$('#agency-hosting-v2-select');
    select.innerHTML=cards.map(card=>'<option value="'+card.slug+'">'+card.name+(card.company?' · '+card.company:'')+'</option>').join('');
    $('#agency-hosting-v2-dialog').showModal();
  });
})();
