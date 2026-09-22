/* LIW Cards staging — keep authenticated-page startup aligned with production.
   Do not let auth/session locks or the invite-accept RPC block the editor. */
(function(){
  if(window.__LIW_REQUIRE_USER_STARTUP_SAFETY__)return;
  window.__LIW_REQUIRE_USER_STARTUP_SAFETY__=true;

  try{
    if(typeof requireUser!=='function'||typeof supabaseClient==='undefined')return;

    const AUTH_WAIT_MS=6500;
    const INVITE_WAIT_MS=1200;
    const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

    // Production uses auth.getUser() directly. Keep staging on the same path
    // instead of waiting on getSession(), which can stall in some mobile tabs.
    requireUser=async function(){
      let currentUser=null;

      try{
        const result=await Promise.race([
          supabaseClient.auth.getUser(),
          timeout(AUTH_WAIT_MS,'auth-user-timeout')
        ]);
        currentUser=result?.data?.user||null;
      }catch(error){
        console.warn('[LIW startup safety] getUser fallback',error);
        try{
          const result=await Promise.race([
            supabaseClient.auth.getSession(),
            timeout(1800,'auth-session-fallback-timeout')
          ]);
          currentUser=result?.data?.session?.user||null;
        }catch(_){ currentUser=null; }
      }

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