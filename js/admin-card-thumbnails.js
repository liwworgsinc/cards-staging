(function () {
  'use strict';

  function installAdminOverviewFacelift() {
    document.body.classList.add('liw-admin-facelift');

    if (!document.querySelector('link[data-liw-admin-facelift]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/admin-overview-facelift.css?v=20260823-1';
      link.dataset.liwAdminFacelift = 'true';
      document.head.appendChild(link);
    }

    if (!document.querySelector('link[data-liw-admin-mobile-swipe]')) {
      const swipeLink = document.createElement('link');
      swipeLink.rel = 'stylesheet';
      swipeLink.href = 'css/admin-overview-mobile-swipe.css?v=20260823-2';
      swipeLink.dataset.liwAdminMobileSwipe = 'true';
      document.head.appendChild(swipeLink);
    }

    if (!document.querySelector('link[data-liw-admin-home-spotlight]')) {
      const spotlightLink = document.createElement('link');
      spotlightLink.rel = 'stylesheet';
      spotlightLink.href = 'css/admin-homepage-spotlight.css?v=20260824-1';
      spotlightLink.dataset.liwAdminHomeSpotlight = 'true';
      document.head.appendChild(spotlightLink);
    }
  }

  function installAdminHomepageSpotlightPanel() {
    if (document.getElementById('homepage-spotlight-panel')) return;
    const whiteLabelPanel = document.getElementById('admin-white-label-panel');
    if (!whiteLabelPanel?.parentNode) return;

    const panel = document.createElement('section');
    panel.className = 'card admin-panel admin-support-panel admin-homepage-spotlight-panel';
    panel.id = 'homepage-spotlight-panel';
    panel.innerHTML = `
      <div class="section-title admin-section-title">
        <div>
          <span class="eyebrow">Homepage advertising · staging</span>
          <h2>Featured card rotation</h2>
          <p class="muted">Choose published LIW Cards for the homepage spotlight, control their order, and automatically rotate between businesses.</p>
        </div>
        <span class="status-pill active" id="admin-home-spotlight-status" data-tone="loading">Loading…</span>
      </div>

      <div class="admin-home-spotlight-grid">
        <div class="admin-home-control-stack">
          <div class="admin-home-control-card">
            <h3>Display settings</h3>
            <p>Control whether the homepage spotlight is visible and how quickly multiple cards rotate.</p>
            <div class="admin-home-settings-row">
              <label class="admin-home-setting toggle">
                <input id="admin-home-spotlight-enabled" type="checkbox" checked/>
                <span>Show spotlight<small>Turn the entire featured-card section on or off.</small></span>
              </label>
              <label class="admin-home-setting toggle">
                <input id="admin-home-rotation-enabled" type="checkbox" checked/>
                <span>Auto rotate<small>Automatically move through active featured cards.</small></span>
              </label>
              <label class="admin-home-setting">
                <span>Change every</span>
                <select class="input" id="admin-home-rotation-seconds">
                  <option value="5">5 seconds</option>
                  <option value="8">8 seconds</option>
                  <option value="10" selected>10 seconds</option>
                  <option value="15">15 seconds</option>
                  <option value="20">20 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="45">45 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
                <small>Applies when at least two cards are active.</small>
              </label>
            </div>
          </div>

          <div class="admin-home-control-card">
            <h3>Add a featured card</h3>
            <p>Select a published card already in LIW Cards, or paste/type its slug. Full card links containing a slug also work.</p>
            <div class="admin-home-add-grid">
              <select class="input" id="admin-home-card-select" aria-label="Select a published card">
                <option value="">Select a published card…</option>
              </select>
              <button class="btn btn-primary" id="admin-home-add-selected" type="button"><i data-lucide="plus"></i> Add selected</button>
            </div>
            <div class="admin-home-add-grid">
              <input class="input" id="admin-home-card-slug" placeholder="Example: damion-thomas-liw" autocomplete="off"/>
              <button class="btn btn-light" id="admin-home-add-slug" type="button"><i data-lucide="link-2"></i> Add slug</button>
            </div>
          </div>

          <div class="admin-home-control-card">
            <div class="admin-home-featured-head">
              <strong>Featured rotation order</strong>
              <span id="admin-home-featured-count">0</span>
            </div>
            <div class="admin-home-featured-list" id="admin-home-featured-list"></div>
          </div>

          <div class="admin-home-savebar">
            <button class="btn btn-primary" id="admin-home-spotlight-save" type="button"><i data-lucide="save"></i> Save homepage spotlight</button>
            <button class="btn btn-light" id="admin-home-spotlight-reload" type="button"><i data-lucide="rotate-ccw"></i> Reload saved</button>
            <small>Changes affect only the staging homepage while this feature is being tested.</small>
          </div>
        </div>

        <aside class="admin-home-preview">
          <div class="admin-home-preview-head">
            <div>
              <span class="admin-home-preview-badge">Live preview</span>
              <strong id="admin-home-spotlight-preview-name">Featured LIW Card</strong>
              <span id="admin-home-spotlight-preview-rotation">Rotation preview</span>
            </div>
          </div>
          <div class="admin-home-preview-frame-shell">
            <iframe class="admin-home-preview-frame" id="admin-home-spotlight-preview-frame" title="Homepage featured card preview" loading="lazy"></iframe>
            <div class="admin-home-preview-empty" id="admin-home-spotlight-preview-empty" hidden></div>
          </div>
          <p class="admin-home-preview-note">This preview shows the first active card. The public staging homepage cycles through all active cards in the order shown.</p>
        </aside>
      </div>`;

    whiteLabelPanel.parentNode.insertBefore(panel, whiteLabelPanel);

    const heroLinks = document.querySelector('.admin-hero-links');
    if (heroLinks && !heroLinks.querySelector('a[href="#homepage-spotlight-panel"]')) {
      const link = document.createElement('a');
      link.href = '#homepage-spotlight-panel';
      link.innerHTML = '<i data-lucide="gallery-horizontal-end"></i> Homepage spotlight';
      heroLinks.appendChild(link);
    }

    if (window.lucide) lucide.createIcons();
  }

  function loadAdminHomepageSpotlightController() {
    if (document.querySelector('script[data-liw-admin-home-spotlight-controller]')) return;
    const script = document.createElement('script');
    script.src = 'js/admin-homepage-spotlight.js?v=20260824-1';
    script.dataset.liwAdminHomeSpotlightController = 'true';
    document.body.appendChild(script);
  }

  function installAdminMobileSwipeDeck() {
    if (document.querySelector('.admin-mobile-section-shell')) return;

    const panelConfig = [
      { id: 'accounts-panel', label: 'Customers' },
      { id: 'affiliate-applications-panel', label: 'Affiliates' },
      { id: 'recent-cards-panel', label: 'Cards' },
      { id: 'homepage-spotlight-panel', label: 'Homepage' },
      { id: 'admin-white-label-panel', label: 'White-label' }
    ];
    const panels = panelConfig.map(item => document.getElementById(item.id));
    if (panels.some(panel => !panel)) return;

    const shell = document.createElement('div');
    shell.className = 'admin-mobile-section-shell';
    shell.setAttribute('aria-label', 'Admin overview sections');

    const nav = document.createElement('div');
    nav.className = 'admin-mobile-section-nav';

    const tabs = document.createElement('div');
    tabs.className = 'admin-mobile-section-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Admin sections');

    const progress = document.createElement('span');
    progress.className = 'admin-mobile-section-progress';
    progress.setAttribute('aria-live', 'polite');
    progress.textContent = `1 / ${panels.length}`;

    const hint = document.createElement('div');
    hint.className = 'admin-mobile-swipe-hint';
    hint.textContent = 'Swipe sections left or right';

    const deck = document.createElement('div');
    deck.className = 'admin-mobile-section-deck';

    panels[0].parentNode.insertBefore(shell, panels[0]);
    shell.appendChild(nav);
    shell.appendChild(hint);
    shell.appendChild(deck);
    nav.appendChild(tabs);
    nav.appendChild(progress);
    panels.forEach(panel => deck.appendChild(panel));

    const tabButtons = panelConfig.map((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-mobile-section-tab';
      button.textContent = item.label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', item.id);
      button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      if (index === 0) button.classList.add('active');
      tabs.appendChild(button);
      return button;
    });

    function panelLeft(index) {
      return Math.max(0, panels[index].offsetLeft - panels[0].offsetLeft);
    }

    function centerActiveTab(index) {
      const button = tabButtons[index];
      if (!button) return;
      const left = Math.max(0, button.offsetLeft - tabs.offsetLeft - (tabs.clientWidth - button.offsetWidth) / 2);
      tabs.scrollTo({ left, behavior: 'smooth' });
    }

    function setActive(index) {
      const safeIndex = Math.max(0, Math.min(index, panels.length - 1));
      tabButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === safeIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      progress.textContent = `${safeIndex + 1} / ${panels.length}`;
      centerActiveTab(safeIndex);
    }

    function goToPanel(index, behavior = 'smooth') {
      const safeIndex = Math.max(0, Math.min(index, panels.length - 1));
      deck.scrollTo({ left: panelLeft(safeIndex), behavior });
      setActive(safeIndex);
    }

    tabButtons.forEach((button, index) => {
      button.addEventListener('click', () => goToPanel(index));
    });

    let scrollFrame = 0;
    deck.addEventListener('scroll', () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        let bestIndex = 0;
        let bestDistance = Infinity;
        panels.forEach((panel, index) => {
          const distance = Math.abs(panelLeft(index) - deck.scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });
        setActive(bestIndex);
      });
    }, { passive: true });

    document.querySelectorAll('.admin-hero-links a[href^="#"]').forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const index = panelConfig.findIndex(item => item.id === id);
      if (index < 0) return;
      link.addEventListener('click', event => {
        if (!window.matchMedia('(max-width: 720px)').matches) return;
        event.preventDefault();
        shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => goToPanel(index), 140);
      });
    });

    const originalShowCustomerCards = window.showCustomerCards;
    if (typeof originalShowCustomerCards === 'function' && !originalShowCustomerCards.__liwSwipeWrapped) {
      const wrappedShowCustomerCards = function (userId) {
        originalShowCustomerCards(userId);
        if (window.matchMedia('(max-width: 720px)').matches) {
          window.setTimeout(() => {
            shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
            goToPanel(2);
          }, 60);
        }
      };
      wrappedShowCustomerCards.__liwSwipeWrapped = true;
      window.showCustomerCards = wrappedShowCustomerCards;
    }

    const hashIndex = panelConfig.findIndex(item => `#${item.id}` === location.hash);
    if (hashIndex >= 0 && window.matchMedia('(max-width: 720px)').matches) {
      requestAnimationFrame(() => goToPanel(hashIndex, 'auto'));
    }
  }

  installAdminOverviewFacelift();
  installAdminHomepageSpotlightPanel();
  installAdminMobileSwipeDeck();
  loadAdminHomepageSpotlightController();

  const thumbnailBySlug = new Map();

  function initials(value) {
    return String(value || 'Card')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'C';
  }

  function rowSlug(row) {
    const meta = row.querySelector('.admin-card-primary > div > span');
    const text = String(meta?.textContent || '');
    const marker = text.lastIndexOf('· /');
    return marker >= 0 ? text.slice(marker + 3).trim() : '';
  }

  function decorateCardRows() {
    document.querySelectorAll('#admin-card-list .admin-card-row').forEach(row => {
      const slug = rowSlug(row);
      const item = thumbnailBySlug.get(slug);
      const box = row.querySelector('.admin-card-icon');
      if (!box || !item) return;

      box.textContent = initials(item.label);
      box.style.overflow = 'hidden';
      box.style.fontWeight = '900';
      box.style.fontSize = '.72rem';

      if (!item.imageUrl) return;
      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'cover';
      image.style.display = 'block';
      box.textContent = '';
      box.appendChild(image);
    });
  }

  async function loadThumbnails() {
    try {
      const { data, error } = await supabaseClient
        .from('digital_cards')
        .select('slug,full_name,company_name,profile_image_url')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      (data || []).forEach(card => {
        thumbnailBySlug.set(String(card.slug || ''), {
          label: card.company_name || card.full_name || 'Card',
          imageUrl: String(card.profile_image_url || '').trim()
        });
      });
      decorateCardRows();
    } catch (error) {
      console.warn('Admin card thumbnails unavailable:', error);
    }
  }

  function scheduleDecoration() {
    window.setTimeout(decorateCardRows, 0);
  }

  ['admin-card-search', 'admin-card-status-filter', 'admin-clear-card-owner-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', scheduleDecoration);
    document.getElementById(id)?.addEventListener('change', scheduleDecoration);
    document.getElementById(id)?.addEventListener('click', scheduleDecoration);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('button[onclick^="showCustomerCards"]')) scheduleDecoration();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadThumbnails, { once: true });
  } else {
    loadThumbnails();
  }
})();