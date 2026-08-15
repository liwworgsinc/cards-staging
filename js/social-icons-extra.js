/*
 * LIW Cards staging connection-platform expansion.
 * Keeps GitHub's Octicon mark and uses simple category glyphs for the extra
 * platform types so the card does not depend on third-party icon CDNs.
 */
(function () {
  if (!Array.isArray(window.DOTCO_SOCIALS)) return;

  const GLYPHS = {
    music: {
      viewBox: '0 0 24 24',
      paths: ['M14 3v10.55A4 4 0 1 0 16 17V8h5V3h-7z']
    },
    developer: {
      viewBox: '0 0 24 24',
      paths: ['M8.6 4.2 2.8 10a2 2 0 0 0 0 2.8l5.8 5.8 1.4-1.4L4.2 11.6a.8.8 0 0 1 0-1.2l5.8-5.8-1.4-1.4zm6.8 0L14 4.6l5.8 5.8a.8.8 0 0 1 0 1.2L14 17.4l1.4 1.4 5.8-5.8a2 2 0 0 0 0-2.8l-5.8-5.8z']
    },
    support: {
      viewBox: '0 0 24 24',
      paths: ['M12 21s-7.2-4.35-9.55-8.55C.45 8.85 2.35 4.5 6.4 4.5c2.25 0 3.65 1.25 4.45 2.35.8-1.1 2.2-2.35 4.45-2.35 4.05 0 5.95 4.35 3.95 7.95C19.2 16.65 12 21 12 21z']
    },
    creator: {
      viewBox: '0 0 24 24',
      paths: ['M12 2.4l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 15.92l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86L12 2.4z']
    },
    community: {
      viewBox: '0 0 24 24',
      paths: ['M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5.7 4.3A.8.8 0 0 1 2 20.65V6a2 2 0 0 1 2-2zm3.5 5.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z']
    },
    business: {
      viewBox: '0 0 24 24',
      paths: ['M9 4V2h6v2h5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5zm2 0h2V3h-2v1zm-7 7v8h16v-8h-5v2h-6v-2H4zm7 0h2V9h-2v2z']
    }
  };

  const github = {
    key: 'github',
    label: 'GitHub',
    category: 'developer',
    abbr: 'GH',
    viewBox: '0 0 24 24',
    paths: ['M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943'],
    color: '#181717',
    background: '#ffffff',
    placeholder: 'https://github.com/yourname'
  };

  const platforms = [
    github,
    { key: 'spotify', label: 'Spotify', category: 'music', abbr: 'SP', color: '#1DB954', placeholder: 'https://open.spotify.com/artist/yourid' },
    { key: 'soundcloud', label: 'SoundCloud', category: 'music', abbr: 'SC', color: '#FF5500', placeholder: 'https://soundcloud.com/yourname' },
    { key: 'applemusic', label: 'Apple Music', category: 'music', abbr: 'AM', color: '#FA243C', placeholder: 'https://music.apple.com/artist/yourname' },
    { key: 'bandcamp', label: 'Bandcamp', category: 'music', abbr: 'BC', color: '#629AA9', placeholder: 'https://yourname.bandcamp.com' },
    { key: 'audiomack', label: 'Audiomack', category: 'music', abbr: 'AU', color: '#FFA200', placeholder: 'https://audiomack.com/yourname' },
    { key: 'beatstars', label: 'BeatStars', category: 'music', abbr: 'BS', color: '#E9222C', placeholder: 'https://www.beatstars.com/yourname' },
    { key: 'mixcloud', label: 'Mixcloud', category: 'music', abbr: 'MX', color: '#5000FF', placeholder: 'https://www.mixcloud.com/yourname' },
    { key: 'gitlab', label: 'GitLab', category: 'developer', abbr: 'GL', color: '#FC6D26', placeholder: 'https://gitlab.com/yourname' },
    { key: 'stackoverflow', label: 'Stack Overflow', category: 'developer', abbr: 'SO', color: '#F48024', placeholder: 'https://stackoverflow.com/users/yourid' },
    { key: 'codepen', label: 'CodePen', category: 'developer', abbr: 'CP', color: '#111111', placeholder: 'https://codepen.io/yourname' },
    { key: 'devto', label: 'DEV Community', category: 'developer', abbr: 'DEV', color: '#0A0A0A', placeholder: 'https://dev.to/yourname' },
    { key: 'replit', label: 'Replit', category: 'developer', abbr: 'RP', color: '#F26207', placeholder: 'https://replit.com/@yourname' },
    { key: 'npm', label: 'npm', category: 'developer', abbr: 'npm', color: '#CB3837', placeholder: 'https://www.npmjs.com/~yourname' },
    { key: 'bitbucket', label: 'Bitbucket', category: 'developer', abbr: 'BB', color: '#0052CC', placeholder: 'https://bitbucket.org/yourname' },
    { key: 'buymeacoffee', label: 'Buy Me a Coffee', category: 'support', abbr: '☕', color: '#FFDD00', placeholder: 'https://www.buymeacoffee.com/yourname' },
    { key: 'kofi', label: 'Ko-fi', category: 'support', abbr: 'K', color: '#FF5E5B', placeholder: 'https://ko-fi.com/yourname' },
    { key: 'patreon', label: 'Patreon', category: 'support', abbr: 'P', color: '#FF424D', placeholder: 'https://www.patreon.com/yourname' },
    { key: 'gofundme', label: 'GoFundMe', category: 'support', abbr: 'GF', color: '#02A95C', placeholder: 'https://www.gofundme.com/f/your-campaign' },
    { key: 'behance', label: 'Behance', category: 'creator', abbr: 'Bē', color: '#1769FF', placeholder: 'https://www.behance.net/yourname' },
    { key: 'dribbble', label: 'Dribbble', category: 'creator', abbr: 'DB', color: '#EA4C89', placeholder: 'https://dribbble.com/yourname' },
    { key: 'medium', label: 'Medium', category: 'creator', abbr: 'M', color: '#111111', placeholder: 'https://medium.com/@yourname' },
    { key: 'substack', label: 'Substack', category: 'creator', abbr: 'SS', color: '#FF6719', placeholder: 'https://yourname.substack.com' },
    { key: 'linktree', label: 'Linktree', category: 'creator', abbr: 'LT', color: '#43E55E', placeholder: 'https://linktr.ee/yourname' },
    { key: 'carrd', label: 'Carrd', category: 'creator', abbr: 'C', color: '#596CAF', placeholder: 'https://yourname.carrd.co' },
    { key: 'discord', label: 'Discord', category: 'community', abbr: 'DC', color: '#5865F2', placeholder: 'https://discord.gg/yourinvite' },
    { key: 'twitch', label: 'Twitch', category: 'community', abbr: 'TW', color: '#9146FF', placeholder: 'https://twitch.tv/yourname' },
    { key: 'calendly', label: 'Calendly', category: 'business', abbr: 'CA', color: '#006BFF', placeholder: 'https://calendly.com/yourname' },
    { key: 'upwork', label: 'Upwork', category: 'business', abbr: 'UW', color: '#14A800', placeholder: 'https://www.upwork.com/freelancers/yourprofile' },
    { key: 'fiverr', label: 'Fiverr', category: 'business', abbr: 'FI', color: '#1DBF73', placeholder: 'https://www.fiverr.com/yourname' }
  ];

  platforms.forEach(item => {
    if (window.DOTCO_SOCIALS.some(existing => existing && existing.key === item.key)) {
      const current = window.DOTCO_SOCIALS.find(existing => existing && existing.key === item.key);
      if (current && item.category && !current.category) current.category = item.category;
      if (current && item.abbr && !current.abbr) current.abbr = item.abbr;
      return;
    }
    const glyph = GLYPHS[item.category] || GLYPHS.creator;
    window.DOTCO_SOCIALS.push({ ...item, viewBox: item.viewBox || glyph.viewBox, paths: item.paths || glyph.paths, background: item.background ?? '#ffffff' });
  });

  const CATEGORY_LABELS = { social: 'Social', music: 'Music & Artists', developer: 'Developer', support: 'Support & Donations', creator: 'Creator & Portfolio', community: 'Community & Live', business: 'Business & Freelance' };
  const CATEGORY_ORDER = ['social', 'music', 'developer', 'support', 'creator', 'community', 'business'];
  const SOCIAL_KEYS = new Set(['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'threads', 'snapchat', 'pinterest']);
  const COMMUNITY_KEYS = new Set(['reddit', 'telegram', 'discord', 'twitch']);

  function categoryFor(key) {
    const meta = window.DOTCO_SOCIALS.find(item => item && item.key === key);
    if (meta?.category) return meta.category;
    if (COMMUNITY_KEYS.has(key)) return 'community';
    if (SOCIAL_KEYS.has(key)) return 'social';
    if (key === 'github') return 'developer';
    return 'social';
  }

  function injectConnectStyles() {
    if (document.getElementById('liw-connect-platform-styles')) return;
    const style = document.createElement('style');
    style.id = 'liw-connect-platform-styles';
    style.textContent = `
      .connect-category-tabs{display:flex;gap:7px;overflow-x:auto;padding:12px 16px 2px;scrollbar-width:none}.connect-category-tabs::-webkit-scrollbar{display:none}
      .connect-category-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.055);color:#cbd5e1;padding:8px 11px;font:inherit;font-size:.72rem;font-weight:850;cursor:pointer;white-space:nowrap}.connect-category-tab:hover,.connect-category-tab.is-active{background:#d4a84f;color:#101827;border-color:#d4a84f}
      #social-app-grid.connect-platform-grid{display:block;padding:10px 16px 16px;max-height:410px;overflow:auto}.connect-platform-group{padding:8px 0 10px}.connect-platform-group[hidden]{display:none!important}.connect-platform-group-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 8px;color:#fff}.connect-platform-group-head strong{font-size:.78rem;letter-spacing:.01em}.connect-platform-group-head span{font-size:.68rem;color:#8793aa}.connect-platform-group-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
      .connect-platform-abbr{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:var(--connect-platform-color,#334155);color:#fff;font-size:.68rem;font-weight:950;letter-spacing:-.01em;box-shadow:0 7px 16px rgba(0,0,0,.16)}.social-app-tile.has-connect-abbr>.social-brand-icon,.social-app-tile.has-connect-abbr>svg:not(.quick-social-brand-icon){display:none!important}.connect-platform-note{margin:0 16px 2px;padding:9px 11px;border:1px solid rgba(212,168,79,.2);border-radius:11px;background:rgba(212,168,79,.07);color:#cbd5e1;font-size:.72rem;line-height:1.45}.connect-platform-note strong{color:#f4d58c}
      @media(max-width:820px){.connect-platform-group-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:560px){.connect-category-tabs{padding-left:12px;padding-right:12px}.connect-platform-group-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#social-app-grid.connect-platform-grid{padding-left:12px;padding-right:12px}.connect-platform-note{margin-left:12px;margin-right:12px}}
    `;
    document.head.appendChild(style);
  }

  function updateEditorCopy() {
    const heading = document.querySelector('.social-quick-section .section-mini-heading h3');
    const helper = document.querySelector('.social-quick-section .section-mini-heading p');
    const headingHtml = 'Connect & Platforms <span>optional</span>';
    const helperText = 'Add the places people can follow you, hear your music, view your work, support you, or collaborate with you.';
    if (heading && heading.innerHTML !== headingHtml) heading.innerHTML = headingHtml;
    if (helper && helper.textContent !== helperText) helper.textContent = helperText;
    const trigger = document.getElementById('social-more-trigger');
    const triggerHtml = '<i data-lucide="grid-3x3" size="17"></i> More apps & platforms <small>Music, developer, support + more</small>';
    if (trigger && trigger.innerHTML !== triggerHtml) trigger.innerHTML = triggerHtml;
    const picker = document.getElementById('social-app-picker');
    if (!picker) return;
    const title = picker.querySelector('.social-app-picker-head strong');
    const sub = picker.querySelector('.social-app-picker-head strong + span');
    const search = document.getElementById('social-app-search');
    if (title && title.textContent !== 'Choose where people can connect with you') title.textContent = 'Choose where people can connect with you';
    if (sub && sub.textContent !== 'Social, music, developer, support, creator and business platforms in one place.') sub.textContent = 'Social, music, developer, support, creator and business platforms in one place.';
    if (search && search.placeholder !== 'Search Spotify, SoundCloud, GitHub, Buy Me a Coffee…') search.placeholder = 'Search Spotify, SoundCloud, GitHub, Buy Me a Coffee…';
  }

  let activeCategory = 'all';
  let gridObserver = null;
  let regrouping = false;

  function groupPickerTiles() {
    const grid = document.getElementById('social-app-grid');
    if (!grid || regrouping) return;
    const tiles = [...grid.querySelectorAll(':scope > .social-app-tile')];
    if (!tiles.length) { if (grid.querySelector(':scope > .social-app-empty')) grid.classList.add('connect-platform-grid'); return; }
    regrouping = true;
    if (gridObserver) gridObserver.disconnect();
    grid.classList.add('connect-platform-grid');
    const groups = new Map();
    tiles.forEach(tile => {
      const key = tile.dataset.socialApp || '';
      const category = categoryFor(key);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(tile);
    });
    grid.innerHTML = '';
    CATEGORY_ORDER.forEach(category => {
      const groupTiles = groups.get(category) || [];
      if (!groupTiles.length) return;
      const section = document.createElement('section');
      section.className = 'connect-platform-group';
      section.dataset.connectCategory = category;
      section.hidden = activeCategory !== 'all' && activeCategory !== category;
      const inner = document.createElement('div');
      inner.className = 'connect-platform-group-grid';
      groupTiles.forEach(tile => {
        const key = tile.dataset.socialApp || '';
        const meta = window.DOTCO_SOCIALS.find(item => item && item.key === key);
        if (meta?.abbr && !tile.querySelector('.connect-platform-abbr')) {
          const badge = document.createElement('span');
          badge.className = 'connect-platform-abbr';
          badge.textContent = meta.abbr;
          badge.style.setProperty('--connect-platform-color', meta.color || '#334155');
          tile.classList.add('has-connect-abbr');
          tile.insertAdjacentElement('afterbegin', badge);
        }
        inner.appendChild(tile);
      });
      section.innerHTML = `<div class="connect-platform-group-head"><strong>${CATEGORY_LABELS[category] || 'Platforms'}</strong><span>${groupTiles.length}</span></div>`;
      section.appendChild(inner);
      grid.appendChild(section);
    });
    regrouping = false;
    if (gridObserver) gridObserver.observe(grid, { childList: true });
  }

  function mountCategoryTabs() {
    const picker = document.getElementById('social-app-picker');
    const searchWrap = picker?.querySelector('.social-app-picker-search');
    if (!picker || !searchWrap || document.getElementById('connect-category-tabs')) return;
    const note = document.createElement('p');
    note.className = 'connect-platform-note';
    note.innerHTML = '<strong>Build your connection hub:</strong> choose only the platforms that matter to your audience. You can add up to 12 links.';
    searchWrap.insertAdjacentElement('afterend', note);
    const tabs = document.createElement('div');
    tabs.id = 'connect-category-tabs';
    tabs.className = 'connect-category-tabs';
    tabs.innerHTML = `<button class="connect-category-tab is-active" type="button" data-connect-category="all">All</button>${CATEGORY_ORDER.map(category => `<button class="connect-category-tab" type="button" data-connect-category="${category}">${CATEGORY_LABELS[category]}</button>`).join('')}`;
    note.insertAdjacentElement('afterend', tabs);
    tabs.addEventListener('click', event => {
      const button = event.target.closest('[data-connect-category]');
      if (!button) return;
      activeCategory = button.dataset.connectCategory || 'all';
      tabs.querySelectorAll('[data-connect-category]').forEach(item => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('#social-app-grid .connect-platform-group').forEach(group => { group.hidden = activeCategory !== 'all' && group.dataset.connectCategory !== activeCategory; });
    });
  }

  function enhancePickerWhenReady() {
    if (!document.body.classList.contains('editor-page')) return;
    injectConnectStyles();
    updateEditorCopy();
    const grid = document.getElementById('social-app-grid');
    if (!grid) return;
    mountCategoryTabs();
    if (!gridObserver) {
      gridObserver = new MutationObserver(() => {
        window.requestAnimationFrame(() => {
          updateEditorCopy();
          groupPickerTiles();
          if (window.lucide) lucide.createIcons();
        });
      });
      gridObserver.observe(grid, { childList: true });
    }
    groupPickerTiles();
    if (window.lucide) lucide.createIcons();
  }

  function startEditorEnhancementBridge() {
    if (!document.body.classList.contains('editor-page')) return;
    let pageObserver = null;
    const mountOncePickerExists = () => {
      if (!document.getElementById('social-app-grid')) return false;
      if (pageObserver) pageObserver.disconnect();
      enhancePickerWhenReady();
      return true;
    };
    if (mountOncePickerExists()) return;
    pageObserver = new MutationObserver(() => { mountOncePickerExists(); });
    pageObserver.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => { if (pageObserver) pageObserver.disconnect(); enhancePickerWhenReady(); }, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startEditorEnhancementBridge, { once: true });
  else startEditorEnhancementBridge();
})();
