/* cards-staging cleanup: industry covers removed; purge legacy staging template-lab cards and load staging design fixes directly. */
(function(){
  function isStagingTemplate(template){
    return Boolean(template && (template.staging_only === true || String(template.id || '').startsWith('staging-')));
  }

  function purgeStagingTemplates(){
    try{
      if(Array.isArray(templates)){
        for(let i=templates.length-1;i>=0;i--){
          if(isStagingTemplate(templates[i]))templates.splice(i,1);
        }
      }
    }catch(_){ }

    const grid=document.getElementById('template-grid');
    if(!grid)return false;
    grid.querySelectorAll('.template-card').forEach(card=>{
      const id=String(card.dataset.template||'');
      if(card.dataset.stagingOnly==='true'||id.startsWith('staging-'))card.remove();
    });
    grid.querySelectorAll('.template-tier-group').forEach(group=>{
      if(!group.querySelector('.template-card'))group.remove();
    });
    grid.parentElement?.querySelectorAll('.editor-step-note').forEach(note=>{
      if(/staging template lab/i.test(note.textContent||''))note.remove();
    });
    return true;
  }

  function loadScript(src,datasetKey){
    if(document.querySelector(`script[${datasetKey}]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute(datasetKey,'true');
    document.head.appendChild(script);
  }

  loadScript('js/editor-button-style-staging.js?v=20260816-button-style-2','data-liw-button-style-staging');
  loadScript('js/editor-bulk-style-visible-preview-staging.js?v=20260816-bulk-visible-1','data-liw-bulk-visible-staging');
  loadScript('js/editor-profile-crop-staging.js?v=20260817-profile-crop-1','data-liw-profile-crop-staging');
  loadScript('js/editor-social-handle-ux-staging.js?v=20260817-social-handle-1','data-liw-social-handle-ux-staging');

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    purgeStagingTemplates();
    if(attempts>=60)clearInterval(timer);
  },250);
  document.addEventListener('click',event=>{
    if(event.target.closest('.editor-tab[data-tab="design"],#template-grid,.design-advanced-details')){
      setTimeout(purgeStagingTemplates,0);
      setTimeout(()=>window.LIWButtonStyleStaging?.refresh?.(),30);
      setTimeout(()=>window.LIWBulkStyleVisiblePreview?.refresh?.(),40);
    }
  });
})();