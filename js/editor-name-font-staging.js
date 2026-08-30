/* LIW Cards staging — separate cardholder name font selector.
   Keeps the existing card font as the default while allowing the name to use
   its own typeface. Premium font availability mirrors the normal font control. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_NAME_FONT_STAGING__)return;
  window.__LIW_EDITOR_NAME_FONT_STAGING__=true;

  const bodyFont=document.querySelector('select[name="font_family"]');
  if(!bodyFont)return;

  const bodyGroup=bodyFont.closest('.form-group');
  if(!bodyGroup)return;

  const bodyLabel=bodyGroup.querySelector('label');
  if(bodyLabel)bodyLabel.textContent='Card font';

  const nameGroup=bodyGroup.cloneNode(true);
  nameGroup.classList.add('name-font-control');
  const nameLabel=nameGroup.querySelector('label');
  const nameFont=nameGroup.querySelector('select');
  if(!nameFont)return;

  if(nameLabel)nameLabel.textContent='Name font';
  nameFont.name='name_font_family';
  nameFont.setAttribute('aria-label','Name font');
  nameFont.innerHTML='<option value="">Same as card font</option>'+bodyFont.innerHTML;
  nameFont.value='';

  const help=document.createElement('div');
  help.className='input-help';
  help.textContent='Controls the cardholder name only.';
  nameGroup.appendChild(help);
  bodyGroup.insertAdjacentElement('afterend',nameGroup);

  try{
    if(Array.isArray(fieldNames)&&!fieldNames.includes('name_font_family')){
      const index=fieldNames.indexOf('font_family');
      fieldNames.splice(index>=0?index+1:fieldNames.length,0,'name_font_family');
    }
  }catch(_){ }

  let hydrated=false;
  let hydrationPromise=null;
  let lastPersisted=null;

  function effectiveNameFont(){
    return String(nameFont.value||bodyFont.value||'DM Sans').trim()||'DM Sans';
  }

  function applyNamePreview(){
    const previewName=document.getElementById('p-name');
    if(previewName)previewName.style.setProperty('font-family',effectiveNameFont(),'important');
  }

  function syncPremiumState(){
    const bodyOptions=[...bodyFont.querySelectorAll('option')];
    const disabledByValue=new Map(bodyOptions.map(option=>[option.value,option.disabled]));
    [...nameFont.querySelectorAll('option')].forEach(option=>{
      if(!option.value){option.disabled=false;return;}
      option.disabled=Boolean(disabledByValue.get(option.value));
    });
    if(nameFont.selectedOptions?.[0]?.disabled)nameFont.value='';
    applyNamePreview();
  }

  async function hydrateFromServer(){
    if(hydrated||hydrationPromise)return hydrationPromise;
    if(typeof currentId==='undefined'||!currentId||typeof supabaseClient==='undefined'||!supabaseClient)return null;
    hydrationPromise=(async()=>{
      try{
        const {data,error}=await supabaseClient.from('digital_cards')
          .select('name_font_family')
          .eq('id',currentId)
          .maybeSingle();
        if(error)throw error;
        const saved=String(data?.name_font_family||'').trim();
        nameFont.value=[...nameFont.options].some(option=>option.value===saved)?saved:'';
        lastPersisted=nameFont.value;
        hydrated=true;
        syncPremiumState();
        applyNamePreview();
      }catch(error){
        console.warn('LIW staging name font could not be loaded:',error);
      }finally{
        hydrationPromise=null;
      }
    })();
    return hydrationPromise;
  }

  async function persistNameFont(){
    if(typeof currentId==='undefined'||!currentId||typeof canEditCurrentCard!=='undefined'&&!canEditCurrentCard)return;
    if(typeof supabaseClient==='undefined'||!supabaseClient)return;
    const selected=String(nameFont.value||'').trim();
    if(lastPersisted===selected)return;
    const {error}=await supabaseClient.from('digital_cards')
      .update({name_font_family:selected||null})
      .eq('id',currentId);
    if(error)throw error;
    lastPersisted=selected;
  }

  try{
    const normalRender=render;
    render=function(){
      const result=normalRender.apply(this,arguments);
      applyNamePreview();
      if(!hydrated)Promise.resolve().then(hydrateFromServer);
      return result;
    };
  }catch(_){ }

  try{
    const normalApplyEntitlements=applyEntitlements;
    applyEntitlements=function(){
      const result=normalApplyEntitlements.apply(this,arguments);
      syncPremiumState();
      return result;
    };
  }catch(_){ }

  try{
    const normalLoadCard=loadCard;
    loadCard=async function(){
      const result=await normalLoadCard.apply(this,arguments);
      await hydrateFromServer();
      return result;
    };
  }catch(_){ }

  try{
    const normalPerformSave=performSave;
    performSave=async function(){
      const result=await normalPerformSave.apply(this,arguments);
      try{await persistNameFont();}
      catch(error){
        console.warn('LIW staging name font save follow-up failed:',error);
        if(typeof toast==='function')toast('Card saved, but the separate name font could not be saved. Try again.');
      }
      return result;
    };
  }catch(_){ }

  nameFont.addEventListener('change',()=>{
    applyNamePreview();
    if(typeof scheduleSave==='function')scheduleSave();
  });
  bodyFont.addEventListener('change',()=>{
    if(!nameFont.value)applyNamePreview();
  });

  syncPremiumState();
  applyNamePreview();
  Promise.resolve().then(hydrateFromServer);
})();
