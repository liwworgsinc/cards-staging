/* LIW Cards — staging-only approval close event hardening. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_APPROVAL_CLOSE_FIX__)return;
  window.__LIW_AGENCY_APPROVAL_CLOSE_FIX__=true;

  function closeFromEvent(event){
    const button=event.target?.closest?.('[data-close-approval-dialog]');
    if(!button)return;
    const dialog=button.closest('dialog');
    if(!dialog?.open)return;
    event.preventDefault();
    event.stopPropagation();
    dialog.close();
  }

  document.addEventListener('pointerup',closeFromEvent,true);
  document.addEventListener('click',closeFromEvent,true);
})();
