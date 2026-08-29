(function hireDesignerPage(){
  const defaults = {
    heroTitle: 'A professionally designed LIW Card — without doing it yourself.',
    heroCopy: 'Send us your brand, details, and goals. We’ll build a polished digital business card that is ready to share.',
    cardSetupName: 'Card Setup',
    cardSetupPrice: 49,
    premiumName: 'Premium Card Design',
    premiumPrice: 99,
    teamName: 'Business / Team Setup',
    teamPrice: 199,
    turnaround: '2–3 business days'
  };

  const state = {
    settings: { ...defaults },
    design: 'premium',
    plan: 'plus',
    currentPlan: null,
    currentPlanName: null,
    isAdmin: false,
    domainMode: 'liw',
    domainName: '',
    domainPriceCents: 0,
    domainRenewalCents: 0,
    domainYears: 1,
    domainItem: null,
    domainSearchPayload: null,
    funnelStep: 1
  };

  const planData = {
    starter: { name: 'Free', price: 0, renewal: 'No renewal charge', interval: 'month' },
    lite: { name: 'Lite', price: 24, renewal: '$24/year', interval: 'year' },
    plus: { name: 'Plus', price: 49, renewal: '$49/year', interval: 'year' },
    pro: { name: 'Pro', price: 99, renewal: '$99/year', interval: 'year' }
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const money = value => `$${Number(value || 0).toFixed(Number(value || 0) % 1 ? 2 : 0)}`;
  const centsMoney = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const safeText = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function setText(selector, value){
    const node = $(selector);
    if (node && value != null && String(value).trim()) node.textContent = String(value).trim();
  }

  function renderHeroTitle(value){
    const node = $('#hd-hero-title');
    const title = String(value || '').trim();
    if (!node || !title) return;
    const divider = ' — ';
    const index = title.indexOf(divider);
    if (index === -1) {
      node.textContent = title;
      return;
    }
    const first = title.slice(0, index + divider.length);
    const second = title.slice(index + divider.length);
    node.textContent = first;
    const accent = document.createElement('span');
    accent.className = 'hd-gold-text';
    accent.textContent = second;
    node.appendChild(accent);
  }

  function designData(key = state.design){
    if (key === 'setup') return { name: state.settings.cardSetupName, price: number(state.settings.cardSetupPrice, 49) };
    if (key === 'team') return { name: state.settings.teamName, price: number(state.settings.teamPrice, 199) };
    return { name: state.settings.premiumName, price: number(state.settings.premiumPrice, 99) };
  }

  function currentPlanAlreadyOwned(planKey){
    // Admin accounts are QA viewers here. They should see the same customer-facing
    // total a buyer would see instead of every plan being treated as already owned.
    if (state.isAdmin) return false;
    return Boolean(state.currentPlan && state.currentPlan === planKey && state.currentPlan !== 'starter');
  }

  function selectedPlanCharge(){
    const plan = planData[state.plan] || planData.plus;
    return currentPlanAlreadyOwned(state.plan) ? 0 : plan.price;
  }

  function selectedDomainCharge(){
    return state.domainMode === 'buy' && state.domainName ? state.domainPriceCents / 100 : 0;
  }

  function applySettings(content){
    state.settings = { ...defaults, ...(content || {}) };
    renderHeroTitle(state.settings.heroTitle);
    setText('#hd-hero-copy', state.settings.heroCopy);
    $$('[data-turnaround]').forEach(node => { node.textContent = state.settings.turnaround; });
    setText('[data-design-name="setup"]', state.settings.cardSetupName);
    setText('[data-design-name="premium"]', state.settings.premiumName);
    setText('[data-design-name="team"]', state.settings.teamName);
    setText('[data-design-price="setup"]', money(state.settings.cardSetupPrice));
    setText('[data-design-price="premium"]', money(state.settings.premiumPrice));
    setText('[data-design-price="team"]', money(state.settings.teamPrice));
    updateSummary();
  }

  async function loadSettings(){
    try {
      const { data, error } = await supabaseClient.from('designer_page_settings').select('content').eq('id', 'main').maybeSingle();
      if (error) throw error;
      applySettings(data?.content || defaults);
    } catch (error) {
      console.warn('Using Hire a Designer defaults:', error);
      applySettings(defaults);
    }
  }

  function loadPhoneScreen(){
    const oldImage = $('#designer-card-screen');
    const loading = $('#designer-card-loading');
    const phone = oldImage?.parentElement || loading?.parentElement;
    if (!phone) return;
    oldImage?.remove();

    let frame = $('#designer-card-live-preview');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'designer-card-live-preview';
      frame.className = 'hd-phone-screen';
      frame.title = 'CGT Consultants LIW digital card preview';
      frame.setAttribute('aria-label', 'CGT Consultants LIW digital card preview');
      frame.setAttribute('scrolling', 'no');
      frame.setAttribute('tabindex', '-1');
      frame.style.cssText = 'border:0;pointer-events:none;position:absolute;inset:0;width:100%;height:100%;background:#f4f7fa;z-index:1;visibility:hidden';
      phone.appendChild(frame);
    }

    const reveal = () => {
      if (loading) loading.hidden = true;
      frame.style.visibility = 'visible';
    };
    frame.addEventListener('load', reveal, { once: true });
    frame.src = liwUrl('card.html?slug=cgt&designerPreview=1');
    window.setTimeout(reveal, 3500);
  }

  function injectFunnelStyles(){
    if ($('#hd-funnel-styles')) return;
    const style = document.createElement('style');
    style.id = 'hd-funnel-styles';
    style.textContent = `
      .hd-funnel-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:820px;margin:0 auto 34px;padding:8px;border:1px solid #e5e8ef;border-radius:16px;background:#fff;box-shadow:0 10px 28px rgba(11,20,56,.05)}
      .hd-funnel-step{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:11px;color:#7a8497;font-size:.74rem;font-weight:800;transition:.18s ease}.hd-funnel-step b{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#eef1f6;color:#6d778b;font-size:.68rem}.hd-funnel-step.active{background:#fff8e9;color:#0b1438}.hd-funnel-step.active b,.hd-funnel-step.complete b{background:#d4a84f;color:#0b1438}.hd-funnel-step.complete{color:#0b1438}.hd-funnel-step span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .hd-domain-block{margin-top:28px;padding-top:28px;border-top:1px solid var(--hd-border)}
      .hd-domain-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}.hd-domain-heading h3{margin:0 0 5px;color:var(--hd-deep);font-size:1.35rem}.hd-domain-heading p{margin:0;color:var(--hd-muted);font-size:.84rem;line-height:1.5;max-width:620px}.hd-domain-step{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#f7f0df;color:#7d5c19;font-size:.61rem;font-weight:950;letter-spacing:.06em;text-transform:uppercase}
      .hd-domain-intro{display:flex;gap:11px;align-items:flex-start;padding:14px 15px;margin-bottom:14px;border:1px solid rgba(212,168,79,.34);border-radius:15px;background:linear-gradient(135deg,#fffaf0,#fff)}.hd-domain-intro i{color:#9b731f;flex:0 0 auto;margin-top:2px}.hd-domain-intro strong{display:block;color:var(--hd-navy);font-size:.9rem}.hd-domain-intro span{display:block;margin-top:2px;color:#687286;font-size:.78rem;line-height:1.5}
      .hd-domain-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.hd-domain-choice{display:flex;gap:10px;align-items:flex-start;padding:14px;border:1px solid var(--hd-border);border-radius:14px;background:#fff;cursor:pointer;transition:.16s ease}.hd-domain-choice:hover{border-color:#c9cfdb;transform:translateY(-1px)}.hd-domain-choice.selected{border-color:var(--hd-gold);box-shadow:0 8px 22px rgba(11,20,56,.06),inset 3px 0 0 var(--hd-gold)}.hd-domain-radio{width:19px;height:19px;border-radius:50%;border:2px solid #c7ceda;display:block;flex:0 0 auto;margin-top:1px;background:#fff}.hd-domain-choice.selected .hd-domain-radio{border-color:var(--hd-gold);background:var(--hd-gold)}.hd-domain-choice.selected .hd-domain-radio:after{content:none!important}.hd-domain-choice strong{display:block;color:var(--hd-navy);font-size:.85rem}.hd-domain-choice span{display:block;color:var(--hd-muted);font-size:.69rem;line-height:1.42;margin-top:3px}
      .hd-domain-workspace{display:none;margin-top:11px;padding:15px;border:1px solid #e4e8ef;border-radius:15px;background:#fff}.hd-domain-workspace.show{display:block}.hd-domain-search-row,.hd-own-domain-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.hd-domain-search-row input,.hd-own-domain-row input{width:100%;min-height:44px;border:1px solid #dce1ea;border-radius:11px;padding:0 12px;outline:none}.hd-domain-search-row input:focus,.hd-own-domain-row input:focus{border-color:var(--hd-gold);box-shadow:0 0 0 3px rgba(212,168,79,.12)}.hd-domain-search-row button,.hd-own-domain-row button{border:0;border-radius:11px;padding:0 14px;min-height:44px;background:var(--hd-navy);color:#fff;font-weight:850;cursor:pointer}.hd-domain-search-row button:disabled{opacity:.58}.hd-domain-popular{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;color:var(--hd-muted);font-size:.66rem}.hd-domain-popular span{padding:3px 6px;border:1px solid #e2e6ed;border-radius:999px;background:#fafbfc}
      .hd-domain-status{display:none;margin-top:10px;padding:9px 10px;border-radius:10px;background:#f5f7fa;color:#5e687b;font-size:.71rem;line-height:1.42}.hd-domain-status.show{display:block}.hd-domain-status.success{background:#f0faf6;color:#14694f;border:1px solid rgba(18,138,104,.2)}.hd-domain-status.error{background:#fff5f4;color:#9a3a32;border:1px solid rgba(190,62,51,.16)}
      .hd-domain-results{display:none;margin-top:10px;gap:7px}.hd-domain-results.show{display:grid}.hd-domain-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid #e2e7ef;border-radius:12px;background:#fff;cursor:pointer;text-align:left}.hd-domain-result.selected{border-color:var(--hd-gold);background:#fffdf8;box-shadow:inset 3px 0 0 var(--hd-gold)}.hd-domain-result strong{display:block;color:var(--hd-navy);font-size:.82rem}.hd-domain-result small{display:block;margin-top:2px;color:var(--hd-muted);font-size:.65rem}.hd-domain-result-price{text-align:right;color:var(--hd-deep);font-weight:900;font-size:.8rem}.hd-domain-result-price small{font-weight:650;color:var(--hd-muted)}
      .hd-domain-term-wrap{display:none;margin-top:11px;padding-top:11px;border-top:1px solid #e8ebf1}.hd-domain-term-wrap.show{display:block}.hd-domain-term-label{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.hd-domain-term-label strong{color:var(--hd-navy);font-size:.76rem}.hd-domain-term-label span{color:var(--hd-muted);font-size:.65rem}.hd-domain-terms{display:flex;gap:6px;flex-wrap:wrap}.hd-domain-terms button{min-width:52px;padding:7px 8px;border:1px solid #dce2ea;border-radius:9px;background:#fff;color:#596478;font-weight:800;font-size:.68rem;cursor:pointer}.hd-domain-terms button.active{border-color:var(--hd-gold);background:#fff8e9;color:#75581c}.hd-domain-term-copy,.hd-own-domain-help{margin:7px 0 0;color:var(--hd-muted);font-size:.67rem;line-height:1.42}.hd-order-domain-meta{display:block;color:#9faac2;font-size:.64rem;font-weight:600;margin-top:2px;text-align:left}
      @media(max-width:760px){.hd-funnel-progress{grid-template-columns:repeat(2,1fr);margin-bottom:25px}.hd-domain-options{grid-template-columns:1fr}.hd-domain-heading{display:block}.hd-domain-step{display:inline-flex;margin-bottom:8px}.hd-domain-search-row,.hd-own-domain-row{grid-template-columns:1fr}.hd-domain-search-row button,.hd-own-domain-row button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function buildProgress(){
    if ($('#hd-funnel-progress')) return;
    injectFunnelStyles();
    const heading = $('#design-services .hd-section-heading');
    if (!heading) return;
    const progress = document.createElement('div');
    progress.id = 'hd-funnel-progress';
    progress.className = 'hd-funnel-progress';
    progress.innerHTML = `
      <div class="hd-funnel-step active" data-funnel-step="1"><b>1</b><span>Design service</span></div>
      <div class="hd-funnel-step" data-funnel-step="2"><b>2</b><span>LIW plan</span></div>
      <div class="hd-funnel-step" data-funnel-step="3"><b>3</b><span>Web address</span></div>
      <div class="hd-funnel-step" data-funnel-step="4"><b>4</b><span>Review order</span></div>`;
    heading.insertAdjacentElement('afterend', progress);
  }

  function setFunnelStep(step){
    state.funnelStep = Math.max(1, Math.min(4, Number(step) || 1));
    $$('.hd-funnel-step').forEach(node => {
      const n = Number(node.dataset.funnelStep || 0);
      node.classList.toggle('active', n === state.funnelStep);
      node.classList.toggle('complete', n < state.funnelStep);
    });
  }

  function goToStep(step, focusSelector){
    setFunnelStep(step);
    const desktopReview = step === 4 && window.matchMedia('(min-width:981px)').matches;
    const target = step === 1 ? $('#design-services') : step === 2 ? $('#choose-plan') : step === 3 ? $('#hd-domain-block') : $('.hd-order-card');
    if (target && !desktopReview) window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    if (focusSelector) window.setTimeout(() => $(focusSelector)?.focus(), 520);
  }

  function buildDomainUi(){
    if ($('#hd-domain-block')) return;
    injectFunnelStyles();
    const footnote = $('.hd-plan-footnote');
    if (!footnote) return;

    const section = document.createElement('section');
    section.className = 'hd-domain-block';
    section.id = 'hd-domain-block';
    section.innerHTML = `
      <div class="hd-domain-heading"><div><span class="hd-domain-step">Step 3 · optional</span><h3>Choose your web address.</h3><p>Keep your included LIW card link, add a custom domain, or connect a domain you already own.</p></div></div>
      <div class="hd-domain-intro"><i data-lucide="sparkles" size="18"></i><div><strong>Make it even more yours</strong><span>Your LIW card link is ready to share. Add a custom domain for an extra branded touch.</span></div></div>
      <div class="hd-domain-options" role="radiogroup" aria-label="Web address choice">
        <div class="hd-domain-choice selected" data-domain-mode="liw" role="radio" tabindex="0" aria-checked="true"><span class="hd-domain-radio"></span><div><strong>Use my LIW card link</strong><span>Included and ready to share. No extra domain cost.</span></div></div>
        <div class="hd-domain-choice" data-domain-mode="buy" role="radio" tabindex="0" aria-checked="false"><span class="hd-domain-radio"></span><div><strong>Buy a custom domain</strong><span>Search live availability and add the domain to this order.</span></div></div>
        <div class="hd-domain-choice" data-domain-mode="own" role="radio" tabindex="0" aria-checked="false"><span class="hd-domain-radio"></span><div><strong>I already own a domain</strong><span>Keep it with your registrar and submit it for LIW connection.</span></div></div>
      </div>
      <div class="hd-domain-workspace" id="hd-domain-buy-panel">
        <div class="hd-domain-search-row"><input id="hd-domain-search-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="yourbusiness.com or business name"><button id="hd-domain-search-button" type="button">Search</button></div>
        <div class="hd-domain-popular"><b>Popular:</b><span>.com</span><span>.cards</span><span>.net</span><span>.co</span><span>+ more</span></div>
        <div class="hd-domain-status" id="hd-domain-status"></div><div class="hd-domain-results" id="hd-domain-results"></div>
        <div class="hd-domain-term-wrap" id="hd-domain-term-wrap"><div class="hd-domain-term-label"><strong>Registration length</strong><span>Multi-year savings shown when available</span></div><div class="hd-domain-terms" id="hd-domain-terms"></div><p class="hd-domain-term-copy" id="hd-domain-term-copy"></p></div>
      </div>
      <div class="hd-domain-workspace" id="hd-domain-own-panel">
        <div class="hd-own-domain-row"><input id="hd-own-domain-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="www.yourbusiness.com"><button id="hd-own-domain-button" type="button">Use this domain</button></div>
        <p class="hd-own-domain-help">Your domain stays with your current registrar. LIW will provide the connection steps and verify it before the finished card goes live.</p><div class="hd-domain-status" id="hd-own-domain-status"></div>
      </div>`;
    footnote.insertAdjacentElement('afterend', section);

    const orderLines = $('.hd-order-lines');
    if (orderLines && !$('#hd-order-domain-name')) {
      const line = document.createElement('div');
      line.className = 'hd-order-line';
      line.innerHTML = '<span><span id="hd-order-domain-name">LIW card link</span><small class="hd-order-domain-meta" id="hd-order-domain-meta">Included and ready to share</small></span><strong id="hd-order-domain-price">$0 included</strong>';
      orderLines.appendChild(line);
    }

    const previewSummary = $('.hd-preview-summary');
    if (previewSummary && !$('#hd-preview-domain')) {
      const totalRow = previewSummary.querySelector('.hd-preview-row.total');
      const row = document.createElement('div');
      row.className = 'hd-preview-row';
      row.innerHTML = '<span>Web address</span><strong id="hd-preview-domain">LIW card link — included</strong>';
      previewSummary.insertBefore(row, totalRow || null);
    }

    const firstStep = $('.hd-step');
    if (firstStep) {
      firstStep.querySelector('h3').textContent = 'Choose service, plan + web address';
      firstStep.querySelector('p').textContent = 'Build your order in one place, including an optional custom domain.';
    }

    wireDomainUi();
    window.lucide?.createIcons?.();
    updateSummary();
  }

  function setDomainStatus(target, kind, html){
    const node = $(target);
    if (!node) return;
    node.className = `hd-domain-status show${kind ? ` ${kind}` : ''}`;
    node.innerHTML = html;
  }

  function clearDomainPurchase(){
    state.domainName = '';
    state.domainPriceCents = 0;
    state.domainRenewalCents = 0;
    state.domainYears = 1;
    state.domainItem = null;
    state.domainSearchPayload = null;
  }

  function chooseDomainMode(mode, advance = false){
    if (!['liw','buy','own'].includes(mode)) return;
    state.domainMode = mode;
    if (mode === 'liw') clearDomainPurchase();
    if (mode === 'own') {
      state.domainPriceCents = 0;
      state.domainRenewalCents = 0;
      state.domainYears = 1;
      state.domainItem = null;
    }

    $$('.hd-domain-choice').forEach(choice => {
      const active = choice.dataset.domainMode === mode;
      choice.classList.toggle('selected', active);
      choice.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    $('#hd-domain-buy-panel')?.classList.toggle('show', mode === 'buy');
    $('#hd-domain-own-panel')?.classList.toggle('show', mode === 'own');
    updateSummary();

    if (advance) {
      if (mode === 'liw') goToStep(4);
      else if (mode === 'buy') goToStep(3, '#hd-domain-search-input');
      else goToStep(3, '#hd-own-domain-input');
    }
  }

  function wireDomainUi(){
    $$('.hd-domain-choice').forEach(choice => {
      const select = () => chooseDomainMode(choice.dataset.domainMode, true);
      choice.addEventListener('click', select);
      choice.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
      });
    });
    $('#hd-domain-search-button')?.addEventListener('click', searchDomains);
    $('#hd-domain-search-input')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchDomains(); } });
    $('#hd-own-domain-button')?.addEventListener('click', saveOwnedDomain);
    $('#hd-own-domain-input')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); saveOwnedDomain(); } });
  }

  function normalizeOwnedDomain(value){
    return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].replace(/\.$/, '');
  }

  function saveOwnedDomain(){
    const name = normalizeOwnedDomain($('#hd-own-domain-input')?.value);
    if (!name || !name.includes('.') || !/^[a-z0-9.-]+$/.test(name)) {
      setDomainStatus('#hd-own-domain-status','error','Enter a domain you already own, such as <strong>yourbusiness.com</strong>.');
      return;
    }
    state.domainMode = 'own';
    state.domainName = name;
    state.domainPriceCents = 0;
    state.domainRenewalCents = 0;
    state.domainYears = 1;
    setDomainStatus('#hd-own-domain-status','success',`<strong>${safeText(name)}</strong> will be submitted for LIW connection verification.`);
    updateSummary();
    goToStep(4);
  }

  function apiPrice(item){
    const prices = Array.isArray(item?.retailPrices) ? item.retailPrices : [];
    return prices.find(row => Number(row?.period) === 1) || prices[0] || null;
  }

  async function searchDomains(){
    const input = $('#hd-domain-search-input');
    const button = $('#hd-domain-search-button');
    const requested = String(input?.value || '').trim();
    if (!requested) {
      setDomainStatus('#hd-domain-status','error','Enter your business name or a domain first.');
      input?.focus();
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      try { sessionStorage.setItem('liw_designer_domain_query', requested); } catch (_) {}
      setDomainStatus('#hd-domain-status','error',`Sign in to check live domain availability and keep this selection with your order. <a href="${liwUrl('login.html?next=hire-designer')}" style="font-weight:900;text-decoration:underline">Sign in</a>`);
      return;
    }

    if (button) { button.disabled = true; button.textContent = 'Checking…'; }
    setDomainStatus('#hd-domain-status','', 'Checking live domain availability and LIW pricing…');
    $('#hd-domain-results')?.classList.remove('show');
    $('#hd-domain-term-wrap')?.classList.remove('show');
    clearDomainPurchase();
    state.domainMode = 'buy';
    updateSummary();

    try {
      const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/godaddy-domain-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: LIW_CONFIG.supabaseKey, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ domain: requested })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to check domains right now.');
      state.domainSearchPayload = payload;
      renderDomainResults(payload);
    } catch (error) {
      setDomainStatus('#hd-domain-status','error',safeText(error?.message || 'Unable to check domains right now.'));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Search'; }
    }
  }

  function renderDomainResults(payload){
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const available = items.filter(item => item?.available).slice(0,7);
    const results = $('#hd-domain-results');
    if (!results || !available.length) {
      setDomainStatus('#hd-domain-status','error','No available options came back. Try another business name.');
      return;
    }

    results.innerHTML = available.map((item,index) => {
      const price = apiPrice(item);
      const first = price?.price?.value;
      const renewal = price?.renewalPrice?.value;
      return `<button class="hd-domain-result" type="button" data-domain-result="${index}"><span><strong>${safeText(item.domain || 'Domain')}</strong><small>Available${String(item.inventory || '').toUpperCase() === 'PREMIUM' ? ' · Premium' : ''}</small></span><span class="hd-domain-result-price">${typeof first === 'number' ? centsMoney(first) : 'Quote'}<small>${typeof renewal === 'number' ? `${centsMoney(renewal)}/yr renewal` : 'first year'}</small></span></button>`;
    }).join('');
    results.classList.add('show');
    results.querySelectorAll('[data-domain-result]').forEach((button,index) => button.addEventListener('click',() => selectDomain(available[index],button)));
    setDomainStatus('#hd-domain-status','success',`<strong>${available.length} option${available.length === 1 ? '' : 's'} available.</strong> Choose the address you want.`);
  }

  function selectDomain(item, button){
    const price = apiPrice(item);
    state.domainMode = 'buy';
    state.domainName = String(item?.domain || '');
    state.domainItem = item;
    state.domainPriceCents = Number(price?.price?.value || 0);
    state.domainRenewalCents = Number(price?.renewalPrice?.value || 0);
    state.domainYears = 1;
    $$('.hd-domain-result').forEach(node => node.classList.toggle('selected', node === button));
    renderDomainTerms(item);
    updateSummary();
    window.setTimeout(() => goToStep(4), 240);
  }

  function renderDomainTerms(item){
    const wrap = $('#hd-domain-term-wrap');
    const terms = $('#hd-domain-terms');
    const copy = $('#hd-domain-term-copy');
    if (!wrap || !terms || !copy) return;
    const deals = Array.isArray(item?.termDeals) && item.termDeals.length ? item.termDeals : [];
    const oneYear = apiPrice(item);
    const options = deals.length ? deals : [{ years: 1, dealTotal: oneYear?.price, savings: { value: 0 } }];

    terms.innerHTML = options.map(deal => {
      const years = Number(deal?.years || 1);
      const total = Number(deal?.dealTotal?.value || 0);
      const savings = Number(deal?.savings?.value || 0);
      return `<button type="button" class="${years === 1 ? 'active' : ''}" data-domain-years="${years}" data-domain-total="${total}">${years} yr${savings > 0 ? ` · save ${centsMoney(savings)}` : ''}</button>`;
    }).join('');

    terms.querySelectorAll('[data-domain-years]').forEach(termButton => {
      termButton.addEventListener('click',() => {
        state.domainYears = Number(termButton.dataset.domainYears || 1);
        state.domainPriceCents = Number(termButton.dataset.domainTotal || 0);
        terms.querySelectorAll('button').forEach(node => node.classList.toggle('active', node === termButton));
        copy.textContent = `${state.domainName} · ${state.domainYears} year${state.domainYears === 1 ? '' : 's'} · ${centsMoney(state.domainPriceCents)} today`;
        updateSummary();
      });
    });

    wrap.classList.add('show');
    copy.textContent = `${state.domainName} · 1 year · ${centsMoney(state.domainPriceCents)} today`;
  }

  function markSelections(){
    $$('.hd-service-card').forEach(card => {
      const selected = card.dataset.design === state.design;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      const button = card.querySelector('.hd-choose-service');
      if (button) button.textContent = selected ? 'Continue with this service' : 'Choose this service';
    });
    $$('.hd-plan-option').forEach(option => {
      const selected = option.dataset.plan === state.plan;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
  }

  function updateSummary(){
    const design = designData();
    const plan = planData[state.plan] || planData.plus;
    const planCharge = selectedPlanCharge();
    const domainCharge = selectedDomainCharge();
    const total = design.price + planCharge + domainCharge;

    setText('#hd-order-design-name', design.name);
    setText('#hd-order-design-price', `${money(design.price)} one-time`);
    setText('#hd-order-plan-name', currentPlanAlreadyOwned(state.plan) ? `${plan.name} · current plan` : `${plan.name} plan`);
    setText('#hd-order-plan-price', planCharge === 0 ? '$0 today' : money(planCharge));
    setText('#hd-order-total', money(total));

    const domainName = $('#hd-order-domain-name');
    const domainMeta = $('#hd-order-domain-meta');
    const domainPrice = $('#hd-order-domain-price');
    if (domainName && domainMeta && domainPrice) {
      if (state.domainMode === 'buy') {
        domainName.textContent = state.domainName || 'Custom domain';
        domainMeta.textContent = state.domainName ? `${state.domainYears} year${state.domainYears === 1 ? '' : 's'} selected` : 'Search and choose an available domain';
        domainPrice.textContent = state.domainName ? centsMoney(state.domainPriceCents) : 'Choose domain';
      } else if (state.domainMode === 'own') {
        domainName.textContent = state.domainName || 'Domain you already own';
        domainMeta.textContent = state.domainName ? 'Submit for LIW connection verification' : 'Enter your existing domain';
        domainPrice.textContent = '$0 today';
      } else {
        domainName.textContent = 'LIW card link';
        domainMeta.textContent = 'Included and ready to share';
        domainPrice.textContent = '$0 included';
      }
    }

    const renewal = $('#hd-order-renewal');
    if (renewal) {
      let copy = '';
      if (state.isAdmin) {
        copy = state.plan === 'starter'
          ? 'Admin QA: showing the customer-facing total. The Free plan adds no subscription charge.'
          : `Admin QA: showing the customer-facing total. ${plan.name} adds ${money(plan.price)} today and renews at ${plan.renewal}.`;
      } else if (currentPlanAlreadyOwned(state.plan)) copy = `You already have ${plan.name}. Your existing subscription continues on its current billing schedule.`;
      else if (state.plan === 'starter') copy = 'The design service is a one-time fee. The Free plan has no recurring subscription charge.';
      else copy = `Today includes the selected design service and ${plan.name}. The plan renews at ${plan.renewal} unless canceled.`;
      if (state.domainMode === 'buy' && state.domainName) copy += ` ${state.domainName} is selected for ${state.domainYears} year${state.domainYears === 1 ? '' : 's'}; renewal pricing will be confirmed before payment.`;
      if (state.domainMode === 'own' && state.domainName) copy += ' Your existing domain remains with your current registrar.';
      renewal.textContent = copy;
    }

    markSelections();
  }

  function chooseDesign(key, advance = false){
    if (!['setup','premium','team'].includes(key)) return;
    state.design = key;
    updateSummary();
    if (advance) goToStep(2);
  }

  function choosePlan(key, advance = false){
    if (!planData[key]) return;
    state.plan = key;
    updateSummary();
    if (advance) goToStep(3);
  }

  function wireSelections(){
    $$('.hd-service-card').forEach(card => {
      card.addEventListener('click', event => {
        const onButton = Boolean(event.target.closest('.hd-choose-service'));
        chooseDesign(card.dataset.design, onButton);
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          chooseDesign(card.dataset.design, true);
        }
      });
    });

    $$('.hd-plan-option').forEach(option => {
      option.addEventListener('click', () => choosePlan(option.dataset.plan, true));
      option.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choosePlan(option.dataset.plan, true);
        }
      });
    });
  }

  async function detectCurrentPlan(){
    const note = $('#hd-current-plan');
    try {
      const access = await getLiwAccessContext();
      if (!access?.user) return;
      state.isAdmin = Boolean(access.isAdmin && !access.isPlanPreview);
      state.currentPlan = state.isAdmin ? 'pro' : (access.planKey || 'starter');
      state.currentPlanName = state.isAdmin ? 'LIW Admin' : (access.planName || planData[state.currentPlan]?.name || state.currentPlan);
      if (!state.isAdmin && planData[state.currentPlan]) state.plan = state.currentPlan;

      if (note) {
        note.classList.add('show');
        note.innerHTML = state.isAdmin
          ? '<i data-lucide="shield-check" size="17"></i><span><strong>LIW Admin detected.</strong> Customer-facing prices are shown below so you can QA the actual buyer total.</span>'
          : `<i data-lucide="circle-check" size="17"></i><span><strong>Signed in:</strong> Your current ${safeText(state.currentPlanName)} plan is detected. Keep it selected to pay only for design.</span>`;
      }

      $$('.hd-plan-option').forEach(option => {
        option.querySelector('.hd-current-plan-tag')?.remove();
        if (!state.isAdmin && option.dataset.plan === state.currentPlan) {
          option.querySelector('.hd-plan-copy strong')?.insertAdjacentHTML('beforeend','<span class="hd-plan-tag hd-current-plan-tag">Current</span>');
        }
      });

      try {
        const savedDomain = sessionStorage.getItem('liw_designer_domain_query');
        if (savedDomain && $('#hd-domain-search-input')) {
          $('#hd-domain-search-input').value = savedDomain;
          sessionStorage.removeItem('liw_designer_domain_query');
        }
      } catch (_) {}

      window.lucide?.createIcons?.();
      updateSummary();
    } catch (error) {
      console.warn('Could not detect current plan', error);
    }
  }

  function validateDomainSelection(){
    if (state.domainMode === 'buy' && !state.domainName) {
      setDomainStatus('#hd-domain-status','error','Choose an available custom domain before continuing, or switch back to your included LIW card link.');
      goToStep(3, '#hd-domain-search-input');
      return false;
    }
    if (state.domainMode === 'own' && !state.domainName) {
      setDomainStatus('#hd-own-domain-status','error','Enter the domain you already own, or switch back to your included LIW card link.');
      goToStep(3, '#hd-own-domain-input');
      return false;
    }
    return true;
  }

  function showStagingCheckoutPreview(){
    if (!validateDomainSelection()) return;
    const design = designData();
    const plan = planData[state.plan];
    const planCharge = selectedPlanCharge();
    const domainCharge = selectedDomainCharge();
    const total = design.price + planCharge + domainCharge;
    const domainLabel = state.domainMode === 'buy'
      ? `${state.domainName} — ${centsMoney(state.domainPriceCents)}`
      : state.domainMode === 'own'
        ? `${state.domainName} — connect existing domain`
        : 'LIW card link — included';

    try {
      sessionStorage.setItem('liw_designer_order_preview', JSON.stringify({
        design: state.design,
        designName: design.name,
        designPrice: design.price,
        plan: state.plan,
        planName: plan.name,
        planPriceToday: planCharge,
        domainMode: state.domainMode,
        domainName: state.domainName || null,
        domainYears: state.domainYears,
        domainPriceToday: domainCharge,
        total,
        savedAt: Date.now()
      }));
    } catch (_) {}

    const overlay = $('#hd-checkout-preview');
    if (!overlay) {
      window.toast?.('Staging preview saved. Designer checkout will be connected before launch.');
      return;
    }
    setText('#hd-preview-design', `${design.name} — ${money(design.price)} one-time`);
    setText('#hd-preview-plan', `${plan.name} — ${planCharge === 0 ? '$0 today' : money(planCharge)}`);
    setText('#hd-preview-domain', domainLabel);
    setText('#hd-preview-total', money(total));
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    setFunnelStep(4);
  }

  function closePreview(){
    const overlay = $('#hd-checkout-preview');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  function wireCheckout(){
    const button = $('#hd-continue-checkout');
    const stagingNote = $('#hd-order-staging');
    if (stagingNote && typeof LIW_CONFIG !== 'undefined' && LIW_CONFIG.oneTimeServicesEnabled !== true) stagingNote.classList.add('show');

    button?.addEventListener('click', () => {
      if (!validateDomainSelection()) return;
      if (typeof LIW_CONFIG !== 'undefined' && LIW_CONFIG.oneTimeServicesEnabled === true && typeof checkoutOneTime === 'function') {
        try {
          sessionStorage.setItem('liw_designer_domain_selection', JSON.stringify({ mode: state.domainMode, name: state.domainName, years: state.domainYears, priceCents: state.domainPriceCents }));
        } catch (_) {}
        checkoutOneTime(`designer_${state.design}`, button, {
          successUrl: liwUrl(`dashboard.html?designer=success&plan=${encodeURIComponent(state.plan)}`),
          cancelUrl: location.href
        });
        return;
      }
      showStagingCheckoutPreview();
    });

    $('#hd-preview-close')?.addEventListener('click', closePreview);
    $('#hd-preview-done')?.addEventListener('click', closePreview);
    $('#hd-checkout-preview')?.addEventListener('click', event => { if (event.target.id === 'hd-checkout-preview') closePreview(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#hd-checkout-preview')?.hidden) closePreview(); });
  }

  function wireSmoothScroll(){
    $$('[data-scroll-to]').forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(link.dataset.scrollTo);
        if (!target) return;
        event.preventDefault();
        setFunnelStep(1);
        target.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
  }

  async function init(){
    buildProgress();
    buildDomainUi();
    wireSelections();
    wireCheckout();
    wireSmoothScroll();
    updateSummary();
    loadPhoneScreen();
    await Promise.all([loadSettings(), detectCurrentPlan()]);
    window.lucide?.createIcons?.();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();