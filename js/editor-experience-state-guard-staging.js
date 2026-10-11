/* LIW Cards staging hydration bootstrap — loads data-integrity protection, resilient save transport, then the slow-start hydration bridge. */
(function(){
  const current=document.currentScript?.src||location.href;
  const version='20260919-industry-hydration-1';
  const core=new URL(`editor-experience-state-guard-core-staging-20260915.js?v=${version}`,current).href;
  const savePatch=new URL(`editor-save-resilience-staging-20260915.js?v=${version}`,current).href;
  const hydrationPatch=new URL(`editor-hydration-completion-bridge-staging-20260915.js?v=${version}`,current).href;
  const realtorCompat=new URL(`realtor-experience-compat-staging.js?v=${version}`,current).href;
  const superConfig=new URL(`super-studio-config-staging.js?v=20261011-1`,current).href;
  const superEditor=new URL(`super-studio-editor-staging.js?v=20261011-1`,current).href;
  const superEditorEnhancements=new URL(`super-studio-editor-enhancements-staging.js?v=20261011-1`,current).href;
  const tag=src=>`<script src="${src.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><\/script>`;
  if(document.readyState==='loading'){
    document.write(tag(core));
    document.write(tag(savePatch));
    document.write(tag(hydrationPatch));
    document.write(tag(realtorCompat));
    document.write(tag(superConfig));
    document.write(tag(superEditor));
    document.write(tag(superEditorEnhancements));
    return;
  }
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.head.appendChild(script);
  });
  load(core)
    .then(()=>load(savePatch))
    .then(()=>load(hydrationPatch))
    .then(()=>load(realtorCompat))
    .then(()=>load(superConfig))
    .then(()=>load(superEditor))
    .then(()=>load(superEditorEnhancements))
    .catch(error=>console.error('[LIW hydration bootstrap]',error));
})();
