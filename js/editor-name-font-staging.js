/* LIW Cards staging — separate cardholder name font selector.
   Keeps the existing card font as the default while allowing the name to use
   its own typeface. Signature/display choices follow Expanded Fonts access. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_NAME_FONT_STAGING__)return;
  window.__LIW_EDITOR_NAME_FONT_STAGING__=true;

  if(!document.querySelector('link[data-liw-name-font-library]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/card-fonts-staging.css?v=20260830-name-library-2';
    link.dataset.liwNameFontLibrary='true';
    document.head.appendChild(link);
  }

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

  const nameFontGroups=[
    ['Signature fonts',['Great Vibes','Dancing Script','Allura','Parisienne','Sacramento','Satisfy','Caveat','Kaushan Script','Lobster Two']],
    ['Luxury & editorial',['Cinzel','Bodoni Moda','Prata','Yeseva One','Cormorant SC','Abril Fatface','Marcellus']],
    ['Bold & modern',['Anton','Barlow Condensed','Archivo','Josefin Sans','Sora','Rubik','Work Sans','Comfortaa']]
  ];
  const existing=new Set([...nameFont.options].map(option=>String(option.value||'').toLowerCase()));
  nameFontGroups.forEach(([label,fonts])=>{
    const missing=fonts.filter(font=>!existing.has(font.toLowerCase()));
    if(!missing.length)return;
    const group=document.createElement('optgroup');
    group.label=`${label} · Plus & Pro`;
    missing.forEach(font=>{
      const option=document.createElement('option');
      option.value=font;
      option.textContent=font;
      option.dataset.namePremiumFont='true';
      group.appendChild(option);
      existing.add(font.toLowerCase());
    });
    nameFont.appendChild(group);
  });
  nameFont.value='';

  const help=document.createElement('div');
  help.className='input-help';
  help.textContent='Controls the cardholder name only. Signature and display fonts are available with Expanded Fonts.';
  nameGroup.appendChild(help);
  bodyGroup.insertAdjacentElement('afterend',nameGroup);

  try{
    if(Array.isArray(fieldNames)&&!fieldNames.includes('name_font_family')){
      const index=fieldNames.indexOf('font_family');
      fieldNames.splice(index>=0?index+1:fieldNames.length,0,'name_font_family');
    }
  }catch(_){ }

  const scriptFonts=new Set(['great vibes','dancing script','allura','parisienne','sacramento','satisfy','caveat','kaushan script','lobster two']);
  let hydrated=false;
  let hydrationPromise=null;
  let lastPersisted=null;

  function expandedFontsAllowed(){
    try{
      if(typeof hasEntitlement==='function')return hasEntitlement('expanded_fonts')===true;
      if(typeof editorAccess!=='undefined'&&editorAccess){
        if(editorAccess.isAdmin&&!editorAccess.isPlanPreview)return true;
        return editorAccess.has?.('expanded_fonts')===true;
      }
    }catch(_){ }
    const premium=[...bodyFont.querySelectorAll('option[data-premium-font="true"]')];
    return premium.some(option=>!option.disabled);
  }

  function effectiveNameFont(){
    return String(nameFont.value||bodyFont.value||'DM Sans').trim()||'DM Sans';
  }

  function applyNamePreview(){
    const previewName=document.getElementById('p-name');
    if(!previewName)return;
    const selected=effectiveNameFont();
    previewName.style.setProperty('font-family',selected,'important');
    if(scriptFonts.has(selected.toLowerCase()))previewName.style.setProperty('font-weight','400','important');
    else previewName.style.removeProperty('font-weight');
  }

  function syncPremiumState(){
    const bodyOptions=[...bodyFont.querySelectorAll('option')];
    const disabledByValue=new Map(bodyOptions.map(option=>[option.value,option.disabled]));
    const canExpanded=expandedFontsAllowed();
    [...nameFont.querySelectorAll('option')].forEach(option=>{
      if(!option.value){option.disabled=false;return;}
      if(option.dataset.namePremiumFont==='true'){
        option.disabled=!canExpanded;
        return;
      }
      if(disabledByValue.has(option.value))option.disabled=Boolean(disabledByValue.get(option.value));
      else if(option.dataset.premiumFont==='true')option.disabled=!canExpanded;
      else option.disabled=false;
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
