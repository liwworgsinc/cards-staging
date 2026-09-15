/* LIW Cards staging — resilient editor save transport.
   Extends the short request budget used by the core editor so a cold Supabase
   function does not get mistaken for a user-aborted save. The existing hydration
   guard still owns revision/concurrency protection because this function continues
   to use window.fetch. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_SAVE_RESILIENCE__)return;
  window.__LIW_EDITOR_SAVE_RESILIENCE__=true;

  const SAVE_REQUEST_TIMEOUT_MS=30000;

  try{
    if(typeof saveEditorStateToServer!=='function'){
      console.warn('[LIW save resilience] editor save function is not ready');
      return;
    }

    saveEditorStateToServer=async function(payload){
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session)throw new Error('Your login expired. Sign in again so your changes can be saved.');
      if(currentTeamRole==='designer'&&!canEditCurrentCard)throw new Error('This design is read-only at its current workflow stage.');

      const liwSaveFunction=currentTeamRole==='designer'?'save-designer-card-state':'save-card-state';
      const children=collectSaveChildren();
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),SAVE_REQUEST_TIMEOUT_MS);
      let response;

      try{
        response=await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/${liwSaveFunction}`,{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Authorization':`Bearer ${session.access_token}`,
            'apikey':LIW_CONFIG.supabaseKey
          },
          body:JSON.stringify({cardId:currentId,card:payload,...children}),
          signal:controller.signal
        });
      }catch(error){
        const message=String(error?.message||'');
        if(error?.name==='AbortError'||/user aborted|aborted a request|signal is aborted/i.test(message)){
          throw new Error('Save timeout: the server took too long to respond. Your work is protected in this browser.');
        }
        throw error;
      }finally{
        clearTimeout(timeout);
      }

      const raw=await response.text();
      let data={};
      try{data=raw?JSON.parse(raw):{};}catch(_){data={error:raw.slice(0,300)};}
      if(!response.ok)throw new Error(data.error||'The server could not save this card');
      if(!data.card?.id)throw new Error('The server did not confirm the card save');
      return data;
    };

    window.LIWEditorSaveResilience={timeoutMs:SAVE_REQUEST_TIMEOUT_MS};
  }catch(error){
    console.error('[LIW save resilience] install failed',error);
  }
})();
