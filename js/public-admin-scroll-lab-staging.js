/* LIW Cards — Admin Scroll Lab (staging only)
   Experimental admin experience. It does not change saved card data or customer
   themes. Activate with liwAdminScroll=1; the admin editor adds this automatically.
*/
(function(){
  'use strict';

  const params=new URLSearchParams(window.location.search);
  if(params.get('liwAdminScroll')!=='1')return;
  if(window.__LIW_ADMIN_SCROLL_LAB__)return;
  window.__LIW_ADMIN_SCROLL_LAB__=true;

  const root=document.documentElement;
  const card=document.getElementById('card');
  if(!card)return;

  root.classList.add('liw-admin-scroll-lab');
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;

  const style=document.createElement('style');
  style.id='liw-admin-scroll-lab-style';
  style.textContent=`
    html.liw-admin-scroll-lab{--liw-admin-scroll-progress:0;--liw-admin-cover-shift:0px;--liw-admin-avatar-scale:1;--liw-admin-glow-x:50%}
    html.liw-admin-scroll-lab body.public-body{scroll-behavior:smooth;overflow-x:hidden;padding-bottom:max(94px,env(safe-area-inset-bottom))}
    html.liw-admin-scroll-lab body.public-body::before{content:"";position:fixed;z-index:-1;inset:0;pointer-events:none;background:radial-gradient(circle at var(--liw-admin-glow-x) 8%,rgba(123,91,255,.13),transparent 30%),radial-gradient(circle at 88% 68%,rgba(230,95,219,.08),transparent 26%)}
    html.liw-admin-scroll-lab .liw-admin-scroll-progress{position:fixed;z-index:9998;top:0;left:0;width:100%;height:3px;pointer-events:none;background:rgba(255,255,255,.10)}
    html.liw-admin-scroll-lab .liw-admin-scroll-progress::after{content:"";display:block;height:100%;width:calc(var(--liw-admin-scroll-progress) * 100%);background:linear-gradient(90deg,#6f7cff,#9b6cff,#e86ad8);box-shadow:0 0 16px rgba(155,108,255,.65);transition:width 80ms linear}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity{position:fixed;z-index:9997;top:12px;left:50%;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 32px);padding:7px 11px 7px 8px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(10,14,28,.74);box-shadow:0 14px 36px rgba(0,0,0,.26);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);opacity:0;transform:translate(-50%,-16px) scale(.96);pointer-events:none;transition:opacity .28s ease,transform .32s cubic-bezier(.2,.8,.2,1)}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}
    html.liw-admin-scroll-lab .liw-admin-scroll-mini-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background-position:center;background-size:cover;background-color:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;overflow:hidden}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-copy{min-width:0;line-height:1.05}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-name{display:block;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:12px;font-weight:800;letter-spacing:.01em}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-label{display:block;margin-top:3px;color:rgba(255,255,255,.62);font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    html.liw-admin-scroll-lab #public-cover{transform:translate3d(0,var(--liw-admin-cover-shift),0) scale(1.01);transform-origin:center top;will-change:transform;filter:saturate(1.04)}
    html.liw-admin-scroll-lab #avatar{transform:scale(var(--liw-admin-avatar-scale));transform-origin:center center;will-change:transform;box-shadow:0 14px 38px rgba(9,12,28,.16)}
    html.liw-admin-scroll-lab .liw-admin-scroll-item{opacity:0;transform:translate3d(0,30px,0) scale(.982);transition:opacity .52s ease,transform .68s cubic-bezier(.2,.72,.2,1);will-change:opacity,transform}
    html.liw-admin-scroll-lab .liw-admin-scroll-item.liw-admin-scroll-visible{opacity:1;transform:translate3d(0,0,0) scale(1)}
    html.liw-admin-scroll-lab .public-section.liw-admin-scroll-item{transition-duration:.58s,.72s}
    html.liw-admin-scroll-lab .public-section{position:relative;border-radius:24px;box-shadow:0 16px 46px rgba(11,15,35,.065);transition:box-shadow .35s ease,transform .35s ease}
    html.liw-admin-scroll-lab .public-section.liw-admin-scroll-current{box-shadow:0 22px 58px rgba(56,35,105,.13);transform:translateY(-2px)}
    html.liw-admin-scroll-lab .public-section-heading h2{transform-origin:left center}
    html.liw-admin-scroll-lab .public-section.liw-admin-scroll-active .public-section-heading h2{animation:liwAdminHeadingSettle .42s cubic-bezier(.2,.8,.2,1) both}
    html.liw-admin-scroll-lab .public-service-list>*{position:sticky;top:calc(84px + (var(--liw-stack-index,0) * 9px));z-index:calc(20 - var(--liw-stack-index,0));transform-origin:center top;box-shadow:0 12px 34px rgba(14,20,42,.08)}
    html.liw-admin-scroll-lab .public-product-grid{display:flex!important;gap:12px;overflow-x:auto!important;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;padding:4px 7vw 15px;scrollbar-width:none;margin-left:-7vw;margin-right:-7vw}
    html.liw-admin-scroll-lab .public-product-grid::-webkit-scrollbar{display:none}
    html.liw-admin-scroll-lab .public-product-grid>*{flex:0 0 min(82vw,340px);scroll-snap-align:center;scroll-snap-stop:always;box-shadow:0 14px 34px rgba(14,20,42,.08);transition:transform .28s ease,box-shadow .28s ease}
    html.liw-admin-scroll-lab .public-product-grid>*:focus-within,html.liw-admin-scroll-lab .public-product-grid>*:hover{transform:translateY(-3px);box-shadow:0 20px 40px rgba(14,20,42,.13)}
    html.liw-admin-scroll-lab .public-socials{scroll-snap-type:x proximity}
    html.liw-admin-scroll-lab .public-socials>*{scroll-snap-align:center}
    html.liw-admin-scroll-lab .public-service-list>* ,html.liw-admin-scroll-lab .public-product-grid>* ,html.liw-admin-scroll-lab .public-socials>*{transition-property:transform,opacity,box-shadow;transition-duration:.32s}
    html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-service-list>* ,html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-product-grid>* ,html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-socials>*{transform:translateY(12px);opacity:.72}
    html.liw-admin-scroll-lab .liw-admin-lab-dock{position:fixed;z-index:9996;left:50%;bottom:max(13px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:4px;max-width:calc(100vw - 24px);padding:6px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(8,12,26,.82);box-shadow:0 18px 48px rgba(0,0,0,.28);backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}
    html.liw-admin-scroll-lab .liw-admin-lab-dock button{appearance:none;border:0;min-width:38px;height:38px;padding:0 11px;display:flex;align-items:center;justify-content:center;gap:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.65);font:800 10px/1 system-ui,-apple-system,sans-serif;cursor:pointer;transition:background .25s ease,color .25s ease,min-width .3s ease,gap .3s ease,transform .25s ease}
    html.liw-admin-scroll-lab .liw-admin-lab-dock button:hover{color:#fff;transform:translateY(-1px)}
    html.liw-admin-scroll-lab .liw-admin-lab-dock button.is-active{min-width:76px;gap:6px;background:linear-gradient(135deg,rgba(104,116,255,.9),rgba(169,92,238,.9));color:#fff;box-shadow:0 8px 22px rgba(116,91,255,.32)}
    html.liw-admin-scroll-lab .liw-admin-lab-dock button span{display:none;white-space:nowrap}
    html.liw-admin-scroll-lab .liw-admin-lab-dock button.is-active span{display:inline}
    html.liw-admin-scroll-lab .liw-admin-lab-dock svg{width:16px;height:16px;stroke-width:2}
    html.liw-admin-scroll-lab .liw-admin-lab-dock-dot{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px rgba(255,255,255,.05)}
    @keyframes liwAdminHeadingSettle{0%{letter-spacing:.045em;transform:translateX(-5px);opacity:.72}100%{letter-spacing:normal;transform:translateX(0);opacity:1}}
    @media (min-width:760px){html.liw-admin-scroll-lab .liw-admin-scroll-identity{top:18px}html.liw-admin-scroll-lab .liw-admin-lab-dock{bottom:18px}}
    @media (prefers-reduced-motion:reduce){html.liw-admin-scroll-lab body.public-body{scroll-behavior:auto}html.liw-admin-scroll-lab #public-cover,html.liw-admin-scroll-lab #avatar,html.liw-admin-scroll-lab .liw-admin-scroll-item,html.liw-admin-scroll-lab .liw-admin-scroll-identity,html.liw-admin-scroll-lab .public-section,html.liw-admin-scroll-lab .public-service-list>*{transform:none!important;transition:none!important;animation:none!important;will-change:auto}html.liw-admin-scroll-lab .liw-admin-scroll-item{opacity:1}html.liw-admin-scroll-lab .liw-admin-scroll-identity{left:50%;transform:translateX(-50%)!important}html.liw-admin-scroll-lab .public-service-list>*{position:relative;top:auto}}
  `;
  document.head.appendChild(style);

  const progress=document.createElement('div');
  progress.className='liw-admin-scroll-progress';
  progress.setAttribute('aria-hidden','true');
  document.body.appendChild(progress);

  function textOf(selector){return(document.querySelector(selector)?.textContent||'').trim();}
  function backgroundImageUrl(element){
    if(!element)return'';
    const inline=element.style?.backgroundImage||'';
    const computed=getComputedStyle(element).backgroundImage||'';
    const source=inline&&inline!=='none'?inline:computed;
    return source.match(/url\(["']?(.*?)["']?\)/i)?.[1]||'';
  }

  const identity=document.createElement('div');
  identity.className='liw-admin-scroll-identity';
  identity.setAttribute('aria-hidden','true');
  const miniAvatar=document.createElement('span');
  miniAvatar.className='liw-admin-scroll-mini-avatar';
  const sourceAvatar=document.getElementById('avatar');
  const avatarUrl=backgroundImageUrl(sourceAvatar);
  if(avatarUrl)miniAvatar.style.backgroundImage=`url("${avatarUrl.replace(/"/g,'\\"')}")`;
  else miniAvatar.textContent=(textOf('#avatar-initials')||textOf('#name').slice(0,2)||'LIW').slice(0,2).toUpperCase();
  const identityCopy=document.createElement('span');
  identityCopy.className='liw-admin-scroll-identity-copy';
  identityCopy.innerHTML=`<strong class="liw-admin-scroll-identity-name"></strong><span class="liw-admin-scroll-identity-label">LIW Lab</span>`;
  identityCopy.querySelector('.liw-admin-scroll-identity-name').textContent=textOf('#name')||'LIW Card';
  identity.append(miniAvatar,identityCopy);
  document.body.appendChild(identity);

  const targets=[
    document.querySelector('.public-content > h1'),document.getElementById('title'),document.getElementById('company'),
    document.getElementById('headline'),document.getElementById('bio'),document.getElementById('actions'),
    document.getElementById('save'),document.getElementById('business-actions'),
    ...document.querySelectorAll('.public-section:not([hidden])'),document.getElementById('branding')
  ].filter((element,index,array)=>element&&array.indexOf(element)===index&&element.offsetParent!==null);
  targets.forEach(element=>element.classList.add('liw-admin-scroll-item'));

  document.querySelectorAll('.public-service-list').forEach(list=>{
    [...list.children].forEach((item,index)=>item.style.setProperty('--liw-stack-index',String(Math.min(index,7))));
  });

  if(reduceMotion){
    targets.forEach(element=>element.classList.add('liw-admin-scroll-visible'));
  }else if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('liw-admin-scroll-visible');
        if(entry.target.classList.contains('public-section')){
          entry.target.classList.add('liw-admin-scroll-active');
          setTimeout(()=>entry.target.classList.remove('liw-admin-scroll-active'),600);
        }
        observer.unobserve(entry.target);
      });
    },{root:null,rootMargin:'0px 0px -8% 0px',threshold:.09});
    targets.forEach(element=>observer.observe(element));
  }else targets.forEach(element=>element.classList.add('liw-admin-scroll-visible'));

  const dock=document.createElement('nav');
  dock.className='liw-admin-lab-dock';
  dock.setAttribute('aria-label','LIW Lab card navigation');
  const dockItems=[
    {label:'Top',icon:'home',target:card},
    {label:'Contact',icon:'phone',target:document.getElementById('actions')||document.getElementById('business-actions')},
    {label:'Services',icon:'briefcase-business',target:document.querySelector('#services-section,.public-services-section,[data-section="services"]')||document.querySelector('.public-service-list')?.closest('.public-section')},
    {label:'Shop',icon:'shopping-bag',target:document.querySelector('#products-section,.public-products-section,[data-section="products"]')||document.querySelector('.public-product-grid')?.closest('.public-section')},
    {label:'Social',icon:'at-sign',target:document.querySelector('#social-section,.public-social-section,[data-section="social"]')||document.querySelector('.public-socials')?.closest('.public-section')}
  ].filter((item,index,array)=>item.target&&array.findIndex(other=>other.target===item.target)===index);

  dockItems.forEach((item,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.liwDockIndex=String(index);
    button.setAttribute('aria-label',`Go to ${item.label}`);
    button.innerHTML=`<i data-lucide="${item.icon}" aria-hidden="true"></i><b class="liw-admin-lab-dock-dot" aria-hidden="true"></b><span>${item.label}</span>`;
    button.addEventListener('click',()=>{
      item.target.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:item.label==='Top'?'start':'center'});
    });
    dock.appendChild(button);
  });
  if(dock.children.length>1){document.body.appendChild(dock);try{window.lucide?.createIcons?.({attrs:{'stroke-width':2}});}catch(_){} }

  function setDockActive(index){
    dock.querySelectorAll('button').forEach((button,i)=>button.classList.toggle('is-active',i===index));
    document.querySelectorAll('.public-section.liw-admin-scroll-current').forEach(section=>section.classList.remove('liw-admin-scroll-current'));
    const target=dockItems[index]?.target;
    if(target?.classList?.contains('public-section'))target.classList.add('liw-admin-scroll-current');
  }
  setDockActive(0);

  if('IntersectionObserver'in window&&dockItems.length>1){
    const navObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      const index=dockItems.findIndex(item=>item.target===visible.target);
      if(index>=0)setDockActive(index);
    },{root:null,rootMargin:'-28% 0px -50% 0px',threshold:[.05,.2,.45]});
    dockItems.forEach(item=>navObserver.observe(item.target));
  }

  let ticking=false;
  function updateScrollState(){
    ticking=false;
    const y=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const progressValue=Math.min(1,y/max);
    root.style.setProperty('--liw-admin-scroll-progress',progressValue.toFixed(4));
    root.style.setProperty('--liw-admin-glow-x',`${(50+(progressValue*26)).toFixed(1)}%`);
    if(!reduceMotion){
      root.style.setProperty('--liw-admin-cover-shift',`${Math.min(38,y*.078).toFixed(1)}px`);
      root.style.setProperty('--liw-admin-avatar-scale',Math.max(.85,1-y/1600).toFixed(3));
    }
    identity.classList.toggle('is-visible',y>Math.max(150,(document.getElementById('public-cover')?.offsetHeight||120)*.72));
    if(y<90)setDockActive(0);
  }

  function requestUpdate(){if(ticking)return;ticking=true;requestAnimationFrame(updateScrollState);}
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate,{passive:true});
  updateScrollState();

  root.dataset.liwAdminScrollLab='active';
})();