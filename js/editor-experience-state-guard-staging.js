/* LIW Cards staging hydration bootstrap — loads the current guard unchanged, then adds a completion bridge for slow-but-valid editor startup. */
(function(){
  const current=document.currentScript?.src||location.href;
  const core=new URL('editor-experience-state-guard-core-staging-20260915.js?v=20260915-editor-load-1',current).href;
  const patch=new URL('editor-hydration-completion-bridge-staging-20260915.js?v=20260915-editor-load-1',current).href;
  const tag=src=>`<script src="${src.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><\/script>`;
  if(document.readyState==='loading'){
    document.write(tag(core));
    document.write(tag(patch));
    return;
  }
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.head.appendChild(script);
  });
  load(core).then(()=>load(patch)).catch(error=>console.error('[LIW hydration bootstrap]',error));
})();