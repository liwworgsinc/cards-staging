(() => {
  'use strict';

  if (window.__LIW_DOMAIN_ENTRYPOINTS__) return;
  window.__LIW_DOMAIN_ENTRYPOINTS__ = true;

  const VERSION = '20260829-domain-entrypoints-1';
  const params = new URLSearchParams(location.search);
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const requestedCardId = String(params.get('card') || '').trim();

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function domainHref(mode = 'buy', cardId = requestedCardId, from = '') {
    const next = new URL('domains.html', location.href);
    if (cardId) next.searchParams.set('card', cardId);
    if (mode === 'connect') next.searchParams.set('mode', 'connect');
    if (from) next.searchParams.set('from', from);
    return `${next.pathname.split('/').pop()}${next.search}`;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-liw-domain-entrypoints-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `css/domain-entrypoints-staging.css?v=${VERSION}`;
    link.dataset.liwDomainEntrypointsCss = 'true';
    document.head.appendChild(link);
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function promoMarkup({ heading, copy, compact = false, from = '' }) {
    return `<div class="liw-domain-promo-inner">
      <div class="liw-domain-promo-copy">
        <span class="liw-domain-promo-label"><i data-lucide="globe-2" size="15"></i> Custom domains</span>
        <${compact ? 'h3' : 'h2'}>${esc(heading)}</${compact ? 'h3' : 'h2'}>
        <p>${esc(copy)}</p>
        <div class="liw-domain-promo-points">
          <span><i data-lucide="search" size="14"></i> Buy through LIW</span>
          <span><i data-lucide="plug-zap" size="14"></i> Bring your own</span>
          <span><i data-lucide="layers-3" size="14"></i> Every plan</span>
        </div>
      </div>
      <div class="liw-domain-promo-actions">
        <a class="btn liw-domain-primary" href="${domainHref('buy', '', from)}">Find a domain</a>
        <a class="btn liw-domain-secondary" href="${domainHref('connect', '', from)}">I already own one</a>
      </div>
    </div>`;
  }

  function mountHomePromo() {
    if (page !== 'index.html' && page !== '') return;
    if (document.getElementById('liw-home-domain-promo')) return;
    const section = document.createElement('section');
    section.id = 'liw-home-domain-promo';
    section.className = 'container liw-domain-promo liw-home-domain-promo';
    section.innerHTML = promoMarkup({
      heading: 'Give your LIW Card a real web address.',
      copy: 'Search names like yourbusiness.com or yourbusiness.cards, or connect a domain you already own. Custom domains are a paid add-on available across LIW Cards.',
      from: 'home'
    });
    const target = document.querySelector('.home-agency-lite, .home-pricing-lite, #pricing, footer');
    if (target) target.insertAdjacentElement('beforebegin', section);
    else document.querySelector('main')?.appendChild(section);
  }

  function mountPricingPromo() {
    if (page !== 'pricing.html') return;
    if (document.getElementById('liw-pricing-domain-promo')) return;
    const plans = document.querySelector('.liw-three-plan-pricing');
    if (!plans) return;
    const promo = document.createElement('div');
    promo.id = 'liw-pricing-domain-promo';
    promo.className = 'liw-domain-promo liw-pricing-domain-promo';
    promo.innerHTML = promoMarkup({
      heading: 'Custom domains are available on every plan.',
      copy: 'Buy a new domain through LIW or connect one you already own. Domain registration is billed separately from your card plan.',
      compact: true,
      from: 'pricing'
    });
    plans.insertAdjacentElement('beforebegin', promo);

    document.querySelectorAll('#plan-free .feature-list, #plan-lite .feature-list, #plan-plus .feature-list, #plan-pro .feature-list').forEach(list => {
      if (list.querySelector('[data-liw-domain-plan-feature]')) return;
      const item = document.createElement('li');
      item.className = 'liw-domain-plan-feature';
      item.dataset.liwDomainPlanFeature = 'true';
      item.textContent = '✓ Custom domains available as a paid add-on';
      list.appendChild(item);
    });
  }

  function mountDashboardPromo() {
    if (page !== 'dashboard.html') return;

    const workspaceNav = document.querySelector('.sidebar nav');
    if (workspaceNav && !workspaceNav.querySelector('a[href^="domains.html"]')) {
      const link = document.createElement('a');
      link.href = 'domains.html?from=dashboard-nav';
      link.innerHTML = '<i data-lucide="globe-2" size="18"></i> Custom domains';
      const billing = [...workspaceNav.querySelectorAll('a')].find(a => String(a.getAttribute('href') || '').includes('pricing.html'));
      if (billing) billing.insertAdjacentElement('beforebegin', link);
      else workspaceNav.appendChild(link);
    }

    if (!document.getElementById('liw-dashboard-domain-promo')) {
      const promo = document.createElement('section');
      promo.id = 'liw-dashboard-domain-promo';
      promo.className = 'liw-domain-promo liw-dashboard-domain-promo';
      promo.innerHTML = promoMarkup({
        heading: 'Make your card easier to remember.',
        copy: 'Buy a custom web address or connect a domain you already own, then attach it to the LIW Card you choose.',
        compact: true,
        from: 'dashboard'
      });
      const welcome = document.getElementById('dashboard-welcome') || document.querySelector('.dashboard-welcome, .welcome-card');
      if (welcome) welcome.insertAdjacentElement('afterend', promo);
      else document.querySelector('.main')?.prepend(promo);
    }

    const tools = document.querySelector('.dashboard-tool-grid');
    if (tools && !tools.querySelector('[data-liw-domain-tool]')) {
      const tool = document.createElement('a');
      tool.href = 'domains.html?from=dashboard-tools';
      tool.className = 'dashboard-tool-card';
      tool.dataset.liwDomainTool = 'true';
      tool.innerHTML = '<span><i data-lucide="globe-2" size="18"></i></span><div><strong>Custom domains</strong><small>Buy a new domain or connect one you already own.</small></div>';
      tools.appendChild(tool);
    }

    const wireCards = () => {
      document.querySelectorAll('#card-list .card-item[data-card-id]').forEach(card => {
        if (card.querySelector('[data-liw-card-domain]')) return;
        const actions = card.querySelector('.card-actions');
        const owned = Boolean(card.querySelector('[data-delete-card]'));
        if (!actions || !owned) return;
        const id = String(card.dataset.cardId || '').trim();
        if (!id) return;
        const link = document.createElement('a');
        link.className = 'btn btn-light btn-sm liw-domain-card-action';
        link.dataset.liwCardDomain = 'true';
        link.href = domainHref('buy', id, 'dashboard-card');
        link.innerHTML = '<i data-lucide="globe-2" size="15"></i> Domain';
        actions.insertBefore(link, actions.querySelector('[data-delete-card]') || null);
      });
      refreshIcons();
    };
    wireCards();
    const list = document.getElementById('card-list');
    if (list) new MutationObserver(wireCards).observe(list, { childList: true, subtree: true });
  }

  function currentEditorCardId() {
    return String(new URLSearchParams(location.search).get('id') || '').trim();
  }

  function mountEditorPostPublish() {
    if (page !== 'editor.html') return;
    const shareTools = document.getElementById('share-tools');
    if (!shareTools) return;

    const mount = () => {
      if (shareTools.hidden || shareTools.querySelector('[data-liw-editor-domain-promo]')) return;
      const id = currentEditorCardId();
      const box = document.createElement('div');
      box.className = 'liw-editor-domain-promo';
      box.dataset.liwEditorDomainPromo = 'true';
      box.innerHTML = `<div class="liw-editor-domain-promo-head"><span class="liw-editor-domain-promo-icon"><i data-lucide="globe-2" size="18"></i></span><div><h3>Give this card its own web address</h3><p>Use a memorable domain for this card. Buy one through LIW or connect a domain you already own.</p></div></div><div class="liw-editor-domain-promo-actions"><a class="btn btn-primary btn-sm" href="${domainHref('buy', id, 'publish')}">Find a domain</a><a class="btn btn-light btn-sm" href="${domainHref('connect', id, 'publish')}">I already own one</a></div>`;
      shareTools.appendChild(box);
      refreshIcons();
    };
    mount();
    new MutationObserver(mount).observe(shareTools, { attributes: true, attributeFilter: ['hidden'], childList: true });
  }

  function mountAgencyEntrypoints() {
    if (page !== 'agency-dashboard.html') return;

    const sidebar = document.querySelector('.agency-sidebar');
    const firstNav = sidebar?.querySelector('nav');
    if (firstNav && !firstNav.querySelector('[data-liw-agency-domains]')) {
      const link = document.createElement('a');
      link.href = 'domains.html?from=agency-nav';
      link.className = 'liw-agency-domain-link';
      link.dataset.liwAgencyDomains = 'true';
      link.innerHTML = '<i data-lucide="globe-2" size="17"></i>Domains';
      firstNav.appendChild(link);
    }

    const quick = document.querySelector('.agency-quick-grid');
    if (quick && !quick.querySelector('[data-liw-agency-domain-quick]')) {
      const link = document.createElement('a');
      link.href = 'domains.html?from=agency-quick';
      link.className = 'agency-quick-action liw-agency-domain-quick';
      link.dataset.liwAgencyDomainQuick = 'true';
      link.innerHTML = '<span><i data-lucide="globe-2" size="17"></i></span><span><strong>Client domains</strong><small>Buy or connect a domain for a client card.</small></span>';
      quick.appendChild(link);
    }

    const wireAgencyCards = () => {
      document.querySelectorAll('#agency-card-grid .agency-client-card').forEach(card => {
        if (card.querySelector('[data-liw-agency-card-domain]')) return;
        const actions = card.querySelector('.agency-template-actions');
        const edit = actions?.querySelector('a[href*="editor.html?id="]');
        if (!actions || !edit) return;
        let id = '';
        try { id = new URL(edit.href, location.href).searchParams.get('id') || ''; } catch (_) {}
        if (!id) return;
        const link = document.createElement('a');
        link.className = 'btn btn-light btn-sm liw-domain-card-action';
        link.dataset.liwAgencyCardDomain = 'true';
        link.href = domainHref('buy', id, 'agency-card');
        link.innerHTML = '<i data-lucide="globe-2" size="14"></i>Domain';
        actions.appendChild(link);
      });
      refreshIcons();
    };
    wireAgencyCards();
    const grid = document.getElementById('agency-card-grid');
    if (grid) new MutationObserver(wireAgencyCards).observe(grid, { childList: true, subtree: true });
  }

  function normalizeExternalDomain(value) {
    let domain = String(value || '').trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].replace(/\.$/, '');
    return domain;
  }

  function validDomain(domain) {
    if (!domain || domain.length > 253 || !domain.includes('.')) return false;
    return domain.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9-]+$/.test(label) && !label.startsWith('-') && !label.endsWith('-'));
  }

  function selectRequestedCard() {
    if (!requestedCardId) return;
    const select = document.getElementById('domain-card-select');
    if (!select) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const match = [...select.options].some(option => option.value === requestedCardId);
      if (match) {
        select.value = requestedCardId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        clearInterval(timer);
      } else if (attempts > 50) clearInterval(timer);
    }, 120);
  }

  function mountDomainsModes() {
    if (page !== 'domains.html') return;
    const searchPanel = document.querySelector('.domain-search-panel');
    const heading = searchPanel?.querySelector('.domain-panel-heading');
    const searchForm = document.getElementById('domain-search-form');
    const status = document.getElementById('domain-status');
    if (!searchPanel || !heading || !searchForm || !status || document.getElementById('liw-domain-mode-switch')) return;

    const switcher = document.createElement('div');
    switcher.id = 'liw-domain-mode-switch';
    switcher.className = 'liw-domain-mode-switch';
    switcher.setAttribute('aria-label', 'Choose domain setup');
    switcher.innerHTML = '<button type="button" data-domain-mode="buy">Buy a new domain</button><button type="button" data-domain-mode="connect">Connect one I already own</button>';
    heading.insertAdjacentElement('afterend', switcher);

    const connect = document.createElement('form');
    connect.id = 'liw-domain-connect-panel';
    connect.className = 'liw-domain-connect-panel';
    connect.hidden = true;
    connect.innerHTML = `<h3>Connect a domain you already own</h3><p>Keep your domain with your current registrar. Tell LIW which domain belongs to this card and we’ll save the connection request before any DNS changes are made.</p><label for="liw-external-domain">Your domain</label><div class="liw-domain-connect-row"><input id="liw-external-domain" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="url" placeholder="yourbusiness.com" maxlength="253" required><button class="btn btn-primary" id="liw-external-domain-submit" type="submit"><i data-lucide="plug-zap" size="17"></i> Save connection request</button></div><div class="liw-domain-connect-note"><i data-lucide="shield-check" size="16"></i><span>Nothing is transferred, charged, or pointed away from your current website by submitting this request. LIW will verify the setup first.</span></div><div class="liw-domain-connect-success" id="liw-domain-connect-success" hidden></div>`;
    switcher.insertAdjacentElement('afterend', connect);

    const optionsPanel = () => document.getElementById('domain-options-panel');
    const result = document.getElementById('domain-result');

    function setMode(mode) {
      const connectMode = mode === 'connect';
      switcher.querySelectorAll('[data-domain-mode]').forEach(button => button.classList.toggle('active', button.dataset.domainMode === mode));
      connect.hidden = !connectMode;
      searchForm.hidden = connectMode;
      status.hidden = connectMode;
      if (connectMode) {
        if (result) result.hidden = true;
        const options = optionsPanel();
        if (options) options.hidden = true;
      }
      const intro = heading.querySelector('p');
      if (intro) intro.textContent = connectMode
        ? 'Already have a domain? Keep it where it is and connect it to the LIW Card you choose.'
        : 'Enter your business name or a full domain. We’ll compare popular extensions and LIW customer pricing.';
      const url = new URL(location.href);
      if (connectMode) url.searchParams.set('mode', 'connect'); else url.searchParams.delete('mode');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
      if (connectMode) document.getElementById('liw-external-domain')?.focus();
    }

    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-domain-mode]');
      if (button) setMode(button.dataset.domainMode || 'buy');
    });

    connect.addEventListener('submit', async event => {
      event.preventDefault();
      const input = document.getElementById('liw-external-domain');
      const submit = document.getElementById('liw-external-domain-submit');
      const success = document.getElementById('liw-domain-connect-success');
      const cardSelect = document.getElementById('domain-card-select');
      const domain = normalizeExternalDomain(input?.value);
      const cardId = String(cardSelect?.value || '').trim();
      success.hidden = true;

      if (!validDomain(domain)) {
        if (window.toast) window.toast('Enter a valid domain, such as yourbusiness.com.');
        input?.focus();
        return;
      }
      if (!cardId) {
        if (window.toast) window.toast('Choose the card this domain should connect to.');
        cardSelect?.focus();
        return;
      }
      if (!window.supabaseClient || !window.LIW_CONFIG) {
        if (window.toast) window.toast('Domain connection service is not ready.');
        return;
      }

      const original = submit.innerHTML;
      submit.disabled = true;
      submit.innerHTML = '<i data-lucide="loader-circle" size="17"></i> Saving…';
      refreshIcons();
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session?.access_token) throw new Error('Your session expired. Log in again.');
        const response = await fetch(`${window.LIW_CONFIG.supabaseUrl}/functions/v1/liw-domain-connect-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': window.LIW_CONFIG.supabaseKey,
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ domain, cardId })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Could not save this domain request.');
        input.value = payload.domain || domain;
        success.innerHTML = `<strong>Request saved.</strong> ${esc(payload.domain || domain)} is queued for verification with the selected LIW Card. We’ll confirm the required domain settings before anything changes.`;
        success.hidden = false;
        if (window.toast) window.toast('Domain connection request saved.');
      } catch (error) {
        if (window.toast) window.toast(error?.message || 'Could not save this domain request.');
      } finally {
        submit.disabled = false;
        submit.innerHTML = original;
        refreshIcons();
      }
    });

    selectRequestedCard();
    setMode(params.get('mode') === 'connect' ? 'connect' : 'buy');
  }

  function init() {
    ensureStyles();
    mountHomePromo();
    mountPricingPromo();
    mountDashboardPromo();
    mountEditorPostPublish();
    mountAgencyEntrypoints();
    mountDomainsModes();
    selectRequestedCard();
    refreshIcons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
