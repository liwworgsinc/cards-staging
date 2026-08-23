(function(){
  'use strict';

  const EXPORT_IDS = ['signature-copy','signature-copy-html','signature-download'];
  let accessResolved = false;
  let exportUnlocked = false;

  function isSignatureExportUnlocked(access){
    if (!access) return false;
    if (access.isAdmin && !access.isPlanPreview) return true;
    return ['plus','pro','agency','white_label'].includes(String(access.planKey || '').toLowerCase());
  }

  function injectStyles(){
    if (document.getElementById('liw-signature-permission-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-signature-permission-style';
    style.textContent = `
      .sig-plan-gate{
        display:flex;align-items:center;justify-content:space-between;gap:16px;
        margin:0 0 16px;padding:14px 15px;border:1px solid rgba(212,168,79,.44);
        border-radius:15px;background:linear-gradient(135deg,#fffdf7 0%,#fff8e5 100%);
        box-shadow:0 8px 22px rgba(16,24,40,.05);color:#344054;
      }
      .sig-plan-gate-copy{display:flex;align-items:flex-start;gap:11px;min-width:0}
      .sig-plan-gate-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;
        border-radius:11px;background:#07102e;color:#e0b85d;box-shadow:inset 0 0 0 1px rgba(224,184,93,.28)}
      .sig-plan-gate strong{display:block;color:#101828;font-size:.82rem;line-height:1.3}
      .sig-plan-gate p{margin:3px 0 0;color:#667085;font-size:.72rem;line-height:1.5}
      .sig-plan-gate a{flex:0 0 auto;min-height:39px;padding:0 12px;border-radius:11px;
        display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#07102e;
        color:#fff;text-decoration:none;font-size:.74rem;font-weight:900;box-shadow:0 8px 18px rgba(7,16,46,.16)}
      .sig-export-locked{position:relative}
      .sig-export-locked::after{content:'PLUS';margin-left:6px;padding:3px 6px;border-radius:999px;
        background:rgba(212,168,79,.18);color:inherit;font-size:.58rem;font-weight:900;letter-spacing:.06em}
      .sig-action-primary.sig-export-locked{filter:saturate(.82)}
      @media(max-width:720px){
        .sig-plan-gate{align-items:stretch;flex-direction:column}
        .sig-plan-gate a{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function showUpgradeMessage(){
    if (typeof toast === 'function') toast('Email Signature export is included with Plus and above.');
    const gate = document.getElementById('signature-plan-gate');
    gate?.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function interceptLockedExport(event){
    const target = event.target instanceof Element ? event.target.closest('#signature-copy,#signature-copy-html,#signature-download') : null;
    if (!target) return;
    if (!accessResolved || !exportUnlocked){
      event.preventDefault();
      event.stopImmediatePropagation();
      showUpgradeMessage();
    }
  }

  document.addEventListener('click', interceptLockedExport, true);

  function renderGate(access){
    document.getElementById('signature-plan-gate')?.remove();
    EXPORT_IDS.forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.classList.toggle('sig-export-locked', !exportUnlocked);
      button.setAttribute('aria-description', exportUnlocked ? 'Available on your plan' : 'Requires LIW Cards Plus or higher');
    });

    if (exportUnlocked) return;
    const controls = document.querySelector('.sig-controls');
    if (!controls) return;

    const gate = document.createElement('div');
    gate.id = 'signature-plan-gate';
    gate.className = 'sig-plan-gate';
    gate.setAttribute('role','status');
    const planName = access?.isPlanPreview ? 'Free plan preview' : 'Free plan';
    gate.innerHTML = `
      <div class="sig-plan-gate-copy">
        <span class="sig-plan-gate-icon" aria-hidden="true"><i data-lucide="lock-keyhole" size="18"></i></span>
        <div><strong>${planName}: preview the generator free</strong>
        <p>Customize your signature and test every style. Copying and downloading your finished signature unlocks with Plus, Pro, or an Agency plan.</p></div>
      </div>
      <a href="pricing.html"><i data-lucide="sparkles" size="15"></i> Upgrade to Plus</a>`;
    controls.prepend(gate);
    if (window.lucide) lucide.createIcons();
  }

  async function initPermissions(){
    injectStyles();
    try{
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const access = await getLiwAccessContext(user, { refresh: true });
      exportUnlocked = isSignatureExportUnlocked(access);
      accessResolved = true;
      renderGate(access);
    }catch(_){
      accessResolved = true;
      exportUnlocked = false;
      renderGate(null);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPermissions, {once:true});
  else initPermissions();
})();
