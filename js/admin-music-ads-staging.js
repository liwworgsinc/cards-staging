(function(){
  'use strict';
  if(window.__LIW_ADMIN_MUSIC_ADS_V2__)return;
  window.__LIW_ADMIN_MUSIC_ADS_V2__=true;

  const PLACEMENT='music_home_bottom';
  const PAGE='admin-music-ads.html';
  let currentUser=null;
  let campaigns=[];
  let editingId='';

  const esc=(value='')=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const val=id=>String(document.getElementById(id)?.value||'').trim();
  const setVal=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??'';};
  const notify=message=>{if(typeof toast==='function')toast(message);else alert(message);};
  const validHttpUrl=value=>{try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol);}catch(_){return false;}};
  const toIsoOrNull=value=>{if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();};
  const toLocalInput=value=>{if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;};

  function pageName(){return String(location.pathname.split('/').pop()||'admin.html').toLowerCase();}

  async function isAdmin(){
    try{
      const {data:{user},error:userError}=await supabaseClient.auth.getUser();
      if(userError||!user)return false;
      currentUser=user;
      const {data:profile,error}=await supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle();
      if(error)return false;
      if(typeof isLiwAdminAccount==='function')return Boolean(isLiwAdminAccount(user,profile));
      return profile?.role==='admin';
    }catch(error){console.warn('[LIW Music Ads] admin check failed',error);return false;}
  }

  function ensureAdminRoute(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return;
    sidebar.querySelectorAll('a[href="#admin-music-ads-panel"]').forEach(link=>link.remove());
    let link=sidebar.querySelector(`a[href="${PAGE}"]`);
    if(!link){
      const overview=sidebar.querySelector('nav a[href="admin.html"]');
      if(overview){
        overview.insertAdjacentHTML('afterend',`<a href="${PAGE}" data-liw-music-ads-route="true"><i data-lucide="badge-dollar-sign" size="18"></i> Music ads</a>`);
        link=sidebar.querySelector(`a[href="${PAGE}"]`);
      }
    }
    if(link){
      link.href=PAGE;
      link.dataset.liwMusicAdsRoute='true';
      if(pageName()===PAGE)link.classList.add('active');
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function panelMarkup(){return `
    <section class="card admin-panel admin-support-panel admin-music-ads-panel" id="admin-music-ads-panel">
      <div class="section-title admin-section-title">
        <div><span class="eyebrow">Free plan monetization</span><h2>Music card ads</h2><p class="muted">Control the sponsored or LIW promo card that can use the reserved bottom space on Free Music cards.</p></div>
        <span class="status-pill published">Super Admin only</span>
      </div>
      <div class="admin-music-ads-note"><i data-lucide="shield-check" size="20"></i><div><strong>Free only. Lite and above are always ad-free.</strong><span>Campaigns never replace artist content. They use only the dedicated Music bottom slot.</span></div></div>
      <div class="admin-music-ads-layout">
        <form class="admin-music-ad-form" id="admin-music-ad-form">
          <h3 id="admin-music-ad-form-title">Create campaign</h3><p>Use LIW promos, sponsors, partners, events, or other approved offers.</p>
          <div class="admin-music-ad-grid">
            <label><span>Campaign name</span><input class="input" id="admin-music-ad-name" maxlength="100" placeholder="September LIW promo" required></label>
            <label><span>Ad label</span><input class="input" id="admin-music-ad-label" maxlength="40" value="Sponsored" required></label>
            <label class="wide"><span>Headline</span><input class="input" id="admin-music-ad-headline" maxlength="120" placeholder="Get your own LIW card" required></label>
            <label class="wide"><span>Short copy</span><textarea class="input" id="admin-music-ad-body" maxlength="180" placeholder="Optional one-line supporting copy"></textarea></label>
            <label class="wide"><span>Image URL <small>(optional)</small></span><input class="input" id="admin-music-ad-image" inputmode="url" placeholder="https://..."></label>
            <label class="wide"><span>Destination URL</span><input class="input" id="admin-music-ad-url" inputmode="url" placeholder="https://..." required></label>
            <label><span>Button text</span><input class="input" id="admin-music-ad-button" maxlength="32" value="Learn more"></label>
            <label><span>Priority</span><input class="input" id="admin-music-ad-priority" type="number" min="0" max="9999" value="100"></label>
            <label><span>Starts <small>(optional)</small></span><input class="input" id="admin-music-ad-start" type="datetime-local"></label>
            <label><span>Ends <small>(optional)</small></span><input class="input" id="admin-music-ad-end" type="datetime-local"></label>
            <label class="wide admin-music-ad-toggle"><input id="admin-music-ad-enabled" type="checkbox"><span><strong>Campaign enabled</strong><small>It shows only while its schedule is active.</small></span></label>
          </div>
          <div class="admin-music-ad-preview" id="admin-music-ad-preview"><small>Sponsored</small><strong>Your headline will appear here</strong><p>Free Music cards use the selected template colors around this ad.</p></div>
          <div class="admin-music-ad-form-actions"><button class="btn btn-primary" type="submit"><i data-lucide="save" size="16"></i> <span id="admin-music-ad-save-label">Save campaign</span></button><button class="btn btn-light" id="admin-music-ad-reset" type="button">New campaign</button></div>
        </form>
        <div class="admin-music-ad-list-card"><h3>Music bottom campaigns</h3><p>Highest-priority active campaign wins when schedules overlap.</p><div class="admin-music-ad-list" id="admin-music-ad-list"><div class="admin-music-ad-empty">Loading campaigns…</div></div></div>
      </div>
    </section>`;}

  function mountManager(){
    if(document.getElementById('admin-music-ads-panel'))return;
    const main=document.querySelector('main.main');if(!main)return;
    main.insertAdjacentHTML('beforeend',panelMarkup());
    document.getElementById('admin-music-ad-form')?.addEventListener('submit',saveCampaign);
    document.getElementById('admin-music-ad-reset')?.addEventListener('click',resetForm);
    ['admin-music-ad-label','admin-music-ad-headline','admin-music-ad-body'].forEach(id=>document.getElementById(id)?.addEventListener('input',renderPreview));
    document.getElementById('admin-music-ad-list')?.addEventListener('click',event=>{
      const edit=event.target.closest('[data-ad-edit]');if(edit)return editCampaign(edit.dataset.adEdit);
      const toggle=event.target.closest('[data-ad-toggle]');if(toggle)return toggleCampaign(toggle.dataset.adToggle,toggle.dataset.next==='true');
      const del=event.target.closest('[data-ad-delete]');if(del)return deleteCampaign(del.dataset.adDelete);
    });
    renderPreview();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function renderPreview(){
    const node=document.getElementById('admin-music-ad-preview');if(!node)return;
    const label=val('admin-music-ad-label')||'Sponsored';
    const headline=val('admin-music-ad-headline')||'Your headline will appear here';
    const body=val('admin-music-ad-body')||'Free Music cards use the selected template colors around this ad.';
    node.innerHTML=`<small>${esc(label)}</small><strong>${esc(headline)}</strong><p>${esc(body)}</p>`;
  }

  async function loadCampaigns(){
    const {data,error}=await supabaseClient.from('platform_ad_campaigns').select('*').eq('placement',PLACEMENT).eq('target_plan','starter').order('priority',{ascending:false}).order('updated_at',{ascending:false});
    if(error){notify(error.message);return;}
    campaigns=data||[];renderCampaigns();
  }

  function campaignState(row){
    if(!row.is_enabled)return ['Paused','off'];
    const now=Date.now(),start=row.starts_at?new Date(row.starts_at).getTime():0,end=row.ends_at?new Date(row.ends_at).getTime():0;
    if(start&&start>now)return ['Scheduled',''];
    if(end&&end<=now)return ['Ended','off'];
    return ['Active',''];
  }

  function renderCampaigns(){
    const list=document.getElementById('admin-music-ad-list');if(!list)return;
    if(!campaigns.length){list.innerHTML='<div class="admin-music-ad-empty"><strong>No Music ad campaigns yet.</strong><br>Create one here. Until then, Free Music cards simply use the full normal layout.</div>';return;}
    list.innerHTML=campaigns.map(row=>{
      const [state,stateClass]=campaignState(row);
      const schedule=[row.starts_at?`Starts ${new Date(row.starts_at).toLocaleString()}`:'Starts now',row.ends_at?`Ends ${new Date(row.ends_at).toLocaleString()}`:'No end date'].join(' · ');
      return `<article class="admin-music-ad-item ${state==='Active'?'is-active':''}"><div class="admin-music-ad-item-main"><div class="admin-music-ad-item-top"><strong>${esc(row.campaign_name)}</strong><span class="admin-music-ad-status ${stateClass}">${esc(state)}</span></div><p><b>${esc(row.label)}</b> · ${esc(row.headline)}</p><div class="admin-music-ad-meta"><span>Priority ${Number(row.priority)||0}</span><span>Free Music</span><span>${esc(schedule)}</span></div></div><div class="admin-music-ad-item-actions"><button class="btn btn-light btn-sm" type="button" data-ad-edit="${row.id}">Edit</button><button class="btn btn-light btn-sm" type="button" data-ad-toggle="${row.id}" data-next="${row.is_enabled?'false':'true'}">${row.is_enabled?'Pause':'Enable'}</button><button class="btn btn-light btn-sm" type="button" data-ad-delete="${row.id}">Delete</button></div></article>`;
    }).join('');
  }

  function payload(){
    const destination=val('admin-music-ad-url'),image=val('admin-music-ad-image');
    if(!validHttpUrl(destination))throw new Error('Destination URL must start with http:// or https://');
    if(image&&!validHttpUrl(image))throw new Error('Image URL must start with http:// or https://');
    const start=toIsoOrNull(val('admin-music-ad-start')),end=toIsoOrNull(val('admin-music-ad-end'));
    if(start&&end&&new Date(end)<=new Date(start))throw new Error('End time must be after the start time.');
    return {placement:PLACEMENT,target_plan:'starter',campaign_name:val('admin-music-ad-name'),label:val('admin-music-ad-label')||'Sponsored',headline:val('admin-music-ad-headline'),body:val('admin-music-ad-body'),image_url:image,destination_url:destination,button_text:val('admin-music-ad-button')||'Learn more',priority:Math.max(0,Math.min(9999,Number(val('admin-music-ad-priority'))||100)),starts_at:start,ends_at:end,is_enabled:Boolean(document.getElementById('admin-music-ad-enabled')?.checked),updated_at:new Date().toISOString(),created_by:currentUser?.id||null};
  }

  async function saveCampaign(event){
    event.preventDefault();
    try{
      const data=payload();
      if(!data.campaign_name)throw new Error('Campaign name is required.');
      if(!data.headline)throw new Error('Headline is required.');
      const result=editingId?await supabaseClient.from('platform_ad_campaigns').update(data).eq('id',editingId).select().single():await supabaseClient.from('platform_ad_campaigns').insert(data).select().single();
      if(result.error)throw result.error;
      notify(editingId?'Campaign updated.':'Campaign created.');
      resetForm();await loadCampaigns();
    }catch(error){notify(error?.message||'Could not save campaign.');}
  }

  function editCampaign(id){
    const row=campaigns.find(item=>item.id===id);if(!row)return;editingId=id;
    setVal('admin-music-ad-name',row.campaign_name);setVal('admin-music-ad-label',row.label);setVal('admin-music-ad-headline',row.headline);setVal('admin-music-ad-body',row.body);setVal('admin-music-ad-image',row.image_url);setVal('admin-music-ad-url',row.destination_url);setVal('admin-music-ad-button',row.button_text);setVal('admin-music-ad-priority',row.priority);setVal('admin-music-ad-start',toLocalInput(row.starts_at));setVal('admin-music-ad-end',toLocalInput(row.ends_at));
    const enabled=document.getElementById('admin-music-ad-enabled');if(enabled)enabled.checked=Boolean(row.is_enabled);
    document.getElementById('admin-music-ad-form-title').textContent='Edit campaign';document.getElementById('admin-music-ad-save-label').textContent='Update campaign';renderPreview();document.getElementById('admin-music-ad-form')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function toggleCampaign(id,next){
    const {error}=await supabaseClient.from('platform_ad_campaigns').update({is_enabled:next,updated_at:new Date().toISOString()}).eq('id',id);
    if(error)return notify(error.message);notify(next?'Campaign enabled.':'Campaign paused.');await loadCampaigns();
  }

  async function deleteCampaign(id){
    const row=campaigns.find(item=>item.id===id);if(!row||!confirm(`Delete campaign “${row.campaign_name}”?`))return;
    const {error}=await supabaseClient.from('platform_ad_campaigns').delete().eq('id',id);
    if(error)return notify(error.message);if(editingId===id)resetForm();notify('Campaign deleted.');await loadCampaigns();
  }

  function resetForm(){
    editingId='';document.getElementById('admin-music-ad-form')?.reset();setVal('admin-music-ad-label','Sponsored');setVal('admin-music-ad-button','Learn more');setVal('admin-music-ad-priority','100');document.getElementById('admin-music-ad-form-title').textContent='Create campaign';document.getElementById('admin-music-ad-save-label').textContent='Save campaign';renderPreview();
  }

  async function init(){
    ensureAdminRoute();
    if(pageName()!==PAGE)return;
    if(!(await isAdmin())){location.replace('admin.html');return;}
    mountManager();await loadCampaigns();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();