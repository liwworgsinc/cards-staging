(function () {
  const FEATURE_KEY = 'rich_sections';
  const PRO_PLANS = new Set(['pro', 'agency', 'white_label']);
  const FEATURES = [
    ['clock-3', 'Business hours'],
    ['images', 'Photo gallery'],
    ['message-square-heart', 'Testimonials & reviews'],
    ['circle-help', 'FAQ'],
    ['map-pin', 'Map & location'],
    ['mouse-pointer-click', 'Custom CTA buttons'],
    ['badge-check', 'Credentials & badges'],
    ['link-2', 'Featured links']
  ];

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function injectStyles() {
    if (document.getElementById('rich-pro-gate-styles')) return;
    const style = document.createElement('style');
    style.id = 'rich-pro-gate-styles';
    style.textContent = `
      #rich-card-builder[data-pro-unlocked="true"] .rich-card-builder-badge{background:linear-gradient(135deg,#0b1438,#18265b);color:#f6d88f;box-shadow:0 7px 20px rgba(11,20,56,.18)}
      .rich-pro-lock{margin-top:24px;padding:22px;border:1px solid rgba(212,168,79,.35);border-radius:22px;background:linear-gradient(145deg,#fff 0%,#fffaf0 52%,#f8f2e4 100%);box-shadow:0 16px 38px rgba(11,20,56,.08);overflow:hidden;position:relative}
      .rich-pro-lock:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(#d4a84f,#8e6a22)}
      .rich-pro-lock-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .rich-pro-lock-title{display:flex;gap:12px;align-items:flex-start}.rich-pro-lock-icon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:13px;background:#0b1438;color:#f6d88f;box-shadow:0 8px 20px rgba(11,20,56,.18)}
      .rich-pro-lock h3{margin:0 0 4px;color:#0b1438;font-size:1.05rem}.rich-pro-lock p{margin:0;color:#667085;font-size:.82rem;line-height:1.5;max-width:680px}
      .rich-pro-pill{padding:6px 10px;border-radius:999px;background:#0b1438;color:#f6d88f;font-size:.68rem;font-weight:900;letter-spacing:.07em}
      .rich-pro-feature-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0 16px}
      .rich-pro-feature{display:flex;align-items:center;gap:8px;min-width:0;padding:10px;border:1px solid rgba(11,20,56,.09);border-radius:12px;background:rgba(255,255,255,.82);color:#344054;font-size:.74rem;font-weight:800}.rich-pro-feature svg{flex:0 0 auto;color:#9b752b}
      .rich-pro-lock-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:14px;border-top:1px solid rgba(11,20,56,.08)}
      .rich-pro-lock-foot span{color:#667085;font-size:.74rem}.rich-pro-upgrade{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:9px 14px;border-radius:11px;background:#0b1438;color:#fff;text-decoration:none;font-size:.78rem;font-weight:900;box-shadow:0 8px 20px rgba(11,20,56,.16)}
      @media(max-width:760px){.rich-pro-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rich-pro-lock-foot{align-items:flex-start;flex-direction:column}.rich-pro-upgrade{width:100%}}
      @media(max-width:480px){.rich-pro-lock{padding:17px}.rich-pro-lock-head{flex-direction:column}.rich-pro-feature-grid{grid-template-columns:1fr}.rich-pro-pill{position:absolute;right:14px;top:14px}}
    `;
    document.head.appendChild(style);
  }

  function lockedMarkup() {
    return `
      <section class="rich-pro-lock" aria-label="Pro premium card sections">
        <div class="rich-pro-lock-head">
          <div class="rich-pro-lock-title">
            <span class="rich-pro-lock-icon"><i data-lucide="crown" size="19"></i></span>
            <div><h3>Premium card sections</h3><p>Turn your digital card into a richer mini-site with advanced sections, premium layouts, and presentation controls.</p></div>
          </div>
          <span class="rich-pro-pill">PRO</span>
        </div>
        <div class="rich-pro-feature-grid">${FEATURES.map(([icon, label]) => `<div class="rich-pro-feature"><i data-lucide="${icon}" size="15"></i><span>${label}</span></div>`).join('')}</div>
        <div class="rich-pro-lock-foot"><span>Available with LIW Cards Pro, Agency, and White-label plans.</span><a class="rich-pro-upgrade" href="pricing.html"><i data-lucide="sparkles" size="15"></i> Upgrade to Pro</a></div>
      </section>`;
  }

  function unlockBuilder(builder) {
    builder.dataset.proUnlocked = 'true';
    const badge = builder.querySelector('.rich-card-builder-badge');
    if (badge) badge.textContent = 'Pro';
    const heading = builder.querySelector('.rich-card-builder-head h3');
    if (heading) heading.textContent = 'Beef up your card';
  }

  function lockBuilder(builder) {
    builder.dataset.proUnlocked = 'false';
    builder.innerHTML = lockedMarkup();
    if (window.lucide) lucide.createIcons();
  }

  async function resolveBuilder() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const builder = document.getElementById('rich-card-builder');
      if (builder) return builder;
      await wait(150);
    }
    return null;
  }

  async function boot() {
    injectStyles();
    if (typeof supabaseClient === 'undefined' || typeof getLiwAccessContext !== 'function') return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const access = await getLiwAccessContext(user);
      const allowed = Boolean(
        access?.has?.(FEATURE_KEY) ||
        PRO_PLANS.has(String(access?.planKey || '').toLowerCase()) ||
        (access?.isAdmin && !access?.isPlanPreview)
      );
      const builder = await resolveBuilder();
      if (!builder) return;
      if (allowed) unlockBuilder(builder);
      else lockBuilder(builder);
    } catch (error) {
      console.warn('LIW Pro rich-section gate could not resolve access:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
