/* LIW Cards — cards-staging only: keep payment actions in the Flow Pay panel. */
(function(){
  'use strict';
  if(window.__LIW_FLOW_PAY_PANEL_FIX__)return;
  window.__LIW_FLOW_PAY_PANEL_FIX__=true;

  function movePayment(){
    const card=document.getElementById('card');
    if(!card?.classList.contains('swipe-card-active'))return false;
    const payPanel=card.querySelector('.swipe-payment-panel');
    const contactPanel=card.querySelector('.swipe-contact-panel');
    const paymentAction=contactPanel?.querySelector('[data-business-event="payment_click"]')||card.querySelector('.swipe-panel [data-business-event="payment_click"]');
    if(!paymentAction||!payPanel)return Boolean(payPanel);

    const paymentSection=payPanel.querySelector('#payment-sharing-section');
    if(paymentSection)payPanel.insertBefore(paymentAction,paymentSection);
    else payPanel.prepend(paymentAction);

    paymentAction.classList.add('flow-pay-action');

    const businessActions=contactPanel?.querySelector('#business-actions');
    if(businessActions&&!businessActions.children.length)businessActions.remove();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(movePayment()||attempts>=48)clearInterval(timer);
  },125);
  setTimeout(movePayment,40);
  setTimeout(movePayment,500);
})();
