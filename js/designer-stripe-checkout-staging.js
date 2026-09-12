(function wireDesignerStripeCheckout(){
  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  if (page !== 'hire-designer.html') return;

  const $ = selector => document.querySelector(selector);
  const cents = text => {
    const value = Number(String(text || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  };
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value || 0) / 100);
  const toastMessage = message => {
    if (typeof window.toast === 'function') window.toast(message);
    else window.alert(message);
  };

  function selectedDesign(){
    return $('.hd-service-card.selected')?.dataset.design || 'premium';
  }

  function selectedPlan(){
    return $('.hd-plan-option.selected')?.dataset.plan || 'plus';
  }

  function selectedDomain(){
    const mode = $('.hd-domain-choice.selected')?.dataset.domainMode || 'liw';
    const rawName = String($('#hd-order-domain-name')?.textContent || '').trim();
    const name = mode === 'liw' ? '' : rawName;
    const activeTerm = $('#hd-domain-terms button.active');
    const years = Math.max(1, Math.min(10, Number(activeTerm?.dataset.domainYears || 1)));
    const quotedPriceCents = mode === 'buy'
      ? Number(activeTerm?.dataset.domainTotal || cents($('#hd-order-domain-price')?.textContent))
      : 0;
    return { mode, name, years, quotedPriceCents };
  }

  function todayTotalCents(){
    return cents($('#hd-order-design-price')?.textContent) + cents($('#hd-order-plan-price')?.textContent);
  }

  function syncDeferredDomainDisplay(){
    const mode = $('.hd-domain-choice.selected')?.dataset.domainMode || 'liw';
    const domainName = String($('#hd-order-domain-name')?.textContent || '').trim();
    const priceNode = $('#hd-order-domain-price');
    const metaNode = $('#hd-order-domain-meta');
    const totalNode = $('#hd-order-total');
    const renewalNode = $('#hd-order-renewal');
    const termCopy = $('#hd-domain-term-copy');
    const total = todayTotalCents();

    if (totalNode && totalNode.textContent !== money(total)) totalNode.textContent = money(total);

    if (mode === 'buy') {
      const domain = selectedDomain();
      if (priceNode && priceNode.textContent !== 'Billed separately') priceNode.textContent = 'Billed separately';
      if (metaNode && domainName && !/charged separately/i.test(metaNode.textContent || '')) {
        metaNode.textContent = `${domain.years} year${domain.years === 1 ? '' : 's'} selected · domain charged separately after card setup`;
      }
      if (termCopy && domainName) {
        const copy = `${domainName} · ${domain.years} year${domain.years === 1 ? '' : 's'} · current quote ${money(domain.quotedPriceCents)} · billed separately`;
        if (termCopy.textContent !== copy) termCopy.textContent = copy;
      }
      if (renewalNode && domainName && !/not included in today/i.test(renewalNode.textContent || '')) {
        renewalNode.textContent = `${renewalNode.textContent.replace(/\s+[^.]+is selected for[^.]+\./i, '').trim()} ${domainName} is saved with your project. Domain registration is not included in today’s Stripe charge; LIW will confirm owner details and the current price before a separate secure domain checkout.`.trim();
      }
    }

    const staging = $('#hd-order-staging');
    if (staging) {
      staging.classList.remove('show');
      staging.hidden = true;
    }
  }

  let syncing = false;
  function scheduleSync(){
    if (syncing) return;
    syncing = true;
    requestAnimationFrame(() => {
      syncing = false;
      syncDeferredDomainDisplay();
    });
  }

  async function openDesignerCheckout(button){
    const { data: { session } } = await supabaseClient.auth.getSession();
    const selection = {
      designKey: selectedDesign(),
      planKey: selectedPlan(),
      domain: selectedDomain(),
      savedAt: Date.now()
    };

    try { sessionStorage.setItem('liw_designer_checkout_selection', JSON.stringify(selection)); } catch (_) {}

    if (!session?.access_token) {
      try { sessionStorage.setItem('liw_cards_after_login', 'hire-designer'); } catch (_) {}
      location.href = liwUrl('login.html?next=hire-designer');
      return;
    }

    const access = await getLiwAccessContext(session.user, { refresh:true }).catch(() => null);
    if (access?.isPlanPreview) return toastMessage('Plan Simulator is preview-only. No designer order or charge was created.');
    if (access?.isAdmin && !access?.isPlanPreview) return toastMessage('Use the QA order button in Designer Orders to test the full workflow without charging the LIW admin account.');

    const original = button?.innerHTML || '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="button-spinner"></span>Opening secure Stripe checkout…';
    }

    try {
      const checkoutId = crypto.randomUUID();
      const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/create-designer-checkout`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${session.access_token}`,
          'apikey':LIW_CONFIG.supabaseKey
        },
        body:JSON.stringify({
          ...selection,
          checkoutId,
          successUrl: liwUrl('designer-intake.html?session_id={CHECKOUT_SESSION_ID}'),
          cancelUrl: location.href
        })
      });
      const raw = await response.text();
      let payload = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch (_) { payload = { error: raw.slice(0,300) }; }
      if (!response.ok) throw new Error(payload.error || 'Unable to open designer checkout.');
      if (!payload.url) throw new Error('Stripe did not return a checkout URL.');
      location.href = payload.url;
    } catch (error) {
      toastMessage(typeof friendlyBillingError === 'function' ? friendlyBillingError(error?.message) : (error?.message || 'Unable to open checkout.'));
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  function mount(){
    const button = $('#hd-continue-checkout');
    if (!button || button.dataset.designerStripeWired === 'true') return;
    button.dataset.designerStripeWired = 'true';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDesignerCheckout(button);
    }, true);

    const observer = new MutationObserver(scheduleSync);
    const orderCard = $('.hd-order-card');
    if (orderCard) observer.observe(orderCard, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest('.hd-service-card,.hd-plan-option,.hd-domain-choice,.hd-domain-result,[data-domain-years],#hd-own-domain-button')) setTimeout(scheduleSync, 0);
    }, true);
    scheduleSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();