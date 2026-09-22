/* LIW Cards staging common bootstrap — preserves the current common runtime, then applies startup safety before page scripts continue. */
(function(){
  const current=document.currentScript?.src||location.href;
  const core=new URL('common-core-staging-20260915.js?v=20260921-mobile-auth-1',current).href;
  const patch=new URL('common-startup-safety-staging-20260915.js?v=20260921-mobile-auth-1',current).href;
  const tag=src=>`<script src="${src.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><\/script>`;

  const isGrowthCenter=/\/admin-growth(?:\.html)?$/.test(location.pathname);
  let growthGuardTimer=null;

  function removeGrowthGuard(){
    clearTimeout(growthGuardTimer);
    document.getElementById('liw-growth-auth-guard')?.remove();
  }

  function installGrowthIndustryEntry(){
    if(!isGrowthCenter)return;
    const seoPanel=document.querySelector('[data-panel="seo"]');
    if(seoPanel&&!document.getElementById('growth-industry-pages-entry')){
      const entry=document.createElement('article');
      entry.id='growth-industry-pages-entry';
      entry.className='card growth-card';
      entry.style.marginBottom='16px';
      entry.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap"><div style="max-width:760px"><span class="eyebrow">Search expansion</span><h2 style="margin:7px 0 8px">Industry Landing Pages</h2><p class="muted" style="margin:0;line-height:1.6">Build and review search-focused pages for barbers, realtors, artists, nail artists, mechanics, restaurants and future business categories. Every staging page stays noindex until production approval.</p></div><div class="growth-actions" style="margin-top:0"><a class="btn btn-primary" href="admin-industry-pages.html">Open page builder</a><a class="btn btn-light" href="digital-business-card-by-industry.html" target="_blank" rel="noopener">View industry hub</a></div></div>`;
      seoPanel.insertBefore(entry,seoPanel.firstChild);
    }
    const growthLink=document.querySelector('.sidebar a[href="admin-growth.html"]');
    if(growthLink&&!document.querySelector('.sidebar a[href="admin-industry-pages.html"]')){
      const link=document.createElement('a');
      link.href='admin-industry-pages.html';
      link.innerHTML='<i data-lucide="layout-template" size="18"></i> Industry pages';
      growthLink.insertAdjacentElement('afterend',link);
    }
    if(window.lucide)window.lucide.createIcons();
  }

  function showGrowthGuard(message='Loading Growth Center…',detail='Checking your LIW admin session.'){
    if(!isGrowthCenter||document.getElementById('liw-growth-auth-guard'))return;
    const guard=document.createElement('div');
    guard.id='liw-growth-auth-guard';
    guard.setAttribute('role','status');
    guard.style.cssText='position:fixed;inset:0;z-index:999999;display:grid;place-items:center;padding:24px;background:#f4f6fb;color:#101b35;font:600 15px/1.45 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    guard.innerHTML=`<div style="width:min(520px,100%);padding:28px;border:1px solid #dfe5ef;border-radius:20px;background:#fff;box-shadow:0 18px 50px rgba(11,20,56,.12);text-align:center"><div style="width:46px;height:46px;margin:0 auto 14px;border:4px solid #e7ebf3;border-top-color:#0b1438;border-radius:50%;animation:liwGrowthSpin .9s linear infinite"></div><strong id="liw-growth-auth-title" style="display:block;font-size:20px">${message}</strong><span id="liw-growth-auth-detail" style="display:block;margin-top:7px;color:#687389;font-weight:500">${detail}</span><div id="liw-growth-auth-actions" style="display:none;margin-top:18px;gap:10px;justify-content:center;flex-wrap:wrap"></div></div><style>@keyframes liwGrowthSpin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(guard);
  }

  function updateGrowthGuard(message,detail,actions=''){
    showGrowthGuard();
    const title=document.getElementById('liw-growth-auth-title');
    const sub=document.getElementById('liw-growth-auth-detail');
    const actionBox=document.getElementById('liw-growth-auth-actions');
    if(title)title.textContent=message;
    if(sub)sub.textContent=detail||'';
    if(actionBox&&actions){actionBox.style.display='flex';actionBox.innerHTML=actions;}
  }

  async function verifyGrowthCenterAccess(){
    if(!isGrowthCenter)return;
    showGrowthGuard();

    for(let i=0;i<40;i++){
      if(typeof window.supabaseClient!=='undefined'&&typeof window.getLiwSessionUser==='function'&&typeof window.isLiwAdminAccount==='function')break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }

    if(typeof window.supabaseClient==='undefined'||typeof window.getLiwSessionUser!=='function'||typeof window.isLiwAdminAccount!=='function'){
      updateGrowthGuard('Growth Center could not start','The staging auth runtime did not load. Refresh once; if it persists, the staging build needs repair.',`<button onclick="location.reload()" style="border:0;border-radius:11px;padding:11px 15px;background:#0b1438;color:#fff;font-weight:800;cursor:pointer">Refresh</button><a href="admin.html" style="border-radius:11px;padding:11px 15px;background:#edf1f7;color:#17233d;text-decoration:none;font-weight:800">Back to Admin</a>`);
      return;
    }

    try{
      const user=await Promise.race([
        window.getLiwSessionUser(),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('session-timeout')),4500))
      ]);

      if(!user){
        location.replace(typeof window.liwUrl==='function'?window.liwUrl('login.html'):new URL('login.html',location.href).href);
        return;
      }

      let profile=null;
      try{
        const result=await Promise.race([
          window.supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle(),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('profile-timeout')),3500))
        ]);
        profile=result?.data||null;
      }catch(error){
        console.warn('[LIW Growth Center] profile lookup fallback',error);
      }

      if(window.isLiwAdminAccount(user,profile)){
        document.body.classList.remove('growth-auth-pending');
        removeGrowthGuard();
        installGrowthIndustryEntry();
        return;
      }

      updateGrowthGuard('Admin access required','This Growth Center is limited to the LIW owner/admin account.',`<a href="dashboard.html" style="border-radius:11px;padding:11px 15px;background:#0b1438;color:#fff;text-decoration:none;font-weight:800">Back to Dashboard</a>`);
    }catch(error){
      console.error('[LIW Growth Center] auth guard',error);
      updateGrowthGuard('Could not verify admin access','Your staging session did not finish loading. Sign in again or refresh this page.',`<a href="login.html" style="border-radius:11px;padding:11px 15px;background:#0b1438;color:#fff;text-decoration:none;font-weight:800">Sign in</a><button onclick="location.reload()" style="border:0;border-radius:11px;padding:11px 15px;background:#edf1f7;color:#17233d;font-weight:800;cursor:pointer">Refresh</button>`);
    }
  }

  if(isGrowthCenter){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showGrowthGuard,{once:true});
    else showGrowthGuard();
    growthGuardTimer=setTimeout(()=>verifyGrowthCenterAccess(),150);
  }

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
  load(core).then(()=>load(patch)).then(()=>verifyGrowthCenterAccess()).catch(error=>{
    console.error('[LIW common bootstrap]',error);
    if(isGrowthCenter)updateGrowthGuard('Growth Center could not start','A required staging script failed to load. Refresh the page and try again.',`<button onclick="location.reload()" style="border:0;border-radius:11px;padding:11px 15px;background:#0b1438;color:#fff;font-weight:800;cursor:pointer">Refresh</button>`);
  });
})();