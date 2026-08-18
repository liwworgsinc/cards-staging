/* LIW Cards — cards-staging only: public-card load reliability guard.
   Analytics must never hold the visual load timeout open after the card renders. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_LOAD_GUARD__)return;
  window.__LIW_PUBLIC_CARD_LOAD_GUARD__=true;

  const originalRecordView=typeof window.recordView==='function'?window.recordView:null;
  if(originalRecordView){
    window.recordView=function(cardId){
      Promise.resolve().then(()=>originalRecordView(cardId)).catch(()=>{});
      return Promise.resolve();
    };
  }

  const originalShowUnavailable=typeof window.showUnavailable==='function'?window.showUnavailable:null;
  if(originalShowUnavailable){
    window.showUnavailable=function(title,message){
      const card=document.getElementById('card');
      if(String(title)==='Still loading'&&card&&!card.hidden)return;
      return originalShowUnavailable(title,message);
    };
  }
})();
