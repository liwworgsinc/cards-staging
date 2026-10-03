(function nativeEpkEditor(){
  'use strict';
  if(window.__LIW_NATIVE_EPK_EDITOR__)return;
  window.__LIW_NATIVE_EPK_EDITOR__=true;
  const MAX_MEDIA=4;
  const limits={epk_tagline:160,epk_bio:1800,epk_highlights:600,epk_press_email:180,epk_booking_email:180,epk_management_name:140,epk_management_email:180,epk_booking_requirements:700,epk_rider_notes:700,epk_rider_url:1800,epk_stage_plot_url:1800};
  const names=['epk_enabled','epk_tagline','epk_bio','epk_highlights','epk_press_email','epk_booking_email','epk_package_enabled','epk_management_name','epk_management_email','epk_booking_requirements','epk_rider_notes','epk_rider_url','epk_stage_plot_url'];
  let root=null;
  function bridge(){return window.LIWArtistEpkBridge;}
  function state(){return bridge()?.getState()||{};}
  function safe(v,max=1800){return String(v??'').trim().slice(0,max);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function epkAccess(){
    let key='starter',isAdmin=false,isPlanPreview=false,planName='Free';
    try{
      const access=typeof editorAccess!=='undefined'?editorAccess:null;
      isAdmin=Boolean(access?.isAdmin);
      isPlanPreview=Boolean(access?.isPlanPreview);
      key=String(access?.planKey||(typeof currentPlan!=='undefined'?currentPlan:'starter')||'starter').toLowerCase();
      planName=safe(access?.planName||'',80)||({starter:'Free',free:'Free',lite:'Lite',plus:'Plus',pro:'Pro',agency:'Agency',white_label:'White Label'}[key]||'Free');
    }catch(_){ }
    const unlocked=(isAdmin&&!isPlanPreview)||['pro','agency','white_label'].includes(key);
    return {key,isAdmin,isPlanPreview,planName,unlocked};
  }
  function syncEntitlementMarker(access=epkAccess()){
    if(access.isPlanPreview||!bridge()?.isLoaded())return;
    const s=state(),expected=Boolean(access.unlocked);
    if(s.epk_pro_entitled===expected)return;
    s.epk_pro_entitled=expected;
    bridge().queueSave();
  }
  function lockedPanelMarkup(access){
    return `<section class="artist-control-panel artist-epk-locked-panel" data-artist-panel="epk" data-epk-locked hidden>
      <header class="artist-panel-title"><div><span>PRESS KIT BUILDER · PRO</span><h4>Professional EPK</h4><p>See how your Showtime content becomes a promoter-ready press kit, then upgrade when you are ready to publish it.</p></div><span class="artist-epk-pro-badge">${icon('lock-keyhole',15)} PRO</span></header>
      <div class="artist-epk-lock-hero">
        <div><small>${icon('sparkles',15)} SHOWTIME PRO FEATURE</small><strong>Your EPK is built from the content you already add to Showtime.</strong><p>Free, Lite and Plus keep your artist profile, releases, shows and media. Pro unlocks the professional EPK, PDF and promoter package.</p></div>
        <a class="btn btn-primary" href="pricing.html#music-plans">${icon('crown',16)} Upgrade to Pro</a>
      </div>
      <section class="artist-section-card artist-epk-locked-preview-card">
        <div class="artist-section-head"><div><strong>Preview your Pro EPK</strong><span>This is a read-only preview. Nothing here is published until the account has Pro and EPK is enabled.</span></div>${icon('eye',18)}</div>
        <div class="artist-epk-pro-preview">
          <div class="artist-epk-pro-preview-top"><span>OFFICIAL ARTIST EPK</span><b data-epk-preview-name>Artist name</b><small data-epk-preview-meta>Showtime artist</small></div>
          <div class="artist-epk-pro-preview-grid">
            <div><small>ABOUT</small><strong>Artist biography</strong><p data-epk-preview-bio>Your professional artist story will appear here.</p></div>
            <div><small>MUSIC</small><strong data-epk-preview-release>Featured release</strong><p>Your existing Showtime releases feed the EPK automatically.</p></div>
            <div><small>LIVE</small><strong data-epk-preview-shows>0 upcoming shows</strong><p>Promoters can see upcoming dates and event links.</p></div>
            <div><small>PRESS MEDIA</small><strong data-epk-preview-media>0 media items</strong><p>Select photos, video, audio and press from your Media Library.</p></div>
          </div>
          <div class="artist-epk-pro-preview-package">${icon('file-archive',18)}<div><strong>Promoter package</strong><span>One-sheet PDF · press photos · booking details · rider / stage plot</span></div></div>
        </div>
      </section>
      <section class="artist-section-card artist-epk-lock-list">
        <strong>Pro unlocks</strong>
        <div><span>${icon('circle-check',15)} Full shareable EPK</span><span>${icon('circle-check',15)} Print / Save PDF</span><span>${icon('circle-check',15)} Downloadable promoter ZIP</span><span>${icon('circle-check',15)} Booking + technical rider details</span></div>
        <p>Your saved EPK information is preserved if your plan changes. It simply stays unavailable publicly until Pro is active.</p>
        <a class="btn btn-primary" href="pricing.html#music-plans">See Pro plan</a>
      </section>
    </section>`;
  }
  function paintLocked(access=epkAccess()){
    const s=state();
    const name=safe(s.stage_name||document.querySelector('[name="full_name"]')?.value,120)||'Your artist name';
    const meta=[safe(s.genre,80),safe(s.location,120)].filter(Boolean).join(' • ')||'Showtime artist';
    const bio=safe(s.epk_bio||document.querySelector('[name="biography"]')?.value,1800)||'Your professional artist story will appear here.';
    const releases=Array.isArray(s.releases)?s.releases.filter(r=>safe(r?.title)):[];
    const featured=releases.find(r=>r?.featured)||releases[0];
    const shows=Array.isArray(s.shows)?s.shows.filter(r=>safe(r?.date)||safe(r?.venue)||safe(r?.city)):[];
    const media=Array.isArray(s.media_items)?s.media_items.filter(m=>safe(m?.title)&&safe(m?.url)&&m.visible!==false):[];
    const set=(selector,value)=>{const el=root?.querySelector(selector);if(el)el.textContent=value;};
    set('[data-epk-preview-name]',name);set('[data-epk-preview-meta]',meta);set('[data-epk-preview-bio]',bio.slice(0,190)+(bio.length>190?'…':''));
    set('[data-epk-preview-release]',featured?.title||'Featured release');
    set('[data-epk-preview-shows]',shows.length+` upcoming show${shows.length===1?'':'s'}`);
    set('[data-epk-preview-media]',media.length+` media item${media.length===1?'':'s'}`);
    const panel=root?.querySelector('[data-epk-locked]');if(panel)panel.dataset.plan=access.key;
  }
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
    const eligible=(Array.isArray(s.media_items)?s.media_items:[]).filter(m=>m&&safe(m.title)&&safe(m.url)&&m.visible!==false&&m.epk_include!==false);
    return (Array.isArray(s.epk_media_ids)?eligible.filter(m=>s.epk_media_ids.includes(m.id)):eligible).slice(0,MAX_MEDIA);
  }
  function field(name,label,placeholder='',area=false,rows=4){
    return `<label class="artist-control-field"><span>${label}</span>${area?`<textarea class="input" rows="${rows}" maxlength="${limits[name]}" data-epk-field="${name}" placeholder="${esc(placeholder)}"></textarea>`:`<input class="input" type="${name.endsWith('_email')?'email':name.endsWith('_url')?'url':'text'}" data-epk-field="${name}" placeholder="${esc(placeholder)}" maxlength="${limits[name]}">`}</label>`;
  }
  function setup(){
    const panel=root?.querySelector('[data-artist-panel="profile"]');
    const nav=root?.querySelector('[data-artist-nav="profile"]');
    if(!root||!panel||!nav||root.querySelector('[data-artist-panel="epk"]'))return;
    const access=epkAccess();
    nav.insertAdjacentHTML('beforebegin',`<button type="button" data-artist-nav="epk" class="${access.unlocked?'':'artist-epk-nav-locked'}">${icon(access.unlocked?'file-user':'lock',17)}<span>EPK</span>${access.unlocked?'':'<small>PRO</small>'}</button>`);
    if(!access.unlocked){
      panel.insertAdjacentHTML('beforebegin',lockedPanelMarkup(access));
      syncEntitlementMarker(access);paintLocked(access);
      if(window.lucide)try{lucide.createIcons();}catch(_){}
      return;
    }
    syncEntitlementMarker(access);
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
          <p class="artist-epk-help" data-epk-media-count aria-live="polite">Select up to four items for this press kit.</p>
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
        <section class="artist-section-card artist-promoter-builder">
          <div class="artist-section-head"><div><strong>${icon('package',17)} Downloadable promoter package</strong><span>Create a ZIP with a one-page PDF bio, press photos and the booking/technical details you supply.</span></div>${icon('file-archive',19)}</div>
          <label class="artist-epk-toggle artist-package-toggle"><input type="checkbox" data-epk-field="epk_package_enabled"><span>Allow EPK visitors to download this promoter package</span></label>
          <p class="artist-epk-help">Off until you enable it. Only add information you are comfortable sharing publicly. The package includes selected press photos; it never invents a rider or stage plot.</p>
          <div class="artist-card-grid artist-card-grid-2">
            ${field('epk_management_name','Manager / booking contact name','Name or agency')}
            ${field('epk_management_email','Management email','management@example.com')}
          </div>
          ${field('epk_booking_requirements','Booking requirements (optional)','Performance setup, lead time, hospitality, and booking notes',true,4)}
          ${field('epk_rider_notes','Technical rider notes (optional)','Inputs, microphones, monitoring or equipment required',true,4)}
          ${field('epk_rider_url','Technical rider PDF / image URL','Link to your existing rider document')}
          ${field('epk_stage_plot_url','Stage plot PDF / image URL','Link to your stage plot or upload a photo below')}
          <div class="artist-epk-plot-upload">
            <label class="btn btn-light btn-sm">${icon('image-up',15)} Upload stage plot image<input type="file" accept="image/png,image/jpeg,image/webp" data-epk-stage-plot-upload hidden></label>
            <button type="button" class="btn btn-ghost btn-sm" data-epk-remove-stage-plot>Clear stage plot</button>
            <p role="status" data-epk-plot-status>PNG, JPG or WebP · maximum 5 MB. PDF riders and plots can be added using a direct file URL.</p>
          </div>
          <div class="artist-epk-package-summary" data-epk-package-summary aria-live="polite"></div>
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
      if(el.checked&&s.epk_media_ids.length>=MAX_MEDIA){notify('Choose up to four press media items.');paintMedia();return;}
      s.epk_media_ids=el.checked?[...new Set([...s.epk_media_ids,el.dataset.epkMediaId])].slice(0,MAX_MEDIA):s.epk_media_ids.filter(id=>id!==el.dataset.epkMediaId);
      bridge().queueSave();paintMedia();paintSummary();
    });

    root.addEventListener('change',async e=>{
      const input=e.target.closest?.('[data-epk-stage-plot-upload]');if(!input)return;
      const file=input.files?.[0];if(!file)return;
      const status=root.querySelector('[data-epk-plot-status]');
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){
        if(status)status.textContent='Use a PNG, JPG or WebP image under 5 MB.';
        input.value='';return;
      }
      try{
        if(status)status.textContent='Uploading stage plot…';
        const {data,error}=await supabaseClient.auth.getUser();
        if(error||!data?.user)throw Error('Sign in to upload your stage plot.');
        const id=(await bridge().resolveCardId({createIfNeeded:true}));
        if(!id)throw Error('Save your artist card before uploading a stage plot.');
        const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-').slice(0,90);
        const path=`${data.user.id}/artist-stage-plots/${id}-${Date.now()}-${clean}`;
        const saved=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
        if(saved.error)throw saved.error;
        const {data:url}=supabaseClient.storage.from('profile-images').getPublicUrl(path);
        state().epk_stage_plot_url=url.publicUrl;
        bridge().queueSave();paintFields();paintSummary();
        if(status)status.textContent='Stage plot uploaded and added to the package.';
      }catch(error){
        if(status)status.textContent=safe(error?.message,170)||'Stage plot upload failed.';
      }finally{input.value='';}
    });
    root.addEventListener('click',async e=>{
      if(e.target.closest?.('[data-artist-nav="epk"]')){paint();return;}
      if(e.target.closest?.('[data-epk-remove-stage-plot]')){
        state().epk_stage_plot_url='';
        bridge().queueSave();paintFields();paintSummary();
        const status=root.querySelector('[data-epk-plot-status]');if(status)status.textContent='Stage plot removed from the package.';
        return;
      }
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
    const media=(Array.isArray(s.media_items)?s.media_items:[]).filter(x=>x&&safe(x.title)&&safe(x.url)&&x.visible!==false&&x.epk_include!==false);
    const active=new Set(selectedMedia().map(m=>m.id));
    const note=root?.querySelector('[data-epk-media-count]');if(note)note.textContent=`${active.size}/${MAX_MEDIA} media selected · Your EPK shows only these items.`;
    host.innerHTML=media.map(m=>`<label class="artist-epk-media-choice"><input type="checkbox" data-epk-media-id="${esc(m.id)}" ${active.has(m.id)?'checked':''} ${!active.has(m.id)&&active.size>=MAX_MEDIA?'disabled':''}><span>${icon(m.type==='video'?'video':m.type==='press'?'newspaper':m.type==='photo'?'image':m.type==='audio'?'headphones':'link')}<b>${esc(m.title)}</b><small>${esc(m.type||'link')}</small></span></label>`).join('')||'<p class="artist-epk-help">Add photos, performance videos or press links in the Media tab first.</p>';
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
    root?.querySelectorAll('[data-epk-check]').forEach((el,i)=>el.classList.toggle('complete',checks[i]));
    const url=root?.querySelector('[data-epk-url]');if(url)url.textContent=link()||'Save your card URL to create the press-kit link.';
    const copy=root?.querySelector('[data-epk-copy]');if(copy)copy.disabled=!(s.epk_enabled&&safe(document.querySelector('[name="status"]')?.value)==='published'&&link());
    const packageSummary=root?.querySelector('[data-epk-package-summary]');
    if(packageSummary){
      const photoCount=selectedMedia().filter(m=>m.type==='photo').length+(document.querySelector('[name="profile_image_url"]')?.value?1:0);
      packageSummary.innerHTML=`<strong>${s.epk_package_enabled?'Promoter ZIP enabled':'Promoter ZIP currently off'}</strong><span>One-sheet PDF · ${photoCount} official photo${photoCount===1?'':'s'} · ${s.epk_rider_url||s.epk_rider_notes?'Rider supplied':'No rider yet'} · ${s.epk_stage_plot_url?'Stage plot supplied':'No stage plot yet'}</span>`;
    }
  }
  function paint(){
    if(!root||!bridge()?.isLoaded())return;
    const access=epkAccess();syncEntitlementMarker(access);
    if(!access.unlocked){paintLocked(access);if(window.lucide)try{lucide.createIcons();}catch(_){}return;}
    paintFields();paintMedia();paintSummary();if(window.lucide)try{lucide.createIcons();}catch(_){}
  }
  document.addEventListener('liw:artist-settings-rendered',()=>setTimeout(paint,0));
  let count=0;const timer=setInterval(()=>{
    count++;root=document.getElementById('artist-dressing-room');
    if(root&&bridge()){setup();if(bridge().isLoaded())paint();clearInterval(timer);}
    else if(count>100)clearInterval(timer);
  },200);
})();
