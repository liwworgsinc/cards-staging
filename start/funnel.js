(() => {
  const FUNNEL_KEY = 'liw_cards_signup_funnel_v1';
  const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';
  const PENDING_PLAN_KEY = 'liw_cards_pending_plan';
  const AFTER_LOGIN_KEY = 'liw_cards_after_login';
  const GUEST_PENDING_KEY = 'liw_guest_signup_pending';

  const appUrl = path => typeof window.liwUrl === 'function' ? window.liwUrl(path) : `../${path}`;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const industries = {
    realtor: { label: 'Real Estate', role: 'Real Estate Professional', cover: '../assets/covers/city-glass.svg', accent: '#2f6fed', accent2: '#63a4ff', action: 'View Properties', initials: 'RE', headline: 'Make every listing easier to explore.' },
    restaurant: { label: 'Restaurant', role: 'Restaurant', cover: '../assets/covers/warm-studio.svg', accent: '#b74c2d', accent2: '#f39b51', action: 'See Menu', initials: 'RT', headline: 'Give customers a faster way to discover your menu.' },
    barber: { label: 'Barber / Hair', role: 'Barber / Hair Professional', cover: '../assets/covers/luxury-marble.svg', accent: '#1f2937', accent2: '#667085', action: 'Book Now', initials: 'BH', headline: 'Turn every share into a polished client experience.' },
    beauty: { label: 'Nails / Beauty', role: 'Beauty Professional', cover: '../assets/covers/soft-arches.svg', accent: '#d63e9a', accent2: '#ff79c3', action: 'Book Now', initials: 'NB', headline: 'Show your work and make the next step easy.' },
    tattoo: { label: 'Tattoo', role: 'Tattoo Artist', cover: '../assets/covers/emerald-wave.svg', accent: '#202633', accent2: '#546477', action: 'View Portfolio', initials: 'TA', headline: 'Put your work, contact info and next step in one place.' },
    artist: { label: 'Music / Artist', role: 'Artist / Creator', cover: '../assets/showtime-dj-example.svg', accent: '#7138d8', accent2: '#d34aa4', action: 'Explore Media', initials: 'MA', headline: 'Give fans and bookers one place to experience your work.' },
    tax: { label: 'Tax / Business', role: 'Business Services', cover: '../assets/covers/blueprint-lines.svg', accent: '#174ea6', accent2: '#3f7fe5', action: 'Get In Touch', initials: 'TB', headline: 'Make your services feel established and easy to reach.' },
    construction: { label: 'Construction', role: 'Contractor / Construction', cover: '../assets/covers/blueprint-lines.svg', accent: '#8d5b24', accent2: '#d6a04d', action: 'Request A Quote', initials: 'CO', headline: 'Show your work and make it easier to start a conversation.' },
    other: { label: 'Other', role: 'Business Professional', cover: '../assets/covers/emerald-wave.svg', accent: '#2d5c55', accent2: '#55a598', action: 'Connect', initials: 'LI', headline: 'One place for your business, your links and your next step.' }
  };

  const goals = [
    { key: 'bookings', label: 'Get Bookings', icon: 'calendar-check', value: 'Accept bookings', level: 'plus' },
    { key: 'calls', label: 'Get Calls', icon: 'phone', value: 'Make it easy to call you', level: 'lite' },
    { key: 'leads', label: 'Get Leads', icon: 'inbox', value: 'Capture customer interest', level: 'plus' },
    { key: 'portfolio', label: 'Show My Work', icon: 'image', value: 'Show your work professionally', level: 'plus' },
    { key: 'promote', label: 'Promote My Business', icon: 'megaphone', value: 'Share your business instantly', level: 'lite' },
    { key: 'products', label: 'Sell Products', icon: 'shopping-bag', value: 'Present products and offers', level: 'plus' },
    { key: 'menu', label: 'Share My Menu', icon: 'utensils', value: 'Put your menu within one tap', level: 'plus' },
    { key: 'music', label: 'Promote Shows / Music', icon: 'music-2', value: 'Promote shows and media', level: 'plus' },
    { key: 'online', label: 'Get Found Online', icon: 'search', value: 'Strengthen your online presence', level: 'pro' },
    { key: 'everything', label: 'Everything', icon: 'sparkles', value: 'Build the complete business experience', level: 'pro' }
  ];

  const plans = {
    pro: {
      name: 'Pro', price: '$99', suffix: '/year', trial: 'Eligible first-time annual customers can start with a 7-day trial.', meter: '100%',
      summary: 'For growing businesses that want deeper insights, more cards, stronger sharing, exports and team workflows.',
      features: ['Up to 10 published cards', 'Everything in Plus + Flow', 'Advanced analytics', 'Custom QR colors + center logo', 'Custom SEO title + description', 'Lead export to CSV', 'Up to 12 products + 10 downloads per card', '1 additional team member + priority support']
    },
    plus: {
      name: 'Plus', price: '$49', suffix: '/year', trial: 'Eligible first-time annual customers can start with a 7-day trial. $5.99/month is also available with no trial.', meter: '72%',
      summary: 'For professionals who need everyday business tools, stronger branding, leads, booking and richer card experiences.',
      features: ['Up to 3 published cards', 'Premium templates + expanded fonts', 'Realtor experience included', 'Leads, booking + payment sharing', 'Up to 4 products + 3 downloads per card', 'Standard engagement analytics', 'Remove LIW branding', 'Email Signature copy + HTML export']
    },
    lite: {
      name: 'Lite', price: '$24', suffix: '/year', trial: '$2.49/month is also available. Lite has no free trial.', meter: '43%', stagingDisabled: true,
      summary: 'For one polished card with stronger visual tools while keeping the setup simple.',
      features: ['1 published card', 'Classic + Showtime', 'Cover image included', 'Social + payment links', 'Contact saving + QR code', 'Basic views', 'Core templates', 'Email Signature design + preview']
    }
  };

  const state = {
    stage: 0,
    industry: '',
    businessName: '',
    goals: [],
    selectedPlan: 'pro',
    recommendedPlan: 'pro',
    source: new URLSearchParams(location.search).get('source') || new URLSearchParams(location.search).get('from') || 'direct'
  };

  function emit(eventName, detail = {}) {
    const payload = { event: eventName, source: state.source, business_type: state.industry || null, goals: [...state.goals], recommended_plan: state.recommendedPlan || null, selected_plan: state.selectedPlan || null, ...detail };
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(payload); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('liw:funnel', { detail: payload })); } catch (_) {}
  }

  function persist() {
    try { localStorage.setItem(FUNNEL_KEY, JSON.stringify({ ...state, savedAt: Date.now() })); } catch (_) {}
  }

  function restore() {
    try {
      const raw = localStorage.getItem(FUNNEL_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || Date.now() - Number(saved.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) return;
      state.industry = industries[saved.industry] ? saved.industry : state.industry;
      state.businessName = String(saved.businessName || '').slice(0, 80);
      state.goals = Array.isArray(saved.goals) ? saved.goals.filter(key => goals.some(goal => goal.key === key)) : [];
      state.selectedPlan = plans[saved.selectedPlan] ? saved.selectedPlan : state.selectedPlan;
      state.recommendedPlan = plans[saved.recommendedPlan] ? saved.recommendedPlan : state.recommendedPlan;
    } catch (_) {}
  }

  function status(message) {
    const box = $('#funnel-status');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(status.timer);
    status.timer = setTimeout(() => box.classList.remove('show'), 1650);
  }

  function setStage(next, eventName = '') {
    const safe = Math.max(0, Math.min(7, Number(next) || 0));
    $$('.stage').forEach(stage => stage.classList.toggle('is-active', Number(stage.dataset.stage) === safe));
    state.stage = safe;
    $('#progress-bar').style.width = `${safe === 0 ? 0 : Math.round((safe / 7) * 100)}%`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persist();
    if (eventName) emit(eventName);
    if (window.lucide) lucide.createIcons();
  }

  function initials(value) {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join('') || industries[state.industry]?.initials || 'LI').toUpperCase();
  }

  function currentIndustry() {
    return industries[state.industry] || industries.barber;
  }

  function activeActionLabels(plan = state.selectedPlan) {
    const labels = ['Call', 'Save', 'Share'];
    if (state.goals.includes('bookings') && ['plus', 'pro'].includes(plan)) labels.splice(1, 0, 'Book');
    else if (state.goals.includes('portfolio')) labels.splice(1, 0, 'Gallery');
    else labels.splice(1, 0, 'Website');
    return labels.slice(0, 4);
  }

  const actionIcons = { Call: 'phone', Save: 'user-round-plus', Share: 'share-2', Book: 'calendar-days', Gallery: 'image', Website: 'globe' };

  function phoneMarkup(plan = state.selectedPlan) {
    const industry = currentIndustry();
    const name = state.businessName || 'Your Business';
    const labels = activeActionLabels(plan);
    const primary = state.goals.includes('bookings') && ['plus', 'pro'].includes(plan) ? 'Book Now' : industry.action;
    const planLabel = plan === 'pro' ? 'PRO EXPERIENCE' : plan === 'plus' ? 'PLUS EXPERIENCE' : plan === 'lite' ? 'LITE EXPERIENCE' : 'FREE EXPERIENCE';
    return `
      <div class="phone-wrap" style="--preview-accent:${industry.accent};--preview-accent2:${industry.accent2}">
        <div class="phone-glow"></div>
        <div class="phone-shell">
          <div class="phone-notch"></div>
          <article class="live-card">
            <div class="live-cover" style="background-image:linear-gradient(to bottom,rgba(7,10,17,.02),rgba(8,12,22,.28)),url('${industry.cover}')"></div>
            <div class="live-overlay"></div>
            <div class="live-content">
              <div class="live-avatar"><span>${initials(name)}</span></div>
              <p class="live-kicker">${planLabel} · ${industry.label.toUpperCase()}</p>
              <h2>${escapeHtml(name)}</h2>
              <p class="live-role">${escapeHtml(industry.role)}</p>
              <div class="live-actions">${labels.map(label => `<span><i data-lucide="${actionIcons[label] || 'circle'}"></i><small>${label}</small></span>`).join('')}</div>
              <button class="card-primary" type="button">${escapeHtml(primary)} <i data-lucide="arrow-right"></i></button>
              <div class="mini-gallery"><span></span><span></span><span></span></div>
            </div>
          </article>
        </div>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function renderPhoneSlots(plan = state.selectedPlan) {
    ['#preview-name-card', '#preview-aha-card', '#preview-value-card', '#preview-plan-card', '#preview-free-card'].forEach(selector => {
      const target = $(selector);
      if (!target) return;
      const usePlan = selector === '#preview-free-card' ? 'starter' : plan;
      target.innerHTML = phoneMarkup(usePlan);
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderIndustries() {
    const grid = $('#industry-grid');
    if (!grid) return;
    grid.innerHTML = Object.entries(industries).map(([key, item]) => `
      <button class="industry-option ${state.industry === key ? 'is-selected' : ''}" type="button" data-industry="${key}" aria-pressed="${state.industry === key}">
        <div class="industry-art" style="background-image:linear-gradient(135deg,${item.accent}33,${item.accent2}22),url('${item.cover}')"></div>
        <div class="industry-label"><span>${item.label}</span><i data-lucide="circle-check"></i></div>
      </button>`).join('');
    $('#industry-next').disabled = !state.industry;
    if (window.lucide) lucide.createIcons();
  }

  function renderGoals() {
    const grid = $('#goal-grid');
    if (!grid) return;
    grid.innerHTML = goals.map(goal => `
      <button class="goal-option ${state.goals.includes(goal.key) ? 'is-selected' : ''}" type="button" data-goal="${goal.key}" aria-pressed="${state.goals.includes(goal.key)}">
        <span class="goal-icon"><i data-lucide="${goal.icon}"></i></span><span>${goal.label}</span>
      </button>`).join('');
    $('#goals-next').disabled = !state.goals.length;
    if (window.lucide) lucide.createIcons();
  }

  function recommendation() {
    if (state.goals.includes('everything') || state.goals.includes('online') || state.goals.length >= 4) return 'pro';
    if (state.goals.some(key => ['bookings', 'leads', 'portfolio', 'products', 'menu', 'music'].includes(key))) return 'plus';
    return 'lite';
  }

  function recommendationReason(plan) {
    const labels = state.goals.filter(key => key !== 'everything').slice(0, 3).map(key => goals.find(goal => goal.key === key)?.label.toLowerCase()).filter(Boolean);
    const joined = labels.length ? labels.join(' + ') : 'your selected goals';
    if (plan === 'pro') return `Because you selected ${joined}, Pro gives ${state.businessName || 'your business'} the deepest growth setup.`;
    if (plan === 'plus') return `Because you selected ${joined}, Plus gives ${state.businessName || 'your business'} the everyday business tools that match those goals.`;
    return `Because your goals are focused on a polished, simple card, Lite is the closest paid fit.`;
  }

  function renderValue() {
    $('#value-business').textContent = state.businessName || 'your business';
    const list = $('#value-list');
    const selected = state.goals.includes('everything') ? goals.filter(goal => goal.key !== 'everything').slice(0, 5) : state.goals.map(key => goals.find(goal => goal.key === key)).filter(Boolean).slice(0, 5);
    const fallbacks = [
      { icon: 'qr-code', value: 'Share instantly with a QR code' },
      { icon: 'user-round-plus', value: 'Make your contact information easy to save' },
      { icon: 'refresh-cw', value: 'Keep your information updated without reprinting' }
    ];
    const rows = selected.length ? selected : fallbacks;
    list.innerHTML = rows.map(item => `<div class="value-item"><span><i data-lucide="${item.icon || 'check'}"></i></span>${escapeHtml(item.value)}</div>`).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderPlans() {
    state.recommendedPlan = recommendation();
    if (!plans[state.selectedPlan]) state.selectedPlan = state.recommendedPlan;
    if (state.stage === 6 && !state.planTouched) state.selectedPlan = state.recommendedPlan;
    $('#recommendation-copy').textContent = recommendationReason(state.recommendedPlan);
    $$('[data-plan-tab]').forEach(button => {
      const key = button.dataset.planTab;
      button.classList.toggle('is-active', key === state.selectedPlan);
      button.classList.toggle('is-recommended', key === state.recommendedPlan);
      button.setAttribute('aria-selected', key === state.selectedPlan ? 'true' : 'false');
    });
    const plan = plans[state.selectedPlan];
    $('#plan-detail').innerHTML = `
      <div class="plan-price"><strong>${plan.price}</strong><span>${plan.suffix}</span></div>
      <span class="plan-trial">${escapeHtml(plan.trial)}</span>
      <p>${escapeHtml(plan.summary)}</p>
      <ul class="plan-features">${plan.features.map(feature => `<li><i data-lucide="check"></i><span>${escapeHtml(feature)}</span></li>`).join('')}</ul>`;
    $('#plan-meter-fill').style.width = plan.meter;
    const button = $('#paid-continue');
    button.disabled = Boolean(plan.stagingDisabled);
    button.innerHTML = plan.stagingDisabled ? `Lite checkout after staging QA` : `Continue With ${plan.name} <i data-lucide="arrow-right"></i>`;
    renderPhoneSlots(state.selectedPlan);
    persist();
    if (window.lucide) lucide.createIcons();
  }

  function buildDraft() {
    const industry = currentIndustry();
    const name = state.businessName || 'My Business';
    return {
      version: 1,
      cardId: null,
      savedAt: Date.now(),
      funnel: { industry: state.industry, goals: [...state.goals], recommended_plan: state.recommendedPlan, selected_plan: state.selectedPlan, source: state.source },
      card: {
        full_name: name,
        company_name: name,
        job_title: industry.role,
        headline: industry.headline,
        biography: '',
        phone: '', sms_phone: '', email: '', website: '',
        primary_color: industry.accent,
        secondary_color: industry.accent2,
        background_color: '#ffffff', text_color: '#111827',
        button_color: industry.accent, button_text_color: '#ffffff',
        font_family: 'DM Sans', button_style: 'filled', profile_image_shape: 'circle',
        profile_position_x: '50', profile_position_y: '22', profile_zoom: '125', border_radius: '16',
        card_layout: 'classic', card_experience: state.industry === 'artist' ? 'showtime' : 'classic',
        gradient_background: `linear-gradient(135deg,${industry.accent},${industry.accent2})`,
        color_mode: 'light', branding_mode: 'liw', custom_branding_text: '', custom_branding_url: '', slug: '', template_id: '',
        profile_image_url: '', cover_image_url: '', cover_position: 'center', cover_overlay: '24',
        services_enabled: false, products_enabled: false, booking_enabled: false, lead_form_enabled: false, payment_sharing_enabled: false,
        social_button_style: 'brand', social_button_size: 'small', qr_foreground_color: '#000000', qr_background_color: '#FFFFFF', qr_logo_url: '', status: 'draft', show_branding: true
      },
      profileUrl: '', coverUrl: '', socialLinks: [], services: [], products: []
    };
  }

  function saveDraft() {
    try { localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(buildDraft())); } catch (_) {}
  }

  function claimDraftForUser(user) {
    if (!user?.id) return false;
    try {
      const draft = buildDraft();
      localStorage.setItem(`liw_editor_draft_${user.id}_new`, JSON.stringify(draft));
      localStorage.removeItem(GUEST_DRAFT_KEY);
      sessionStorage.removeItem(GUEST_PENDING_KEY);
      sessionStorage.setItem('liw_guest_claim_ready', '1');
      return true;
    } catch (_) { return false; }
  }

  function rememberPaidPlan(plan) {
    try {
      sessionStorage.setItem(AFTER_LOGIN_KEY, 'pricing');
      sessionStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({ plan, interval: 'year', savedAt: Date.now(), source: 'interactive-funnel' }));
      sessionStorage.setItem(GUEST_PENDING_KEY, '1');
    } catch (_) {}
  }

  async function continuePaid() {
    const plan = state.selectedPlan;
    if (!plans[plan] || plans[plan].stagingDisabled) return;
    state.recommendedPlan = recommendation();
    saveDraft();
    rememberPaidPlan(plan);
    persist();
    emit('plan_selected', { selected_plan: plan, billing_interval: 'year' });
    emit('checkout_started', { selected_plan: plan, billing_interval: 'year' });
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (data?.session?.user) {
        claimDraftForUser(data.session.user);
        location.href = appUrl(`pricing.html?resume_plan=${encodeURIComponent(plan)}&interval=year&from=funnel`);
        return;
      }
    } catch (_) {}
    location.href = appUrl(`register.html?guest=1&next=pricing&plan=${encodeURIComponent(plan)}&from=funnel`);
  }

  async function continueFree() {
    state.selectedPlan = 'starter';
    saveDraft();
    persist();
    emit('free_selected', { selected_plan: 'starter' });
    try {
      sessionStorage.removeItem(PENDING_PLAN_KEY);
      sessionStorage.removeItem(AFTER_LOGIN_KEY);
      sessionStorage.setItem(GUEST_PENDING_KEY, '1');
      const { data } = await window.supabaseClient.auth.getSession();
      if (data?.session?.user && claimDraftForUser(data.session.user)) {
        location.href = appUrl('editor.html?welcome=1&guest_claim=1&from=funnel');
        return;
      }
    } catch (_) {}
    emit('signup_started', { selected_plan: 'starter' });
    location.href = appUrl('register.html?guest=1&from=funnel&plan=starter');
  }

  function animateHeroExamples() {
    const card = $('#hero-card');
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const examples = [
      ['J&B Studio', 'BARBER / HAIR', 'Cuts · Fades · Bookings', 'Book Now', '../assets/covers/luxury-marble.svg'],
      ['North & Key Realty', 'REAL ESTATE', 'Listings · Showings · Contact', 'View Properties', '../assets/covers/city-glass.svg'],
      ['Table Eight', 'RESTAURANT', 'Menu · Reservations · Specials', 'See Menu', '../assets/covers/warm-studio.svg'],
      ['Nova Rose', 'MUSIC / ARTIST', 'Music · Shows · Media', 'Explore Media', '../assets/showtime-dj-example.svg']
    ];
    let index = 0;
    setInterval(() => {
      if (state.stage !== 0) return;
      index = (index + 1) % examples.length;
      const [name, kicker, role, action, cover] = examples[index];
      card.style.opacity = '.28';
      card.style.transform = 'scale(.985)';
      setTimeout(() => {
        card.querySelector('.live-cover').style.backgroundImage = `linear-gradient(to bottom,rgba(7,10,17,.02),rgba(8,12,22,.28)),url('${cover}')`;
        card.querySelector('.live-kicker').textContent = kicker;
        card.querySelector('h2').textContent = name;
        card.querySelector('.live-role').textContent = role;
        card.querySelector('.live-avatar span').textContent = initials(name);
        card.querySelector('.card-primary').childNodes[0].nodeValue = `${action} `;
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, 230);
    }, 3200);
  }

  function initQueryPreset() {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('type') || '').trim().toLowerCase();
    const aliases = { realestate: 'realtor', real_estate: 'realtor', restaurant: 'restaurant', barber: 'barber', hair: 'barber', nails: 'beauty', beauty: 'beauty', tattoo: 'tattoo', artist: 'artist', music: 'artist', tax: 'tax', business: 'tax', construction: 'construction', contractor: 'construction' };
    const key = industries[raw] ? raw : aliases[raw];
    if (key) state.industry = key;
  }

  function bind() {
    $('[data-action="begin"]')?.addEventListener('click', () => setStage(1, 'build_card_clicked'));
    $('[data-action="peek"]')?.addEventListener('click', () => {
      status('Scan. Save. Book. Share. Your business stays one tap away.');
      $('#hero-phone-wrap')?.classList.add('demo-pulse');
      setTimeout(() => $('#hero-phone-wrap')?.classList.remove('demo-pulse'), 600);
      emit('preview_interaction', { interaction: 'hero_peek' });
    });
    $('#exit-funnel')?.addEventListener('click', () => location.href = appUrl('index.html'));

    $('#industry-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-industry]');
      if (!button) return;
      state.industry = button.dataset.industry;
      state.businessName = state.businessName || '';
      renderIndustries();
      renderPhoneSlots();
      persist();
      emit('business_type_selected');
    });
    $('#industry-next')?.addEventListener('click', () => setStage(2));

    $('#business-name')?.addEventListener('input', event => {
      state.businessName = event.target.value.trimStart().slice(0, 80);
      $('#name-next').disabled = !state.businessName.trim();
      renderPhoneSlots();
      persist();
    });
    $('#business-name')?.addEventListener('change', () => { if (state.businessName.trim()) emit('business_name_entered'); });
    $('#name-next')?.addEventListener('click', () => setStage(3));

    $('#goal-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-goal]');
      if (!button) return;
      const key = button.dataset.goal;
      if (key === 'everything') {
        state.goals = state.goals.includes('everything') ? [] : ['everything'];
      } else {
        state.goals = state.goals.filter(item => item !== 'everything');
        state.goals = state.goals.includes(key) ? state.goals.filter(item => item !== key) : [...state.goals, key];
      }
      renderGoals();
      renderPhoneSlots();
      persist();
      emit('goal_selected', { goal: key, selected: state.goals.includes(key) });
    });
    $('#goals-next')?.addEventListener('click', () => { state.recommendedPlan = recommendation(); renderPhoneSlots(state.recommendedPlan); setStage(4); });

    $$('[data-demo]').forEach(button => button.addEventListener('click', () => {
      const interaction = button.dataset.demo;
      const messages = { scan: 'QR opens your card instantly', book: state.goals.includes('bookings') ? 'Booking is ready on paid business plans' : 'Booking can be added when you need it', save: 'Contact save is included', share: 'Share from anywhere' };
      const toast = $('#demo-toast');
      toast.textContent = messages[interaction] || 'Interactive preview';
      toast.classList.add('show');
      $('.aha-phone')?.classList.add('demo-pulse');
      setTimeout(() => { toast.classList.remove('show'); $('.aha-phone')?.classList.remove('demo-pulse'); }, 1250);
      emit('preview_interaction', { interaction });
    }));
    $('[data-action="aha-next"]')?.addEventListener('click', () => { renderValue(); setStage(5); });
    $('[data-action="plans"]')?.addEventListener('click', () => { state.planTouched = false; renderPlans(); emit('pricing_viewed'); emit('plan_recommended', { recommended_plan: state.recommendedPlan }); setStage(6); });

    $$('.plan-tabs [data-plan-tab]').forEach(button => button.addEventListener('click', () => {
      state.planTouched = true;
      state.selectedPlan = button.dataset.planTab;
      renderPlans();
    }));
    $('#paid-continue')?.addEventListener('click', continuePaid);
    $('[data-action="free-last"]')?.addEventListener('click', () => setStage(7));
    $('[data-action="back-paid"]')?.addEventListener('click', () => { state.selectedPlan = state.recommendedPlan; state.planTouched = false; renderPlans(); setStage(6); });
    $('#free-continue')?.addEventListener('click', continueFree);

    $('#sign-in-link')?.addEventListener('click', () => {
      if (state.businessName) {
        saveDraft();
        try { sessionStorage.setItem(GUEST_PENDING_KEY, '1'); sessionStorage.setItem(AFTER_LOGIN_KEY, 'guest-editor'); } catch (_) {}
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (state.stage > 0) setStage(Math.max(0, state.stage - 1));
    });
  }

  restore();
  initQueryPreset();
  renderIndustries();
  renderGoals();
  if (state.businessName) {
    $('#business-name').value = state.businessName;
    $('#name-next').disabled = false;
  }
  state.recommendedPlan = recommendation();
  state.selectedPlan = state.recommendedPlan;
  renderPhoneSlots(state.selectedPlan);
  renderValue();
  renderPlans();
  bind();
  setStage(0);
  emit('funnel_view');
  animateHeroExamples();
  if (window.lucide) lucide.createIcons();
})();