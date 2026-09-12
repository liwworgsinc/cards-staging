/* LIW Cards — LIW Lab editor bridge (staging only)
   Admin-only experimental design layer. LIW Lab never replaces a saved customer
   template; it decorates the editor preview and opens the public preview with
   liwAdminScroll=1 so experimental ideas stay isolated from customer themes.
*/
(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/i.test(location.pathname)) return;
  if (window.__LIW_ADMIN_LAB_EDITOR__) return;
  window.__LIW_ADMIN_LAB_EDITOR__ = true;

  const LAB_ID = '__liw_admin_lab__';
  const LAB_LABEL = 'LIW Lab';
  let active = false;
  let gridObserver = null;
  let bootTimer = null;
  let bootTries = 0;

  const editorGlobal = name => {
    try {
      if (name === 'initialized') return typeof editorInitializationComplete !== 'undefined' && editorInitializationComplete === true;
      if (name === 'admin') return typeof isAdmin !== 'undefined' && isAdmin === true;
      if (name === 'card') return typeof currentId !== 'undefined' ? currentId : null;
      if (name === 'user') return typeof user !== 'undefined' ? user : null;
    } catch (_) {}
    return null;
  };

  const storageKey = () => {
    const account = editorGlobal('user')?.id || 'admin';
    const card = editorGlobal('card') || new URLSearchParams(location.search).get('id') || 'new';
    return `liw-admin-lab:${account}:${card}`;
  };

  const readStored = () => {
    try { return localStorage.getItem(storageKey()) === '1'; } catch (_) { return false; }
  };

  const writeStored = value => {
    try {
      if (value) localStorage.setItem(storageKey(), '1');
      else localStorage.removeItem(storageKey());
    } catch (_) {}
  };

  function ensureStyles() {
    if (document.getElementById('liw-admin-lab-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-admin-lab-editor-style';
    style.textContent = `
      .liw-admin-lab-theme-group{position:relative;border:1px solid rgba(121,82,255,.22);border-radius:18px;padding:14px;background:linear-gradient(145deg,rgba(13,17,37,.98),rgba(33,20,61,.96));box-shadow:0 18px 44px rgba(15,12,35,.14);overflow:hidden}
      .liw-admin-lab-theme-group::before{content:"";position:absolute;inset:-80px auto auto -60px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(103,126,255,.28),transparent 68%);pointer-events:none}
      .liw-admin-lab-theme-group .template-tier-heading{position:relative;margin:0 0 12px;color:#fff}
      .liw-admin-lab-theme-group .template-tier-heading h4{margin:0;color:#fff;font-size:.9rem;letter-spacing:.07em;text-transform:uppercase}
      .liw-admin-lab-theme-group .template-tier-heading p{margin:4px 0 0;color:rgba(255,255,255,.62);font-size:.72rem}
      .template-card.liw-admin-lab-card{position:relative;border-color:rgba(150,117,255,.45)!important;background:linear-gradient(160deg,#10162d,#23143b)!important;color:#fff;overflow:hidden}
      .template-card.liw-admin-lab-card::after{content:"ADMIN ONLY";position:absolute;top:10px;right:10px;padding:4px 7px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(8,10,22,.56);color:#dcd7ff;font-size:.5rem;font-weight:900;letter-spacing:.08em;backdrop-filter:blur(8px)}
      .template-card.liw-admin-lab-card.active{border-color:#9e7bff!important;box-shadow:0 0 0 2px rgba(158,123,255,.16),0 14px 32px rgba(24,15,53,.22)!important}
      .liw-admin-lab-mini{position:relative;min-height:112px!important;background:radial-gradient(circle at 50% 8%,rgba(142,105,255,.45),transparent 34%),linear-gradient(165deg,#090d1d,#171026 62%,#291541)!important;overflow:hidden}
      .liw-admin-lab-mini::before{content:"";position:absolute;left:10%;right:10%;top:12px;height:28px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.09);box-shadow:0 28px 0 -5px rgba(255,255,255,.06),0 50px 0 -8px rgba(255,255,255,.05)}
      .liw-admin-lab-mini::after{content:"LAB";position:absolute;left:50%;bottom:9px;transform:translateX(-50%);color:#d8ccff;font-size:.58rem;font-weight:950;letter-spacing:.22em}
      .template-card.liw-admin-lab-card .template-card-label strong{color:#fff}
      .template-card.liw-admin-lab-card .template-card-label small{color:rgba(255,255,255,.6)}
      .template-card.liw-admin-lab-card .template-card-label em{background:rgba(150,117,255,.2);color:#e6ddff;border-color:rgba(150,117,255,.28)}
      html.liw-admin-lab-editor-active #phone-preview{border-color:rgba(146,112,255,.48);box-shadow:0 24px 70px rgba(30,18,65,.22),0 0 0 1px rgba(146,112,255,.1)}
      html.liw-admin-lab-editor-active #phone-preview .preview-card-scroll{background:radial-gradient(circle at 50% 0,rgba(124,93,255,.12),transparent 32%)}
      html.liw-admin-lab-editor-active #phone-preview .preview-cover{transform:scale(1.018);transform-origin:center top;box-shadow:0 18px 38px rgba(7,10,25,.16)}
      html.liw-admin-lab-editor-active #phone-preview .preview-public-section{border-radius:18px;background:rgba(255,255,255,.72);box-shadow:0 10px 24px rgba(12,20,48,.07);backdrop-filter:blur(10px)}
      .liw-admin-lab-preview-dock{position:absolute;z-index:20;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(10,13,27,.82);box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(14px);pointer-events:none}
      .liw-admin-lab-preview-dock i{display:block;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.42)}
      .liw-admin-lab-preview-dock i:first-child{width:22px;border-radius:999px;background:linear-gradient(90deg,#6f7cff,#b76cff)}
      @media(max-width:900px){.liw-admin-lab-theme-group{padding:12px}.liw-admin-lab-theme-group .template-tier-heading p{font-size:.68rem}}
      @media(prefers-reduced-motion:reduce){html.liw-admin-lab-editor-active #phone-preview .preview-cover{transform:none}}
    `;
    document.head.appendChild(style);
  }

  function labButtonMarkup() {
    return `<button type="button" class="template-card tier-premium liw-admin-lab-card" data-template="${LAB_ID}" data-tier="lab" aria-label="Open LIW Lab admin experiment">
      <div class="template-mini liw-admin-lab-mini" aria-hidden="true"></div>
      <div class="template-card-label"><span><strong>${LAB_LABEL}</strong><small>Experimental experience</small></span><em>Admin</em></div>
    </button>`;
  }

  function ensureTile() {
    const grid = document.getElementById('template-grid');
    if (!grid || !editorGlobal('admin')) return;

    let group = grid.querySelector('.liw-admin-lab-theme-group');
    if (!group) {
      group = document.createElement('section');
      group.className = 'template-tier-group liw-admin-lab-theme-group';
      group.dataset.templateTier = 'lab';
      group.innerHTML = `<div class="template-tier-heading"><div><h4>LIW Lab</h4><p>Private experiments for LIW admin. Customer themes stay untouched.</p></div></div><div class="template-tier-grid">${labButtonMarkup()}</div>`;
      grid.prepend(group);
    }

    syncDesktopCopy();
    syncVisualState();
  }

  function syncDesktopCopy() {
    const source = document.querySelector('#template-grid .liw-admin-lab-card');
    const quick = document.getElementById('desktop-theme-preview-grid');
    if (source && quick && !quick.querySelector(`.template-card[data-template="${LAB_ID}"]`)) {
      quick.prepend(source.cloneNode(true));
      const cards = [...quick.querySelectorAll('.template-card')];
      cards.slice(6).forEach(card => card.remove());
    }
    const count = document.getElementById('desktop-theme-count');
    const grid = document.getElementById('template-grid');
    if (count && grid) count.textContent = `${grid.querySelectorAll('.template-card').length} themes available`;
  }

  function ensurePreviewDock() {
    const phone = document.getElementById('phone-preview');
    if (!phone) return;
    let dock = phone.querySelector('.liw-admin-lab-preview-dock');
    if (active && !dock) {
      dock = document.createElement('div');
      dock.className = 'liw-admin-lab-preview-dock';
      dock.setAttribute('aria-hidden', 'true');
      dock.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
      phone.appendChild(dock);
    } else if (!active && dock) {
      dock.remove();
    }
  }

  function syncVisualState() {
    document.documentElement.classList.toggle('liw-admin-lab-editor-active', active);
    document.querySelectorAll(`.template-card[data-template="${LAB_ID}"]`).forEach(card => card.classList.toggle('active', active));
    ensurePreviewDock();
    if (active) {
      const summary = document.getElementById('template-selected-summary');
      if (summary) summary.textContent = 'LIW Lab · Admin preview';
      const desktopName = document.getElementById('desktop-selected-theme-name');
      if (desktopName) desktopName.textContent = 'LIW Lab · Admin preview';
    }
  }

  function activate() {
    if (!editorGlobal('admin')) return false;
    active = true;
    writeStored(true);
    syncVisualState();
    try { if (typeof toast === 'function') toast('LIW Lab enabled — admin preview only'); } catch (_) {}
    document.dispatchEvent(new CustomEvent('liw:admin-lab-change', { detail: { active: true } }));
    return true;
  }

  function deactivate({ silent = false } = {}) {
    if (!active && !readStored()) return;
    active = false;
    writeStored(false);
    syncVisualState();
    if (!silent) {
      try { if (typeof toast === 'function') toast('LIW Lab off — normal theme restored'); } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('liw:admin-lab-change', { detail: { active: false } }));
  }

  function decoratePreviewUrl(input) {
    const url = new URL(input, location.href);
    if (active) url.searchParams.set('liwAdminScroll', '1');
    else url.searchParams.delete('liwAdminScroll');
    return url.href;
  }

  function bindClicks() {
    if (document.documentElement.dataset.liwAdminLabClicks === 'true') return;
    document.documentElement.dataset.liwAdminLabClicks = 'true';
    document.addEventListener('click', event => {
      const card = event.target?.closest?.('.template-card');
      if (!card) return;
      if (String(card.dataset.template || '') === LAB_ID) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activate();
        return;
      }
      if (active && card.closest('#template-grid,#desktop-theme-preview-grid,#desktop-theme-library')) deactivate({ silent: true });
    }, true);
  }

  function observeGrid() {
    const grid = document.getElementById('template-grid');
    if (!grid || gridObserver) return;
    gridObserver = new MutationObserver(() => {
      if (!editorGlobal('admin')) return;
      if (!grid.querySelector('.liw-admin-lab-theme-group')) ensureTile();
      else syncDesktopCopy();
    });
    gridObserver.observe(grid, { childList: true });
  }

  function finishBoot() {
    if (!editorGlobal('admin')) return;
    ensureStyles();
    bindClicks();
    active = readStored();
    ensureTile();
    observeGrid();
    syncVisualState();
  }

  function boot() {
    bootTries += 1;
    if (editorGlobal('initialized')) {
      clearInterval(bootTimer);
      bootTimer = null;
      finishBoot();
      return;
    }
    if (bootTries >= 80) {
      clearInterval(bootTimer);
      bootTimer = null;
    }
  }

  window.LIWAdminLab = {
    get active() { return active; },
    activate,
    deactivate,
    decoratePreviewUrl,
    id: LAB_ID
  };

  bootTimer = setInterval(boot, 150);
  boot();
})();
