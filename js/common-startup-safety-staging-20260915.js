/* LIW Cards staging — do not let a nonessential invite-accept RPC block authenticated pages indefinitely. */
(function(){
  if(window.__LIW_REQUIRE_USER_STARTUP_SAFETY__)return;
  window.__LIW_REQUIRE_USER_STARTUP_SAFETY__=true;

  try{
    if(typeof requireUser!=='function'||typeof getLiwSessionUser!=='function')return;
    const INVITE_WAIT_MS=1200;
    requireUser=async function(){
      const currentUser=await getLiwSessionUser();
      if(!currentUser){
        location.href=typeof liwUrl==='function'?liwUrl('login.html'):'login.html';
        return null;
      }

      try{
        const inviteAttempt=Promise.resolve(supabaseClient.rpc('accept_workspace_invites')).catch(()=>null);
        await Promise.race([
          inviteAttempt,
          new Promise(resolve=>setTimeout(resolve,INVITE_WAIT_MS))
        ]);
      }catch(_){ }

      return currentUser;
    };
  }catch(error){
    console.warn('[LIW startup safety] requireUser patch skipped',error);
  }
})();