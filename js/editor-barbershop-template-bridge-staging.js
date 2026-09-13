/* LIW Cards staging — Barbershop follows the same template workflow as Showtime.
   The normal LIW Standard/Premium template grid is the design source of truth.
   This bridge only preserves the Barber experience and mirrors the chosen styling. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_SHOWTIME_TEMPLATE_BRIDGE__)return;
  window.__LIW_BARBER_SHOWTIME_TEMPLATE_BRIDGE__=true;

  const MODE='barbershop';
  let observer=null;
  let observerStop=0;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const val=(name,fallback='')=>{const el=q(`[name="${name}"]`);const value=String(el?.value??'').trim();return value||fallback;};
  const set=(name,value)=>{const el=q(`[name="${name}"]`);if(el)el.value=String(value??'');};
  const currentExperience=()=>val('card_experience','classic').toLowerCase();
  const legacyBarberActive=()=>val('color_mode','').toLowerCase()===MODE&&currentExperience()!=='music';
  const barberActive=()=>currentExperience()==='barbershop'||legacyBarberActive();

  function templateList(){try{return Array.isArray(templates)?templates:[];}catch(_){return [];}}
  function selectedTemplate(){
    const id=val('template_id','');
    if(!id)return null;
    return templateList().find(item=>String(item.id)===id)||null;
  }
  function templateName(){
    const selected=selectedTemplate();
    if(selected?.name)return String(selected.name);
    const text=String(q('#template-selected-summary')?.textContent||'').trim();
    return text&&text.toLowerCase()!=='custom design'?text:'Custom design';
  }
  function design(){return {
    name:templateName(),
    primary:val('primary_color','#0b1438'),
    secondary:val('secondary_color','#d4a84f'),
    background:val('background_color','#ffffff'),
    font:val('font_family','DM Sans'),
    buttonStyle:val('button_style','filled')
  };}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function render(node){
    if(!node)return;
    const d=design();
    const badge=q('[data-barber-template-name]',node);if(badge)badge.textContent=d.name;
    const colors=[d.primary,d.secondary,d.background];
    qa('[data-barber-template-color]',node).forEach((el,index)=>{el.style.background=colors[index]||'#fff';el.title=colors[index]||'';});
    const font=q('[data-barber-template-font]',node);if(font)font.textContent=d.font;
    const button=q('[data-barber-template-button-style]',node);if(button)button.textContent=String(d.buttonStyle||'filled').replace(/\b\w/g,m=>m.toUpperCase());
  }

  function stopObserver(){
    try{observer?.disconnect();}catch(_){ }
    observer=null;
    if(observerStop){clearTimeout(observerStop);observerStop=0;}
  }

  function mount(){
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    if(!look)return false;

    /* Remove the two retired Barber-only template/color browsers if a cached
       earlier build inserted them before this bridge loaded. */
    q('[data-barber-template-skins]',look)?.remove();
    q('[data-barber-liw-palette-group]',look)?.remove();

    let node=q('[data-barber-template-bridge]',look);
    if(!node){
      node=document.createElement('section');
      node.className='barber-template-bridge';
      node.dataset.barberTemplateBridge='true';
      node.innerHTML=`
        <div class="barber-template-bridge-head">
          <div><strong>${icon('palette',18)} Template styling</strong><p>Just like Showtime, Barbershop keeps the LIW Standard or Premium template you select in the main template library.</p></div>
          <span class="barber-template-badge" data-barber-template-name>Custom design</span>
        </div>
        <div class="barber-template-preview">
          <div class="barber-template-palette"><i data-barber-template-color></i><i data-barber-template-color></i><i data-barber-template-color></i></div>
          <div class="barber-template-meta">
            <div><span>Font</span><strong data-barber-template-font>DM Sans</strong></div>
            <div><span>Buttons</span><strong data-barber-template-button-style>Filled</strong></div>
          </div>
        </div>
        <div class="barber-template-note">${icon('sparkles',16)}<span><strong>Barber experience stays intact.</strong> The selected template supplies the look; Barbershop keeps the left-cover profile, Wallet, Book My Chair, client room and revolving dock.</span></div>
        <div class="barber-template-actions"><button class="btn btn-light btn-sm" type="button" data-barber-change-template>${icon('layout-template',15)} Change template</button></div>`;
      const firstPalette=q('.barber-v5-presets',look);
      if(firstPalette)firstPalette.insertAdjacentElement('beforebegin',node);else look.prepend(node);
      q('[data-barber-change-template]',node)?.addEventListener('click',()=>q('#template-grid')?.scrollIntoView({behavior:'smooth',block:'start'}));
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    render(node);
    stopObserver();
    return true;
  }

  function restoreBarberAfterTemplate(){
    /* V5 predates Showtime-style template inheritance and its capture handler
       temporarily switches color_mode away from Barber when a template is clicked.
       Restore Barber after the normal LIW applyTemplate handler has finished. */
    set('card_experience','barbershop');
    set('color_mode',MODE);
    set('profile_image_shape','circle');
    try{window.LIWBarbershopEditor?.refresh?.();}catch(_){ }
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    const node=q('[data-barber-template-bridge]');
    if(node)render(node);
  }

  function reapplySelectedTemplate(templateId){
    if(!templateId){restoreBarberAfterTemplate();return;}
    const template=templateList().find(item=>String(item.id)===String(templateId));
    if(template&&typeof applyTemplate==='function'){
      try{applyTemplate(template);}catch(_){ }
    }
    restoreBarberAfterTemplate();
  }

  /* Window capture runs before the older V5 document-capture listener. This lets
     us remember that Barber was active before V5 temporarily deactivates it. */
  window.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;

    const barberChoice=target.closest('[data-card-experience="barbershop"]');
    if(barberChoice){
      const templateId=val('template_id','');
      setTimeout(()=>reapplySelectedTemplate(templateId),0);
      return;
    }

    const templateButton=target.closest('.template-card');
    if(templateButton&&barberActive()){
      setTimeout(()=>restoreBarberAfterTemplate(),0);
    }
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.matches?.('[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="font_family"],[name="button_style"]')){
      setTimeout(()=>render(q('[data-barber-template-bridge]')),0);
    }
  },true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.template-card'))setTimeout(()=>render(q('[data-barber-template-bridge]')),120);
  },true);

  function start(){
    if(mount())return;
    const target=q('.editor-panel[data-panel="design"]')||document.body;
    if(!target)return;
    observer=new MutationObserver(()=>mount());
    observer.observe(target,{childList:true,subtree:true});
    observerStop=setTimeout(stopObserver,4500);
  }

  window.LIWBarberTemplateBridge={refresh(){mount();render(q('[data-barber-template-bridge]'));},restoreBarberAfterTemplate};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
