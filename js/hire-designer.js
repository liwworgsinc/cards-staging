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
    isAdmin: false
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
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function designData(key = state.design){
    if (key === 'setup') return { name: state.settings.cardSetupName, price: number(state.settings.cardSetupPrice, 49) };
    if (key === 'team') return { name: state.settings.teamName, price: number(state.settings.teamPrice, 199) };
    return { name: state.settings.premiumName, price: number(state.settings.premiumPrice, 99) };
  }

  function currentPlanAlreadyOwned(planKey){
    if (state.isAdmin) return true;
    return Boolean(state.currentPlan && state.currentPlan === planKey && state.currentPlan !== 'starter');
  }

  function selectedPlanCharge(){
    const plan = planData[state.plan] || planData.plus;
    return currentPlanAlreadyOwned(state.plan) ? 0 : plan.price;
  }

  function setText(selector, value){
    const node = $(selector);
    if (node && value != null && String(value).trim()) node.textContent = String(value).trim();
  }

  function applySettings(content){
    state.settings = { ...defaults, ...(content || {}) };
    setText('#hd-hero-title', state.settings.heroTitle);
    setText('#hd-hero-copy', state.settings.heroCopy);
    setText('[data-turnaround]', state.settings.turnaround);
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
      const { data, error } = await supabaseClient
        .from('designer_page_settings')
        .select('content')
        .eq('id', 'main')
        .maybeSingle();
      if (error) throw error;
      applySettings(data?.content || defaults);
    } catch (error) {
      console.warn('Using Hire a Designer defaults:', error);
      applySettings(defaults);
    }
  }

  async function loadPhoneScreen(){
    const image = $('#designer-card-screen');
    const loading = $('#designer-card-loading');
    if (!image) return;
    try {
      const response = await fetch('assets/designer-card-screen.b64?v=20260829-1', { cache: 'force-cache' });
      if (!response.ok) throw new Error('Card screen asset unavailable');
      const base64 = (await response.text()).trim();
      image.addEventListener('load', () => {
        image.hidden = false;
        if (loading) loading.hidden = true;
      }, { once: true });
      image.src = `data:image/webp;base64,${base64}`;
    } catch (error) {
      console.warn(error);
      if (loading) loading.textContent = 'LIW Card preview';
    }
  }

  function markSelections(){
    $$('.hd-service-card').forEach(card => {
      const selected = card.dataset.design === state.design;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      const button = card.querySelector('.hd-choose-service');
      if (button) button.textContent = selected ? 'Selected' : 'Choose this service';
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
    const total = design.price + planCharge;

    setText('#hd-order-design-name', design.name);
    setText('#hd-order-design-price', `${money(design.price)} one-time`);
    setText('#hd-order-plan-name', currentPlanAlreadyOwned(state.plan) ? `${plan.name} · current plan` : `${plan.name} plan`);
    setText('#hd-order-plan-price', planCharge === 0 ? '$0 today' : money(planCharge));
    setText('#hd-order-total', money(total));

    const renewal = $('#hd-order-renewal');
    if (renewal) {
      if (state.isAdmin) renewal.textContent = 'LIW Admin accounts do not need a customer subscription. This order summary is for staging QA only.';
      else if (currentPlanAlreadyOwned(state.plan)) renewal.textContent = `You already have ${plan.name}. Your existing subscription continues on its current billing schedule.`;
      else if (state.plan === 'starter') renewal.textContent = 'The design service is a one-time fee. The Free plan has no recurring subscription charge.';
      else renewal.textContent = `Today includes the selected design service and ${plan.name}. The plan renews at ${plan.renewal} unless canceled.`;
    }

    markSelections();
  }

  function chooseDesign(key){
    if (!['setup', 'premium', 'team'].includes(key)) return;
    state.design = key;
    updateSummary();
  }

  function choosePlan(key){
    if (!planData[key]) return;
    state.plan = key;
    updateSummary();
  }

  function wireSelections(){
    $$('.hd-service-card').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('a')) return;
        chooseDesign(card.dataset.design);
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          chooseDesign(card.dataset.design);
        }
      });
    });
    $$('.hd-plan-option').forEach(option => {
      option.addEventListener('click', () => choosePlan(option.dataset.plan));
      option.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choosePlan(option.dataset.plan);
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
      state.currentPlanName = state.isAdmin ? 'LIW Admin' : (access.planName || planData[state.currentPlan]?.name || titleCase(state.currentPlan));

      if (!state.isAdmin && planData[state.currentPlan]) state.plan = state.currentPlan;
      if (note) {
        note.classList.add('show');
        note.innerHTML = state.isAdmin
          ? '<i data-lucide="shield-check" size="17"></i><span><strong>LIW Admin detected.</strong> No customer plan purchase is required; you can still test any combination below.</span>'
          : `<i data-lucide="circle-check" size="17"></i><span><strong>Signed in:</strong> Your current ${escapeHtml(state.currentPlanName)} plan is detected. Keep it selected to pay only for design.</span>`;
      }

      $$('.hd-plan-option').forEach(option => {
        const existing = option.querySelector('.hd-current-plan-tag');
        if (existing) existing.remove();
        if (!state.isAdmin && option.dataset.plan === state.currentPlan) {
          const copy = option.querySelector('.hd-plan-copy strong');
          if (copy) copy.insertAdjacentHTML('beforeend', '<span class="hd-plan-tag hd-current-plan-tag">Current</span>');
        }
      });
      window.lucide?.createIcons?.();
      updateSummary();
    } catch (error) {
      console.warn('Could not detect current plan', error);
    }
  }

  function showStagingCheckoutPreview(){
    const design = designData();
    const plan = planData[state.plan];
    const planCharge = selectedPlanCharge();
    const total = design.price + planCharge;
    try {
      sessionStorage.setItem('liw_designer_order_preview', JSON.stringify({
        design: state.design,
        designName: design.name,
        designPrice: design.price,
        plan: state.plan,
        planName: plan.name,
        planPriceToday: planCharge,
        total,
        savedAt: Date.now()
      }));
    } catch (_) {}

    const overlay = $('#hd-checkout-preview');
    if (!overlay) {
      toast('Staging preview saved. Designer checkout will be connected before launch.');
      return;
    }
    setText('#hd-preview-design', `${design.name} — ${money(design.price)} one-time`);
    setText('#hd-preview-plan', `${plan.name} — ${planCharge === 0 ? '$0 today' : money(planCharge)}`);
    setText('#hd-preview-total', money(total));
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
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
      if (typeof LIW_CONFIG !== 'undefined' && LIW_CONFIG.oneTimeServicesEnabled === true) {
        // Keep the combined selection saved. The one-time service endpoint will become
        // the handoff point once designer service Stripe prices are approved.
        const design = designData();
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
    $('#hd-checkout-preview')?.addEventListener('click', event => {
      if (event.target.id === 'hd-checkout-preview') closePreview();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('#hd-checkout-preview')?.hidden) closePreview();
    });
  }

  function wireSmoothScroll(){
    $$('[data-scroll-to]').forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(link.dataset.scrollTo);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  async function init(){
    wireSelections();
    wireCheckout();
    wireSmoothScroll();
    updateSummary();
    await Promise.all([loadSettings(), loadPhoneScreen(), detectCurrentPlan()]);
    window.lucide?.createIcons?.();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
