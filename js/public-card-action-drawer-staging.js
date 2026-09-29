/* LIW Cards staging — compact, accessible card actions.
   Native Share/Install, QR, Wallet, contact save and reading settings keep their handlers. */
(function () {
  'use strict';
  if (window.LIWCardActionDrawer) return;

  const HOSTS = '.realtor-public-top-actions,.restaurant-public-top-actions,.music-classic-top-actions,.public-top-actions';
  const BUTTON = 'liw-action-launcher';
  const ACTIONS = [
    {key:'share', title:'Share & install', detail:'Share, copy link or install this card', icon:'share-2'},
    {key:'qr', title:'Show QR code', detail:'Scan to open this card on another phone', icon:'qr-code'},
    {key:'wallet', title:'Save to LIW Wallet', detail:'Keep this card in your LIW collection', icon:'wallet'},
    {key:'contact', title:'Save to contacts', detail:'Download the contact to your phone', icon:'user-round-plus'},
    {key:'reading', title:'Text size', detail:'Choose 16, 18 or 20 pixel reading text', icon:'type'}
  ];
  let opener = null;
  let restoreFocus = true;
  let queued = false;
  let observer = null;

  function root() { return document.getElementById('card'); }
  function rendered(el) {
    if (!el || !el.isConnected || el.hidden) return false;
    for (let p=el; p && p.nodeType===1; p=p.parentElement) {
      if (p.hidden) return false;
      const style = getComputedStyle(p);
      if (style.display==='none' || style.visibility==='hidden') return false;
    }
    const box=el.getBoundingClientRect();
    return box.width>0 && box.height>0;
  }
  function hosts() {
    const card=root();
    return card ? Array.from(card.querySelectorAll(HOSTS)) : [];
  }
  function currentHost() {
    const card=root();
    if (!card || card.hidden) return null;
    const ordered=hosts().filter(rendered);
    const priorities=card.classList.contains('realtor-public-active')
      ? ['.realtor-public-top-actions']
      : card.classList.contains('restaurant-public-active')
        ? ['.restaurant-public-top-actions']
        : card.classList.contains('music-card-active')
          ? ['.music-classic-top-actions','.public-top-actions']
          : ['.public-top-actions','.music-classic-top-actions'];
    return priorities.map(selector=>ordered.find(el=>el.matches(selector))).find(Boolean) || ordered[0] || null;
  }
  function icon(name, size=20) {
    return '<i data-lucide="'+name+'" size="'+size+'" aria-hidden="true"></i>';
  }
  function refreshIcons() {
    if (!window.lucide) return;
    try { window.lucide.createIcons({ attrs: {'aria-hidden':'true'} }); } catch (_) {}
  }
  function getNative(key) {
    const card=root();
    const host=currentHost();
    if (!card) return null;
    const selectors={
      share:'#share-top,[data-realtor-share],[data-rest-share],[data-liw-share-card]',
      qr:'#qr-top,[data-realtor-qr],[data-rest-qr]',
      wallet:'[data-liw-global-wallet],[data-realtor-wallet],[data-rest-wallet],#barber-wallet-top,#music-save-home-top[data-liw-wallet-top],.liw-rolodex-public-button',
      contact:'[data-realtor-save],#save',
      reading:'[data-liw-reading-trigger]'
    };
    const candidates=Array.from(card.querySelectorAll(selectors[key]||'')).filter(el=>!el.classList.contains(BUTTON));
    return candidates.find(el=>host && host.contains(el)) ||
      candidates.find(el=>rendered(el)) ||
      candidates[0] || null;
  }
  function dialog() {
    let el=document.getElementById('liw-action-drawer');
    if (el) return el;
    el=document.createElement('dialog');
    el.id='liw-action-drawer';
    el.setAttribute('aria-labelledby','liw-action-drawer-title');
    el.innerHTML='<div class="liw-action-drawer-inner">'+
      '<div class="liw-action-drawer-head"><div><span class="liw-action-drawer-eyebrow">LIW CARDS</span>'+
      '<h2 id="liw-action-drawer-title">Card actions</h2><p>Everything you need, in one place.</p></div>'+
      '<button type="button" class="liw-action-drawer-close" aria-label="Close card actions">'+icon('x',20)+'</button></div>'+
      '<div class="liw-action-drawer-items"></div>'+
      '<p class="liw-action-drawer-note">Card actions are available without leaving this page.</p></div>';
    document.body.appendChild(el);
    el.querySelector('.liw-action-drawer-close').addEventListener('click',()=>el.close());
    el.addEventListener('click',event=>{
      if (event.target!==el) return;
      const r=el.getBoundingClientRect();
      if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) el.close();
    });
    el.addEventListener('close',()=>{
      if (restoreFocus && opener?.isConnected) opener.focus({preventScroll:true});
      opener=null;
      restoreFocus=true;
    });
    el.querySelector('.liw-action-drawer-items').addEventListener('click',event=>{
      const target=event.target.closest('[data-liw-drawer-action]');
      if (!target) return;
      const key=target.dataset.liwDrawerAction;
      // Close synchronously before opening another modal. Do not defer: native
      // share/install relies on the visitor's current user gesture.
      restoreFocus=false;
      if (el.open) el.close();
      launch(key);
    });
    return el;
  }
  function available(key) {
    return key==='share' ? Boolean(window.LIWCardShare?.open || getNative('share')) : Boolean(getNative(key));
  }
  function render() {
    const el=dialog();
    const items=el.querySelector('.liw-action-drawer-items');
    items.innerHTML=ACTIONS.filter(action=>available(action.key)).map(action=>
      '<button type="button" class="liw-action-item" data-liw-drawer-action="'+action.key+'">'+
      '<span class="liw-action-item-icon">'+icon(action.icon)+'</span>'+
      '<span class="liw-action-item-copy"><strong>'+action.title+'</strong><small>'+action.detail+'</small></span>'+
      '<span class="liw-action-chevron">'+icon('chevron-right',17)+'</span></button>'
    ).join('');
    refreshIcons();
  }
  function launch(key) {
    if (key==='share' && typeof window.LIWCardShare?.open==='function') {
      window.LIWCardShare.open();
      return;
    }
    const native=getNative(key);
    if (native) native.click();
    else window.toast?.('This action is not available on this card.');
  }
  function open(button) {
    const el=dialog();
    opener=button;
    render();
    restoreFocus=true;
    if (!el.open) {
      if (typeof el.showModal==='function') el.showModal();
      else el.setAttribute('open','');
    }
    el.querySelector('.liw-action-drawer-close').focus({preventScroll:true});
  }
  function conceal(host) {
    Array.from(host.children).forEach(child=>{
      if (child.classList.contains(BUTTON) || child.dataset.liwActionConcealed==='true') return;
      child.dataset.liwActionConcealed='true';
      child.dataset.liwActionOldTabindex=child.hasAttribute('tabindex')?child.getAttribute('tabindex'):'__unset__';
      child.dataset.liwActionOldAriaHidden=child.hasAttribute('aria-hidden')?child.getAttribute('aria-hidden'):'__unset__';
      child.setAttribute('aria-hidden','true');
      child.setAttribute('tabindex','-1');
    });
  }
  function reveal(host) {
    Array.from(host.children).forEach(child=>{
      if (child.dataset.liwActionConcealed!=='true') return;
      const tab=child.dataset.liwActionOldTabindex;
      const aria=child.dataset.liwActionOldAriaHidden;
      if (tab==='__unset__') child.removeAttribute('tabindex'); else child.setAttribute('tabindex',tab);
      if (aria==='__unset__') child.removeAttribute('aria-hidden'); else child.setAttribute('aria-hidden',aria);
      delete child.dataset.liwActionConcealed;
      delete child.dataset.liwActionOldTabindex;
      delete child.dataset.liwActionOldAriaHidden;
    });
  }
  function sync() {
    queued=false;
    const card=root();
    if (!card || card.hidden) return;
    const primary=currentHost();
    if (!primary) return;
    hosts().forEach(host=>{
      const active=rendered(host);
      host.classList.toggle('liw-action-host',active);
      if (active) conceal(host); else reveal(host);
      if (host!==primary) host.querySelectorAll('.'+BUTTON).forEach(button=>button.remove());
    });
    let launcher=primary.querySelector('.'+BUTTON);
    if (!launcher) {
      launcher=document.createElement('button');
      launcher.type='button';
      launcher.className=BUTTON;
      launcher.setAttribute('aria-label','Open card actions');
      launcher.setAttribute('aria-haspopup','dialog');
      launcher.setAttribute('aria-controls','liw-action-drawer');
      launcher.title='Card actions';
      launcher.innerHTML=icon('ellipsis',22);
      launcher.addEventListener('click',()=>open(launcher));
      primary.appendChild(launcher);
      refreshIcons();
    }
    if (!card.classList.contains('liw-action-drawer-ready')) card.classList.add('liw-action-drawer-ready');
  }
  function schedule() {
    if (queued) return;
    queued=true;
    queueMicrotask(sync);
  }
  function boot() {
    schedule();
    const card=root();
    if (card && !observer) {
      observer=new MutationObserver(records=>{
        if (records.some(record=>record.type==='childList' || (record.type==='attributes' && record.target===card))) schedule();
      });
      observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    }
  }
  window.LIWCardActionDrawer=Object.freeze({open:()=>open(currentHost()?.querySelector('.'+BUTTON)||null),sync:schedule});
  document.addEventListener('liw:public-card-ready',schedule);
  document.addEventListener('liw:public-card-rendered',schedule);
  document.addEventListener('liw:card-share-ready',schedule);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();