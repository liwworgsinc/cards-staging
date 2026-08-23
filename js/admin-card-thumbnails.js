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
      swipeLink.href = 'css/admin-overview-mobile-swipe.css?v=20260823-1';
      swipeLink.dataset.liwAdminMobileSwipe = 'true';
      document.head.appendChild(swipeLink);
    }
  }

  function installAdminMobileSwipeDeck() {
    if (document.querySelector('.admin-mobile-section-shell')) return;

    const panelConfig = [
      { id: 'accounts-panel', label: 'Customers' },
      { id: 'affiliate-applications-panel', label: 'Affiliates' },
      { id: 'recent-cards-panel', label: 'Cards' },
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
  installAdminMobileSwipeDeck();

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