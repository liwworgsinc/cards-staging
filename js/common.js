/* LIW Cards staging common bootstrap — preserves the current common runtime, then applies startup safety before page scripts continue. */
(function(){
  const current=document.currentScript?.src||location.href;
  const core=new URL('common-core-staging-20260915.js?v=20260915-editor-load-1',current).href;
  const patch=new URL('common-startup-safety-staging-20260915.js?v=20260915-editor-load-1',current).href;
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
  load(core).then(()=>load(patch)).catch(error=>console.error('[LIW common bootstrap]',error));
})();