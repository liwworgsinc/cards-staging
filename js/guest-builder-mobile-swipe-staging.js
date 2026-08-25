(() => {
  const shell = document.querySelector('.guest-shell');
  const nav = document.querySelector('.guest-nav');
  const login = document.getElementById('guest-login-link');
  if (!shell || !nav) return;

  const MOBILE_QUERY = '(max-width: 900px)';
  const mq = window.matchMedia(MOBILE_QUERY);
  const desktopLoginText = login?.textContent || 'Already have an account? Log in';

  const style = document.createElement('style');
  style.id = 'guest-mobile-swipe-styles';
  style.textContent = `
    .guest-mobile-switcher{display:none}
    @media(max-width:900px){
      .guest-page{overflow-x:hidden}
      .guest-nav{height:58px!important;padding:0 13px!important;gap:10px}
      .guest-nav img{height:33px!important;max-width:145px;object-fit:contain}
      .guest-nav-right{gap:8px;min-width:0}
      .guest-nav .guest-pill{display:none!important}
      .guest-nav .guest-login{font-size:.78rem!important;line-height:1;white-space:nowrap;padding:9px 10px;border:1px solid #e2e6ec;border-radius:11px;background:#fff;color:#24324b}
      .guest-mobile-switcher{display:block;position:sticky;top:58px;z-index:24;background:rgba(247,248,251,.96);backdrop-filter:blur(10px);border-bottom:1px solid #e7e9ee;padding:8px 12px 9px}
      .guest-mobile-switcher-inner{max-width:540px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;background:#e9edf3;border-radius:14px}
      .guest-mobile-switcher button{min-height:42px;border:0;border-radius:11px;background:transparent;color:#667085;font:inherit;font-size:.82rem;font-weight:900;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;cursor:pointer}
      .guest-mobile-switcher button[aria-selected="true"]{background:#fff;color:#0b1438;box-shadow:0 1px 3px rgba(15,23,42,.09)}
      .guest-mobile-swipe-hint{text-align:center;color:#8a94a5;font-size:.67rem;font-weight:750;margin-top:5px;letter-spacing:.01em}
      .guest-shell{display:block!important;padding:12px 12px 38px!important;max-width:680px!important;min-width:0}
      .guest-shell>.guest-editor,.guest-shell>.guest-preview-panel{width:100%;min-width:0;order:initial!important;position:relative!important;top:auto!important;margin:0!important;animation:guestMobilePanelIn .2s ease-out}
      .guest-shell[data-mobile-view="edit"]>.guest-preview-panel{display:none!important}
      .guest-shell[data-mobile-view="preview"]>.guest-editor{display:none!important}
      .guest-shell[data-mobile-view="preview"]>.guest-preview-panel{display:block!important}
      .guest-preview-panel{padding:14px 12px 16px!important}
      .guest-preview-panel .preview-label{margin-bottom:11px}
      .guest-phone{max-width:326px!important}
      @keyframes guestMobilePanelIn{from{opacity:.45;transform:translateX(8px)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){.guest-shell>.guest-editor,.guest-shell>.guest-preview-panel{animation:none}}
    }
    @media(max-width:380px){
      .guest-nav img{height:30px!important;max-width:128px}
      .guest-nav .guest-login{padding:8px 9px;font-size:.74rem!important}
      .guest-mobile-switcher{padding-left:9px;padding-right:9px}
    }
  `;
  document.head.appendChild(style);

  const switcher = document.createElement('div');
  switcher.className = 'guest-mobile-switcher';
  switcher.setAttribute('aria-label', 'Guest builder mobile view');
  switcher.innerHTML = `
    <div class="guest-mobile-switcher-inner" role="tablist" aria-label="Edit or preview card">
      <button type="button" role="tab" aria-selected="true" data-guest-mobile-view="edit"><i data-lucide="pencil" size="16"></i><span>Edit card</span></button>
      <button type="button" role="tab" aria-selected="false" data-guest-mobile-view="preview"><i data-lucide="smartphone" size="16"></i><span>Preview</span></button>
    </div>
    <div class="guest-mobile-swipe-hint" aria-hidden="true">Swipe left for preview · swipe right to edit</div>
    <span class="sr-only" id="guest-mobile-view-status" aria-live="polite"></span>
  `;
  nav.insertAdjacentElement('afterend', switcher);

  const buttons = [...switcher.querySelectorAll('[data-guest-mobile-view]')];
  const status = document.getElementById('guest-mobile-view-status');
  let view = 'edit';
  let touchStart = null;

  function setView(next, { scroll = false } = {}) {
    if (!['edit', 'preview'].includes(next)) return;
    view = next;
    shell.dataset.mobileView = next;
    buttons.forEach(button => {
      const active = button.dataset.guestMobileView === next;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    if (status) status.textContent = next === 'preview' ? 'Card preview selected.' : 'Card editor selected.';
    if (scroll && mq.matches) {
      const top = switcher.getBoundingClientRect().top + window.scrollY - 58;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function syncResponsiveState() {
    if (mq.matches) {
      shell.dataset.mobileView = view;
      if (login) login.textContent = 'Log in';
    } else {
      delete shell.dataset.mobileView;
      if (login) login.textContent = desktopLoginText;
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.guestMobileView, { scroll: true });
  }));

  shell.addEventListener('pointerdown', event => {
    if (!mq.matches || event.pointerType === 'mouse') return;
    if (event.target.closest('input,textarea,select,button,a,label')) return;
    touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, { passive: true });

  shell.addEventListener('pointerup', event => {
    if (!mq.matches || !touchStart || event.pointerId !== touchStart.id) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    if (dx < 0 && view === 'edit') setView('preview', { scroll: true });
    else if (dx > 0 && view === 'preview') setView('edit', { scroll: true });
  }, { passive: true });

  shell.addEventListener('pointercancel', () => { touchStart = null; }, { passive: true });

  mq.addEventListener?.('change', syncResponsiveState);
  setView('edit');
  syncResponsiveState();
})();
