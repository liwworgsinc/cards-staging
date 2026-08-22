/* LIW Cards — staging-only safe public card data source. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_SAFE_SOURCE__)return;
  window.__LIW_PUBLIC_CARD_SAFE_SOURCE__=true;
  if(!window.supabaseClient||typeof supabaseClient.from!=='function')return;

  const originalFrom=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=function(table){
    if(table==='digital_cards')return originalFrom('public_digital_cards');
    return originalFrom(table);
  };
})();
