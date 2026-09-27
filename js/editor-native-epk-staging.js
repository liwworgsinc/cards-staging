(function nativeEpkEditor(){
  'use strict';
  if(window.__LIW_NATIVE_EPK_EDITOR__)return;
  window.__LIW_NATIVE_EPK_EDITOR__=true;
  const MAX_MEDIA=4;
  const limits={epk_tagline:160,epk_bio:1800,epk_highlights:600,epk_press_email:180,epk_booking_email:180};
  const names=['epk_enabled','epk_tagline','epk_bio','epk_highlights','epk_press_email','epk_booking_email'];
  let root=null;
  function bridge(){return window.LIWArtistEpkBridge;}
  function state(){return bridge()?.getState()||{};}
  function safe(v,max=1800){return String(v??'').trim().slice(0,max);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function notify(message){if(typeof window.toast==='function')window.toast(message);else{const el=root?.querySelector('[data-epk-message]');if(el)el.textContent=message;}}
  function link(preview=false){
    const slug=safe(document.querySelector('[name="slug"]')?.value,160);
    if(!slug)return '';
    const u=new URL('epk.html',location.href);u.searchParams.set('slug',slug);
    if(preview)u.searchParams.set('editor_preview','1');
    return u.href;
  }
  function selectedMedia(){
    const s=state();
    const eligible=(Array.isArray(s.media_items)?s.media_items:[]).filter(m=>m&&safe(m.title)&&safe(m.url));
    return Array.isArray(s.epk_media_ids)?eligible.filter(m=>s.epk_media_ids.includes(m.id)):eligible;
  }
  function field(name,label,placeholder='',area=false,rows=4){
    return `<label class="artist-control-field"><span>${label}</span>${area?`<textarea class="input" rows="${rows}" data-epk-field="${name}" placeholder="${esc(placeholder)}"></textarea>`:`<input class="input" type="${name.endsWith('_email')?'email':'text'}" data-epk-field="${name}" placeholder="${esc(placeholder)}" maxlength="${limits[name]}">`}</label>`;
  }
  function setup(){
    const panel=root?.querySelector('[data-artist-panel="profile"]');
    const nav=root?.querySelector('[data-artist-nav="profile"]');
    if(!root||!panel||!nav||root.querySelector('[data-artist-panel="epk"]'))return;
    nav.insertAdjacentHTML('beforebegin',`<button type="button" data-artist-nav="epk">${icon('file-user',17)}<span>EPK</span></button>`);
    panel.insertAdjacentHTML('beforebegin',`
      <section class="artist-control-panel" data-artist-panel="epk" hidden>
        <header class="artist-panel-title"><div><span>PRESS KIT BUILDER</span><h4>A professional EPK from your Showtime card</h4><p>Your artist profile, releases, shows and media feed the press kit automatically.</p></div></header>
        <div class="artist-epk-banner">
          <small>${icon('badge-check')} LIW ARTIST PRESS KIT</small>
          <strong>Make the right introduction before you hit the stage.</strong>
          <p>One shareable page for promoters, agents, press and venues.</p>
          <label class="artist-epk-toggle"><input type="checkbox" data-epk-field="epk_enabled"><span>Enable my public EPK when my card is published</span></label>
        </div>
        <section class="artist-section-card">
          <div class="artist-section-head"><div><strong>EPK readiness</strong><span>Incomplete sections stay hidden on the public page.</span></div><b data-epk-count>0/5</b></div>
          <div class="artist-epk-progress"><span data-epk-progress></span></div>
          <div class="artist-epk-checks">
            <span data-epk-check>${icon('circle')} Artist identity</span>
            <span data-epk-check>${icon('circle')} Biography</span>
            <span data-epk-check>${icon('circle')} Featured music</span>
            <span data-epk-check>${icon('circle')} Press media</span>
            <span data-epk-check>${icon('circle')} Booking contact</span>
          </div>
        </section>
        <section class="artist-section-card">
          <div class="artist-section-head"><div><strong>Your artist story</strong><span>Your card biography is used if the EPK bio is blank.</span></div>${icon('mic-2',18)}</div>
          ${field('epk_tagline','Press headline','Your sound and signature performance style')}
          ${field('epk_bio','Professional biography','Introduce your sound, background and notable experience',true,6)}
          ${field('epk_highlights','Career highlights — one per line','Notable performances, press features, awards or collaborations',true,4)}
        </section>
        <section class="artist-section-card">
          <div class="artist-section-head"><div><strong>Choose press media</strong><span>Use your existing photos, videos and press links. All valid items are selected initially.</span></div>${icon('image',18)}</div>
          <div data-epk-media class="artist-epk-media-list"></div>
          <button type="button" class="btn btn-light btn-sm" data-artist-jump="media">${icon('plus',14)} Manage media</button>
        </section>
        <section class="artist-section-card">
          <div class="artist-section-head"><div><strong>Press and booking</strong><span>Optional dedicated emails; otherwise the card email / booking link is used.</span></div>${icon('mail',18)}</div>
          <div class="artist-card-grid artist-card-grid-2">
            ${field('epk_press_email','Press email','press@example.com')}
            ${field('epk_booking_email','Booking email','bookings@example.com')}
          </div>
        </section>
        <section class="artist-section-card">
          <div class="artist-section-head"><div><strong>Preview and share</strong><span>Preview a draft as its signed-in owner. Public sharing requires publishing.</span></div>${icon('share-2',18)}</div>
          <p class="artist-epk-url" data-epk-url></p>
          <div class="artist-epk-actions"><button class="btn btn-primary" type="button" data-epk-preview>${icon('eye')} Save & preview</button><button class="btn btn-light" type="button" data-epk-copy>${icon('copy')} Copy public link</button></div>
          <p class="artist-epk-help">The EPK page includes a Print / Save as PDF option. No unfinished sections or invented achievements will appear.</p>
          <p class="artist-epk-message" role="status" data-epk-message></p>
        </section>
      </section>`);
    root.addEventListener('input',e=>{
      const el=e.target.closest?.('[data-epk-field]');if(!el)return;
      const name=el.dataset.epkField;if(!names.includes(name))return;
      const s=state();s[name]=el.type==='checkbox'?el.checked:safe(el.value,limits[name]);
      bridge().queueSave();paintSummary();
    });
    root.addEventListener('change',e=>{
      const el=e.target.closest?.('[data-epk-media-id]');if(!el)return;
      const s=state();
      if(!Array.isArray(s.epk_media_ids))s.epk_media_ids=selectedMedia().map(x=>x.id);
      s.epk_media_ids=el.checked?[...new Set([...s.epk_media_ids,el.dataset.epkMediaId])].slice(0,MAX_MEDIA):s.epk_media_ids.filter(id=>id!==el.dataset.epkMediaId);
      bridge().queueSave();paintSummary();
    });
    root.addEventListener('click',async e=>{
      if(e.target.closest?.('[data-artist-nav="epk"]')){paint();return;}
      if(e.target.closest?.('[data-epk-preview]')){
        const url=link(true);if(!url){notify('Save your card URL first.');return;}
        const tab=window.open('about:blank','_blank');
        const ok=await bridge().saveSettings({manual:true});
        if(ok){if(tab)tab.location.href=url;else location.href=url;}else{tab?.close();notify('Save failed. Preview was not opened.');}
        return;
      }
      if(e.target.closest?.('[data-epk-copy]')){
        const s=state();
        if(!s.epk_enabled||safe(document.querySelector('[name="status"]')?.value)!=='published'){notify('Enable EPK and publish your card before sharing.');return;}
        const ok=await bridge().saveSettings({manual:true});if(!ok)return;
        try{await navigator.clipboard.writeText(link());notify('Public EPK link copied.');}
        catch(_){notify('Copy the URL displayed above.');}
      }
    });
    paint();
  }
  function paintFields(){
    const s=state();names.forEach(name=>{
      const el=root?.querySelector(`[data-epk-field="${name}"]`);if(!el)return;
      if(el.type==='checkbox')el.checked=s[name]===true;
      else if(document.activeElement!==el)el.value=safe(s[name],limits[name]);
    });
  }
  function paintMedia(){
    const s=state(),host=root?.querySelector('[data-epk-media]');if(!host)return;
    const media=(Array.isArray(s.media_items)?s.media_items:[]).filter(x=>x&&safe(x.title)&&safe(x.url));
    host.innerHTML=media.map(m=>`<label class="artist-epk-media-choice"><input type="checkbox" data-epk-media-id="${esc(m.id)}" ${!Array.isArray(s.epk_media_ids)||s.epk_media_ids.includes(m.id)?'checked':''}><span>${icon(m.type==='video'?'video':m.type==='press'?'newspaper':m.type==='photo'?'image':'link')}<b>${esc(m.title)}</b><small>${esc(m.type||'link')}</small></span></label>`).join('')||'<p class="artist-epk-help">Add photos, performance videos or press links in the Media tab first.</p>';
  }
  function paintSummary(){
    const s=state(),bio=safe(s.epk_bio)||safe(document.querySelector('[name="biography"]')?.value);
    const checks=[
      Boolean(s.stage_name||document.querySelector('[name="full_name"]')?.value),
      Boolean(bio),
      Boolean((s.releases||[]).some(r=>safe(r.title)&&safe(r.listen_url))),
      selectedMedia().length>0,
      Boolean(s.epk_booking_email||s.epk_press_email||s.booking_url||document.querySelector('[name="email"]')?.value)
    ];
    const done=checks.filter(Boolean).length;
    const count=root?.querySelector('[data-epk-count]');if(count)count.textContent=`${done}/5 ready`;
    const progress=root?.querySelector('[data-epk-progress]');if(progress)progress.style.width=`${done*20}%`;
    root?.querySelectorAll('[data-epk-check]').forEach((el,i)=>{el.classList.toggle('complete',checks[i]);el.querySelector('i,svg')?.setAttribute('data-lucide',checks[i]?'check-circle-2':'circle');});
    const url=root?.querySelector('[data-epk-url]');if(url)url.textContent=link()||'Save your card URL to create the press-kit link.';
    const copy=root?.querySelector('[data-epk-copy]');if(copy)copy.disabled=!(s.epk_enabled&&safe(document.querySelector('[name="status"]')?.value)==='published'&&link());
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }
  function paint(){if(!root||!bridge()?.isLoaded())return;paintFields();paintMedia();paintSummary();}
  document.addEventListener('liw:artist-settings-rendered',()=>setTimeout(paint,0));
  let count=0;const timer=setInterval(()=>{
    count++;root=document.getElementById('artist-dressing-room');
    if(root&&bridge()){setup();if(bridge().isLoaded())paint();clearInterval(timer);}
    else if(count>100)clearInterval(timer);
  },200);
})();
