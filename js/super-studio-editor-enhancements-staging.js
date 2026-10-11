/* LIW Cards staging — Super Studio editor completion layer.
   Adds independent availability/section/hour controls and keeps video uploads
   compatible with the existing card-videos owner-folder RLS rule. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_EDITOR_ENHANCEMENTS__)return;
  window.__LIW_SUPER_STUDIO_EDITOR_ENHANCEMENTS__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/editor\.html$/i.test(location.pathname)))return;

  const q=(s,r=document)=>r.querySelector(s);
  let observer=null;
  let syncQueued=false;
  let videoBusy=false;

  function api(){return window.LIWSuperStudioEditor||null;}
  function state(){try{return api()?.getState?.()||{};}catch(_){return {};}}
  function root(){return q('#super-studio-control-center');}
  function active(){return String(q('[name="card_experience"]')?.value||'').toLowerCase()==='super-studio';}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function isDesktop(){return window.matchMedia?.('(min-width: 769px)')?.matches!==false;}
  function professionLabel(key){return window.LIWSuperStudio?.PROFESSIONS?.[key]?.label||'Other';}

  function ensureCompletionStyles(){
    if(q('link[data-liw-super-studio-completion-editor]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/super-studio-completion-staging.css?v=20261011-2';
    link.dataset.liwSuperStudioCompletionEditor='true';
    document.head.appendChild(link);
  }

  function closeProfessionPickers(except=null){
    document.querySelectorAll('.ss-profession-picker.is-open').forEach(picker=>{
      if(picker===except)return;
      picker.classList.remove('is-open');
      const button=q('.ss-profession-picker-button',picker);
      const menu=q('.ss-profession-menu',picker);
      button?.setAttribute('aria-expanded','false');
      if(menu)menu.hidden=true;
    });
  }

  function insertProfessionPicker(r,s){
    const panel=q('[data-ss-panel="start"]',r);
    const native=q('[data-ss-path="studioProfession"]',panel);
    if(!panel||!native)return;
    const field=native.closest('.ss-field');
    if(!field)return;

    // Windows/Chrome can render the native 15-item popup as a huge black slab.
    // Keep native select on mobile, but use an LIW-controlled menu on desktop.
    if(!isDesktop()){
      native.classList.remove('ss-profession-native-hidden');
      native.removeAttribute('aria-hidden');
      native.tabIndex=0;
      q('.ss-profession-picker',field)?.remove();
      return;
    }

    native.classList.add('ss-profession-native-hidden');
    native.setAttribute('aria-hidden','true');
    native.tabIndex=-1;

    let picker=q('.ss-profession-picker',field);
    const selected=String(s.studioProfession||native.value||'other');
    if(!picker){
      picker=document.createElement('div');
      picker.className='ss-profession-picker';
      picker.dataset.ssEnhancement='profession-picker';
      picker.innerHTML=`<button type="button" class="ss-profession-picker-button" aria-haspopup="listbox" aria-expanded="false"><span data-ss-profession-label></span><i data-lucide="chevron-down"></i></button><div class="ss-profession-menu" role="listbox" hidden>${Object.entries(window.LIWSuperStudio?.PROFESSIONS||{}).map(([key,item])=>`<button type="button" role="option" data-ss-profession-option="${esc(key)}"><strong>${esc(item.label)}</strong><small>${esc(item.title||item.label)}</small></button>`).join('')}</div>`;
      native.insertAdjacentElement('afterend',picker);

      const toggle=q('.ss-profession-picker-button',picker);
      const menu=q('.ss-profession-menu',picker);
      toggle?.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const opening=!picker.classList.contains('is-open');
        closeProfessionPickers(opening?picker:null);
        picker.classList.toggle('is-open',opening);
        toggle.setAttribute('aria-expanded',opening?'true':'false');
        if(menu)menu.hidden=!opening;
      });
      picker.addEventListener('click',event=>{
        const option=event.target.closest('[data-ss-profession-option]');
        if(!option)return;
        event.preventDefault();
        event.stopPropagation();
        const key=option.dataset.ssProfessionOption;
        const select=q('[data-ss-path="studioProfession"]',panel);
        if(!select)return;
        select.value=key;
        select.dispatchEvent(new Event('input',{bubbles:true}));
        closeProfessionPickers();
      });
    }

    q('[data-ss-profession-label]',picker).textContent=professionLabel(selected);
    q('.ss-profession-menu',picker)?.querySelectorAll('[data-ss-profession-option]').forEach(option=>{
      const chosen=option.dataset.ssProfessionOption===selected;
      option.classList.toggle('is-selected',chosen);
      option.setAttribute('aria-selected',chosen?'true':'false');
    });
  }

  function insertAvailability(r,s){
    const panel=q('[data-ss-panel="start"]',r);
    if(!panel||q('[data-ss-enhancement="availability"]',panel))return;
    const profession=q('[data-ss-path="studioProfession"]',panel)?.closest('.ss-field');
    if(!profession)return;
    const wrap=document.createElement('div');
    wrap.className='ss-grid-2';
    wrap.dataset.ssEnhancement='availability';
    wrap.innerHTML=`<label class="ss-field"><span>Availability</span><select class="input" data-ss-path="availabilityStatus"><option value="accepting">Accepting appointments</option><option value="limited">Limited availability</option><option value="unavailable">Currently unavailable</option></select></label><label class="ss-field"><span>Availability label</span><input class="input" data-ss-path="availabilityLabel" value="${esc(s.availabilityLabel||'Accepting Appointments')}" placeholder="Accepting Appointments"></label>`;
    profession.insertAdjacentElement('afterend',wrap);
    const select=q('[data-ss-path="availabilityStatus"]',wrap);if(select)select.value=s.availabilityStatus||'accepting';
  }

  function insertVisibility(r,s){
    const panel=q('[data-ss-panel="look"]',r);
    if(!panel||q('[data-ss-enhancement="visibility"]',panel))return;
    const shortcuts=q('.ss-shortcuts',panel);
    const wrap=document.createElement('div');
    wrap.dataset.ssEnhancement='visibility';
    wrap.innerHTML=`<div class="ss-editor-section-head ss-subhead"><div><span>SECTIONS</span><h4>What should clients see?</h4><p>Empty sections stay hidden automatically. Turn off anything you do not want published.</p></div></div><div class="ss-grid-2">${[['featured','Featured Work'],['services','Services'],['portfolio','My Work'],['beforeAfter','Before & After'],['about','About'],['reviews','Reviews'],['specials','Special Offers'],['studioInfo','Studio Info'],['social','Social']].map(([key,label])=>`<label class="ss-check"><input type="checkbox" data-ss-path="sectionVisibility.${key}" ${(s.sectionVisibility?.[key]!==false)?'checked':''}><span>${label}</span></label>`).join('')}</div>`;
    if(shortcuts)shortcuts.insertAdjacentElement('beforebegin',wrap);else panel.appendChild(wrap);
  }

  function insertHours(r,s){
    const panel=q('[data-ss-panel="business"]',r);
    if(!panel||q('[data-ss-path="studioInfo.hours"]',panel))return;
    const parking=q('[data-ss-path="studioInfo.parking"]',panel)?.closest('.ss-field');
    if(!parking)return;
    const label=document.createElement('label');
    label.className='ss-field';
    label.dataset.ssEnhancement='hours';
    label.innerHTML=`<span>Business hours</span><input class="input" data-ss-path="studioInfo.hours" value="${esc(s.studioInfo?.hours||'')}" placeholder="Mon–Fri 10:00 AM–7:00 PM">`;
    parking.insertAdjacentElement('beforebegin',label);
  }

  function sync(){
    syncQueued=false;
    ensureCompletionStyles();
    const r=root();if(!r)return false;
    const s=state();
    insertProfessionPicker(r,s);
    insertAvailability(r,s);
    insertVisibility(r,s);
    insertHours(r,s);
    if(window.lucide)try{lucide.createIcons({nodes:[r]});}catch(_){}
    return true;
  }
  function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(sync);}

  async function uploadVideo(file,input){
    if(!file||videoBusy)return;
    if(!/^video\//i.test(file.type||'')){window.toast?.('Choose a video file.');return;}
    if(file.size>20*1024*1024){window.toast?.('Video must be under 20 MB. Use a shorter cover clip.');return;}
    let actor=null;try{actor=typeof user!=='undefined'?user?.id:null;}catch(_){}
    if(!actor){window.toast?.('Sign in again before uploading.');return;}
    videoBusy=true;
    const label=input.closest('label');if(label)label.classList.add('disabled-control');
    try{
      const safe=String(file.name||'cover-video').toLowerCase().replace(/[^a-z0-9.]+/g,'-');
      const path=`${actor}/super-studio/video/${Date.now()}-${safe}`;
      const {error}=await supabaseClient.storage.from('card-videos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(error)throw error;
      const url=supabaseClient.storage.from('card-videos').getPublicUrl(path).data.publicUrl;
      const r=root();if(!r)return;
      const bridge=document.createElement('input');
      bridge.type='hidden';bridge.dataset.ssPath='videoCoverUrl';bridge.value=url;r.appendChild(bridge);
      bridge.dispatchEvent(new Event('input',{bubbles:true}));bridge.remove();
      const preview=q('.ss-video-preview',r);if(preview)preview.innerHTML=`<video src="${esc(url)}" muted loop playsinline autoplay></video>`;
      window.toast?.('Super Studio video cover uploaded');
    }catch(error){console.warn('Super Studio video upload:',error);window.toast?.(error?.message||'Could not upload video');}
    finally{videoBusy=false;if(input)input.value='';if(label)label.classList.remove('disabled-control');}
  }

  document.addEventListener('click',event=>{
    if(!event.target.closest?.('.ss-profession-picker'))closeProfessionPickers();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeProfessionPickers();});
  window.addEventListener('resize',queueSync,{passive:true});

  document.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-ss-video-file]');
    if(!input||!active())return;
    event.stopImmediatePropagation();
    event.preventDefault();
    void uploadVideo(input.files?.[0],input);
  },true);

  function observe(){
    const r=root();if(!r)return false;
    if(observer)return true;
    observer=new MutationObserver(queueSync);
    observer.observe(r,{childList:true,subtree:true});
    sync();
    return true;
  }

  ensureCompletionStyles();
  document.addEventListener('liw:editor-card-hydrated',queueSync);
  document.addEventListener('input',event=>{if(event.target?.name==='card_experience')queueSync();});
  document.addEventListener('change',event=>{if(event.target?.name==='card_experience')queueSync();});
  let tries=0;const timer=setInterval(()=>{tries+=1;if(observe()&&api()){sync();if(tries>8)clearInterval(timer);}if(tries>80)clearInterval(timer);},180);
  observe();
})();
