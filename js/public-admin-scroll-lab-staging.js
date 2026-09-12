/* LIW Cards — Admin Scroll Lab (staging only)
   Opt-in visual prototype. It does not change saved card data or customer themes.
   Activate on a staging card with ?liwAdminScroll=1 (or &liwAdminScroll=1).
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
    html.liw-admin-scroll-lab{--liw-admin-scroll-progress:0;--liw-admin-cover-shift:0px;--liw-admin-avatar-scale:1}
    html.liw-admin-scroll-lab body.public-body{scroll-behavior:smooth;overflow-x:hidden}
    html.liw-admin-scroll-lab .liw-admin-scroll-progress{position:fixed;z-index:9998;top:0;left:0;width:100%;height:3px;pointer-events:none;background:rgba(255,255,255,.10)}
    html.liw-admin-scroll-lab .liw-admin-scroll-progress::after{content:"";display:block;height:100%;width:calc(var(--liw-admin-scroll-progress) * 100%);background:linear-gradient(90deg,#6f7cff,#9b6cff,#e86ad8);box-shadow:0 0 16px rgba(155,108,255,.65);transition:width 80ms linear}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity{position:fixed;z-index:9997;top:12px;left:50%;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 32px);padding:7px 11px 7px 8px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(10,14,28,.72);box-shadow:0 14px 36px rgba(0,0,0,.26);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);opacity:0;transform:translate(-50%,-16px) scale(.96);pointer-events:none;transition:opacity .28s ease,transform .32s cubic-bezier(.2,.8,.2,1)}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}
    html.liw-admin-scroll-lab .liw-admin-scroll-mini-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background-position:center;background-size:cover;background-color:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;overflow:hidden}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-copy{min-width:0;line-height:1.05}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-name{display:block;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:12px;font-weight:800;letter-spacing:.01em}
    html.liw-admin-scroll-lab .liw-admin-scroll-identity-label{display:block;margin-top:3px;color:rgba(255,255,255,.62);font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    html.liw-admin-scroll-lab #public-cover{transform:translate3d(0,var(--liw-admin-cover-shift),0);transform-origin:center top;will-change:transform}
    html.liw-admin-scroll-lab #avatar{transform:scale(var(--liw-admin-avatar-scale));transform-origin:center center;will-change:transform}
    html.liw-admin-scroll-lab .liw-admin-scroll-item{opacity:0;transform:translate3d(0,26px,0) scale(.985);transition:opacity .52s ease,transform .64s cubic-bezier(.2,.72,.2,1);will-change:opacity,transform}
    html.liw-admin-scroll-lab .liw-admin-scroll-item.liw-admin-scroll-visible{opacity:1;transform:translate3d(0,0,0) scale(1)}
    html.liw-admin-scroll-lab .public-section.liw-admin-scroll-item{transition-duration:.58s,.7s}
    html.liw-admin-scroll-lab .public-section-heading h2{transform-origin:left center}
    html.liw-admin-scroll-lab .public-section.liw-admin-scroll-active .public-section-heading h2{animation:liwAdminHeadingSettle .42s cubic-bezier(.2,.8,.2,1) both}
    html.liw-admin-scroll-lab .public-service-list>* ,html.liw-admin-scroll-lab .public-product-grid>* ,html.liw-admin-scroll-lab .public-socials>*{transition:transform .32s ease,opacity .32s ease}
    html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-service-list>* ,html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-product-grid>* ,html.liw-admin-scroll-lab .public-section:not(.liw-admin-scroll-visible) .public-socials>*{transform:translateY(12px);opacity:.72}
    @keyframes liwAdminHeadingSettle{0%{letter-spacing:.045em;transform:translateX(-5px);opacity:.72}100%{letter-spacing:normal;transform:translateX(0);opacity:1}}
    @media (min-width:760px){html.liw-admin-scroll-lab .liw-admin-scroll-identity{top:18px}}
    @media (prefers-reduced-motion:reduce){html.liw-admin-scroll-lab body.public-body{scroll-behavior:auto}html.liw-admin-scroll-lab #public-cover,html.liw-admin-scroll-lab #avatar,html.liw-admin-scroll-lab .liw-admin-scroll-item,html.liw-admin-scroll-lab .liw-admin-scroll-identity{transform:none!important;transition:none!important;animation:none!important;will-change:auto}html.liw-admin-scroll-lab .liw-admin-scroll-item{opacity:1}html.liw-admin-scroll-lab .liw-admin-scroll-identity{left:50%;transform:translateX(-50%)!important}}
  `;
  document.head.appendChild(style);

  const progress=document.createElement('div');
  progress.className='liw-admin-scroll-progress';
  progress.setAttribute('aria-hidden','true');
  document.body.appendChild(progress);

  function textOf(selector){
    return (document.querySelector(selector)?.textContent||'').trim();
  }

  function backgroundImageUrl(element){
    if(!element)return '';
    const inline=element.style?.backgroundImage||'';
    const computed=getComputedStyle(element).backgroundImage||'';
    const source=inline&&inline!=='none'?inline:computed;
    const match=source.match(/url\(["']?(.*?)["']?\)/i);
    return match?.[1]||'';
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
  const identityName=document.createElement('strong');
  identityName.className='liw-admin-scroll-identity-name';
  identityName.textContent=textOf('#name')||'LIW Card';
  const identityLabel=document.createElement('span');
  identityLabel.className='liw-admin-scroll-identity-label';
  identityLabel.textContent='Admin Lab';
  identityCopy.append(identityName,identityLabel);
  identity.append(miniAvatar,identityCopy);
  document.body.appendChild(identity);

  const targets=[
    document.querySelector('.public-content > h1'),
    document.getElementById('title'),
    document.getElementById('company'),
    document.getElementById('headline'),
    document.getElementById('bio'),
    document.getElementById('actions'),
    document.getElementById('save'),
    document.getElementById('business-actions'),
    ...document.querySelectorAll('.public-section:not([hidden])'),
    document.getElementById('branding')
  ].filter((element,index,array)=>element&&array.indexOf(element)===index&&element.offsetParent!==null);

  targets.forEach(element=>element.classList.add('liw-admin-scroll-item'));

  if(reduceMotion){
    targets.forEach(element=>element.classList.add('liw-admin-scroll-visible'));
  }else if('IntersectionObserver' in window){
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
  }else{
    targets.forEach(element=>element.classList.add('liw-admin-scroll-visible'));
  }

  let ticking=false;
  function updateScrollState(){
    ticking=false;
    const y=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const progressValue=Math.min(1,y/max);
    root.style.setProperty('--liw-admin-scroll-progress',progressValue.toFixed(4));

    if(!reduceMotion){
      const coverShift=Math.min(34,y*.075);
      const avatarScale=Math.max(.86,1-y/1800);
      root.style.setProperty('--liw-admin-cover-shift',`${coverShift.toFixed(1)}px`);
      root.style.setProperty('--liw-admin-avatar-scale',avatarScale.toFixed(3));
    }

    identity.classList.toggle('is-visible',y>Math.max(150,(document.getElementById('public-cover')?.offsetHeight||120)*.72));
  }

  function requestUpdate(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(updateScrollState);
  }

  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate,{passive:true});
  updateScrollState();

  root.dataset.liwAdminScrollLab='active';
})();
