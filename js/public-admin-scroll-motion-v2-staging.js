/* LIW Cards — LIW Lab Motion V2 (staging only)
   Cinematic motion layer for the admin-only LIW Lab. This file never persists
   card data and only runs when liwAdminScroll=1 is present.
*/
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('liwAdminScroll') !== '1') return;
  if (window.__LIW_ADMIN_SCROLL_MOTION_V2__) return;
  window.__LIW_ADMIN_SCROLL_MOTION_V2__ = true;

  const root = document.documentElement;
  const card = document.getElementById('card');
  if (!card) return;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  root.classList.add('liw-admin-lab-motion-v2');

  const style = document.createElement('style');
  style.id = 'liw-admin-lab-motion-v2-style';
  style.textContent = `
    html.liw-admin-lab-motion-v2{--liw-v2-hero:0;--liw-v2-speed:0;--liw-v2-active:0;--liw-v2-pointer-x:50%;--liw-v2-pointer-y:20%}
    html.liw-admin-lab-motion-v2 body.public-body{perspective:1200px;perspective-origin:50% 18%;background-attachment:fixed}
    html.liw-admin-lab-motion-v2 body.public-body::after{content:"";position:fixed;z-index:-1;inset:-20%;pointer-events:none;background:radial-gradient(circle at var(--liw-v2-pointer-x) var(--liw-v2-pointer-y),rgba(111,124,255,.13),transparent 24%);opacity:calc(.38 + (var(--liw-v2-speed) * .22));transition:opacity .2s ease}

    html.liw-admin-lab-motion-v2 #public-cover{transform:translate3d(0,calc(var(--liw-admin-cover-shift,0px) - (var(--liw-v2-hero) * 11px)),0) scale(calc(1.025 + (var(--liw-v2-hero) * .055)))!important;filter:saturate(calc(1.04 + (var(--liw-v2-hero) * .10))) contrast(calc(1 + (var(--liw-v2-hero) * .035)));clip-path:inset(0 round calc(0px + (var(--liw-v2-hero) * 24px)))}
    html.liw-admin-lab-motion-v2 #avatar{transform:translate3d(0,calc(var(--liw-v2-hero) * -10px),0) scale(calc(var(--liw-admin-avatar-scale,1) - (var(--liw-v2-hero) * .05)))!important;transition:box-shadow .25s ease;box-shadow:0 calc(14px + (var(--liw-v2-hero) * 10px)) calc(38px + (var(--liw-v2-hero) * 18px)) rgba(9,12,28,calc(.16 + (var(--liw-v2-hero) * .08)))}
    html.liw-admin-lab-motion-v2 .public-content>h1,html.liw-admin-lab-motion-v2 #title,html.liw-admin-lab-motion-v2 #company,html.liw-admin-lab-motion-v2 #headline{transform-origin:center top;will-change:transform,opacity}
    html.liw-admin-lab-motion-v2 .public-content>h1{transform:translate3d(0,calc(var(--liw-v2-hero) * -12px),0) scale(calc(1 - (var(--liw-v2-hero) * .025)));opacity:calc(1 - (var(--liw-v2-hero) * .18))}
    html.liw-admin-lab-motion-v2 #title,html.liw-admin-lab-motion-v2 #company,html.liw-admin-lab-motion-v2 #headline{transform:translate3d(0,calc(var(--liw-v2-hero) * -7px),0);opacity:calc(1 - (var(--liw-v2-hero) * .25))}

    html.liw-admin-lab-motion-v2 .liw-admin-scroll-identity{transition:opacity .22s ease,transform .5s cubic-bezier(.16,1,.3,1),padding .3s ease,box-shadow .3s ease!important;transform-origin:50% 0}
    html.liw-admin-lab-motion-v2 .liw-admin-scroll-identity.is-visible{box-shadow:0 18px 46px rgba(0,0,0,.34),0 0 0 1px rgba(255,255,255,.03)}
    html.liw-admin-lab-motion-v2 .liw-admin-scroll-identity-name{transition:letter-spacing .35s ease}
    html.liw-admin-lab-motion-v2 .liw-admin-scroll-identity.is-visible .liw-admin-scroll-identity-name{letter-spacing:.025em}

    html.liw-admin-lab-motion-v2 .public-section{--liw-section-distance:1;--liw-section-progress:0;transform-origin:center 20%;transform:translate3d(0,calc(var(--liw-section-distance) * 12px),calc(var(--liw-section-distance) * -26px)) rotateX(calc(var(--liw-section-distance) * 1.8deg)) scale(calc(1 - (var(--liw-section-distance) * .018)))!important;opacity:calc(1 - (var(--liw-section-distance) * .19));filter:saturate(calc(1 - (var(--liw-section-distance) * .06)));transition:box-shadow .3s ease,filter .3s ease;will-change:transform,opacity}
    html.liw-admin-lab-motion-v2 .public-section.liw-admin-scroll-current{box-shadow:0 28px 70px rgba(56,35,105,.16)!important;filter:saturate(1.06)}
    html.liw-admin-lab-motion-v2 .public-section-heading{transform:translate3d(calc(var(--liw-section-distance) * -5px),0,0);transition:transform .25s ease}
    html.liw-admin-lab-motion-v2 .public-section-heading h2{clip-path:inset(0 calc(var(--liw-section-distance) * 7%) 0 0);transition:clip-path .28s ease}

    html.liw-admin-lab-motion-v2 .public-service-list{perspective:900px}
    html.liw-admin-lab-motion-v2 .public-service-list>*{--liw-service-depth:0;transform:translate3d(0,calc(var(--liw-service-depth) * -6px),calc(var(--liw-service-depth) * -12px)) rotateX(calc(var(--liw-service-depth) * -.8deg)) scale(calc(1 - (var(--liw-service-depth) * .012)))!important;transition:box-shadow .2s ease;will-change:transform}
    html.liw-admin-lab-motion-v2 .public-service-list>*:hover{box-shadow:0 24px 48px rgba(14,20,42,.14)!important}

    html.liw-admin-lab-motion-v2 .public-product-grid{perspective:1000px;perspective-origin:50% 45%}
    html.liw-admin-lab-motion-v2 .public-product-grid>*{--liw-product-offset:0;transform:translate3d(0,calc(abs(var(--liw-product-offset)) * 7px),calc(abs(var(--liw-product-offset)) * -42px)) rotateY(calc(var(--liw-product-offset) * -9deg)) scale(calc(1 - (abs(var(--liw-product-offset)) * .045)))!important;opacity:calc(1 - (abs(var(--liw-product-offset)) * .22));will-change:transform,opacity;transition:box-shadow .22s ease}
    @supports not (width:calc(abs(1px))){html.liw-admin-lab-motion-v2 .public-product-grid>*{transform:rotateY(calc(var(--liw-product-offset) * -8deg)) scale(.985)!important}}

    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock{overflow:visible!important;transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .3s ease!important;box-shadow:0 22px 58px rgba(0,0,0,.34),0 0 0 1px rgba(255,255,255,.03)!important}
    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock::before{content:"";position:absolute;inset:-10px;border-radius:999px;pointer-events:none;background:radial-gradient(circle at calc((var(--liw-v2-active) + .5) * 20%) 50%,rgba(130,111,255,.16),transparent 24%);filter:blur(4px)}
    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button{position:relative;transition:background .28s ease,color .28s ease,min-width .45s cubic-bezier(.16,1,.3,1),gap .38s ease,transform .34s cubic-bezier(.16,1,.3,1)!important}
    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button.is-active{transform:translateY(-4px) scale(1.04)!important}
    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button.is-active::after{content:"";position:absolute;left:50%;bottom:-5px;width:16px;height:3px;border-radius:99px;background:#fff;transform:translateX(-50%);box-shadow:0 0 12px rgba(255,255,255,.6);animation:liwV2DockSpring .45s cubic-bezier(.16,1,.3,1)}
    html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button:not(.is-active){transform:scale(.94)}

    html.liw-admin-lab-motion-v2 .liw-v2-scene-flash{position:fixed;z-index:9995;left:50%;bottom:36px;width:26px;height:26px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0%,rgba(130,111,255,.8) 18%,rgba(130,111,255,0) 70%);transform:translate(-50%,50%) scale(.2);opacity:0}
    html.liw-admin-lab-motion-v2 .liw-v2-scene-flash.fire{animation:liwV2SceneFlash .55s cubic-bezier(.16,1,.3,1)}

    @keyframes liwV2DockSpring{0%{width:4px;opacity:.2}60%{width:22px;opacity:1}100%{width:16px;opacity:1}}
    @keyframes liwV2SceneFlash{0%{opacity:0;transform:translate(-50%,50%) scale(.2)}25%{opacity:.7}100%{opacity:0;transform:translate(-50%,50%) scale(7)}}

    @media (max-width:640px){
      html.liw-admin-lab-motion-v2 .public-section{transform:translate3d(0,calc(var(--liw-section-distance) * 9px),calc(var(--liw-section-distance) * -18px)) rotateX(calc(var(--liw-section-distance) * 1deg)) scale(calc(1 - (var(--liw-section-distance) * .012)))!important}
      html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button.is-active{transform:translateY(-3px) scale(1.025)!important}
    }

    @media (prefers-reduced-motion:reduce){
      html.liw-admin-lab-motion-v2 body.public-body::after{display:none!important}
      html.liw-admin-lab-motion-v2 #public-cover,html.liw-admin-lab-motion-v2 #avatar,html.liw-admin-lab-motion-v2 .public-content>h1,html.liw-admin-lab-motion-v2 #title,html.liw-admin-lab-motion-v2 #company,html.liw-admin-lab-motion-v2 #headline,html.liw-admin-lab-motion-v2 .public-section,html.liw-admin-lab-motion-v2 .public-section-heading,html.liw-admin-lab-motion-v2 .public-section-heading h2,html.liw-admin-lab-motion-v2 .public-service-list>*,html.liw-admin-lab-motion-v2 .public-product-grid>*,html.liw-admin-lab-motion-v2 .liw-admin-lab-dock,html.liw-admin-lab-motion-v2 .liw-admin-lab-dock button{transform:none!important;filter:none!important;clip-path:none!important;opacity:1!important;transition:none!important;animation:none!important}
      html.liw-admin-lab-motion-v2 .liw-v2-scene-flash{display:none!important}
    }
  `;
  document.head.appendChild(style);

  const flash = document.createElement('div');
  flash.className = 'liw-v2-scene-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const sections = [...document.querySelectorAll('.public-section:not([hidden])')].filter(section => section.offsetParent !== null);
  const serviceItems = [...document.querySelectorAll('.public-service-list > *')];
  const productRows = [...document.querySelectorAll('.public-product-grid')];
  const dock = document.querySelector('.liw-admin-lab-dock');
  const dockButtons = dock ? [...dock.querySelectorAll('button')] : [];

  let lastY = window.scrollY || 0;
  let lastTime = performance.now();
  let frame = 0;
  let previousActiveDock = -1;

  function updateProducts(row) {
    const rect = row.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const width = Math.max(1, rect.width * .72);
    [...row.children].forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const offset = clamp((itemCenter - center) / width, -1, 1);
      item.style.setProperty('--liw-product-offset', offset.toFixed(3));
    });
  }

  function fireDockTransition(activeIndex) {
    if (reduceMotion || activeIndex < 0 || activeIndex === previousActiveDock) return;
    previousActiveDock = activeIndex;
    root.style.setProperty('--liw-v2-active', String(activeIndex));
    flash.classList.remove('fire');
    void flash.offsetWidth;
    flash.classList.add('fire');
  }

  function updateMotion(now = performance.now()) {
    frame = 0;
    const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const dt = Math.max(16, now - lastTime);
    const velocity = clamp(Math.abs(y - lastY) / dt * .9, 0, 1);
    const hero = clamp(y / 330, 0, 1);
    root.style.setProperty('--liw-v2-hero', hero.toFixed(4));
    root.style.setProperty('--liw-v2-speed', velocity.toFixed(3));

    const viewportCenter = window.innerHeight * .48;
    let closest = { index: -1, distance: Infinity };
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const normalized = clamp(Math.abs(center - viewportCenter) / Math.max(window.innerHeight * .72, rect.height), 0, 1);
      section.style.setProperty('--liw-section-distance', normalized.toFixed(3));
      section.style.setProperty('--liw-section-progress', clamp(1 - normalized, 0, 1).toFixed(3));
      if (normalized < closest.distance) closest = { index, distance: normalized };
    });

    serviceItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const stuckDistance = clamp((100 - rect.top) / 90, 0, 1);
      const depth = clamp(stuckDistance + Math.min(index * .055, .3), 0, 1);
      item.style.setProperty('--liw-service-depth', depth.toFixed(3));
    });

    productRows.forEach(updateProducts);

    if (dockButtons.length) {
      const active = dockButtons.findIndex(button => button.classList.contains('is-active'));
      fireDockTransition(active);
    }

    lastY = y;
    lastTime = now;
  }

  function requestMotion() {
    if (frame || reduceMotion) return;
    frame = requestAnimationFrame(updateMotion);
  }

  productRows.forEach(row => row.addEventListener('scroll', requestMotion, { passive: true }));
  window.addEventListener('scroll', requestMotion, { passive: true });
  window.addEventListener('resize', requestMotion, { passive: true });

  if (window.matchMedia?.('(pointer:fine)').matches) {
    window.addEventListener('pointermove', event => {
      root.style.setProperty('--liw-v2-pointer-x', `${(event.clientX / Math.max(1, innerWidth) * 100).toFixed(1)}%`);
      root.style.setProperty('--liw-v2-pointer-y', `${(event.clientY / Math.max(1, innerHeight) * 100).toFixed(1)}%`);
    }, { passive: true });
  }

  if (dock) {
    const dockObserver = new MutationObserver(() => requestMotion());
    dockObserver.observe(dock, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  if (!reduceMotion) requestAnimationFrame(updateMotion);
  else {
    sections.forEach(section => section.style.setProperty('--liw-section-distance', '0'));
    productRows.forEach(row => [...row.children].forEach(item => item.style.setProperty('--liw-product-offset', '0')));
  }

  root.dataset.liwAdminMotion = 'v2';
})();
