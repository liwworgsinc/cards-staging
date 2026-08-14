(function () {
  const MAX_SOCIAL_LINKS = 12;

  function brandSvg(meta, size = 17) {
    if (!meta?.paths?.length) return '';
    const paths = meta.paths.map(pathData => `<path d="${pathData}"></path>`).join('');
    return `<svg class="quick-social-brand-icon" viewBox="${meta.viewBox}" width="${size}" height="${size}" aria-hidden="true" focusable="false" style="color:${meta.color};fill:currentColor;flex:0 0 auto">${paths}</svg>`;
  }

  function renderQuickSocialIcons() {
    if (typeof window.socialMeta !== 'function') return;

    document.querySelectorAll('[data-quick-social]').forEach(button => {
      const meta = window.socialMeta(button.dataset.quickSocial);
      if (!meta) return;

      button.querySelectorAll(':scope > i[data-lucide], :scope > svg, :scope > .quick-social-brand-icon').forEach(icon => icon.remove());
      button.insertAdjacentHTML('afterbegin', brandSvg(meta, 17));
    });
  }

  function injectEnhancementStyles() {
    if (document.getElementById('liw-editor-enhancement-styles')) return;
    const style = document.createElement('style');
    style.id = 'liw-editor-enhancement-styles';
    style.textContent = `
      .social-more-trigger{width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:9px;min-height:44px;border:1px dashed rgba(11,20,56,.22);border-radius:13px;background:rgba(11,20,56,.025);color:#0b1438;font-weight:800;cursor:pointer;transition:.16s ease}
      .social-more-trigger:hover{border-color:rgba(212,168,79,.72);background:rgba(212,168,79,.08);transform:translateY(-1px)}
      .social-more-trigger small{font-weight:700;color:#667085}
      .social-app-picker{margin-top:12px;border:1px solid rgba(11,20,56,.12);border-radius:18px;background:#101827;color:#fff;box-shadow:0 18px 42px rgba(11,20,56,.14);overflow:hidden}
      .social-app-picker[hidden]{display:none!important}
      .social-app-picker-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 12px;border-bottom:1px solid rgba(255,255,255,.09)}
      .social-app-picker-head>div:first-child{display:flex;align-items:center;gap:11px;min-width:0}.social-app-picker-head strong{display:block;font-size:.95rem}.social-app-picker-head span{display:block;margin-top:2px;color:#aeb8cc;font-size:.78rem}
      .social-app-picker-close{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.06);color:#fff;cursor:pointer}
      .social-app-picker-search{padding:12px 16px 0}.social-app-picker-search input{width:100%;min-height:42px;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 12px;background:rgba(255,255,255,.07);color:#fff;font:inherit}.social-app-picker-search input::placeholder{color:#8f9bb2}.social-app-picker-search input:focus{outline:3px solid rgba(212,168,79,.16);border-color:#d4a84f}
      .social-app-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;padding:14px 16px 16px;max-height:390px;overflow:auto}
      .social-app-tile{position:relative;display:flex;min-width:0;min-height:78px;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;border-radius:14px;background:rgba(255,255,255,.035);color:#f8fafc;cursor:pointer;transition:.15s ease;padding:9px 5px}
      .social-app-tile:hover{border-color:rgba(212,168,79,.55);background:rgba(255,255,255,.075);transform:translateY(-1px)}
      .social-app-tile.is-added{border-color:rgba(72,187,120,.55);background:rgba(72,187,120,.08)}
      .social-app-tile-label{width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:.71rem;font-weight:800;color:#dbe3f2}
      .social-app-tile .social-brand-icon{box-shadow:0 7px 16px rgba(0,0,0,.18)}
      .social-app-added-mark{position:absolute;right:7px;top:7px;width:17px;height:17px;display:grid;place-items:center;border-radius:50%;background:#22c55e;color:#fff;font-size:11px;font-weight:900}
      .social-app-empty{grid-column:1/-1;padding:26px 12px;text-align:center;color:#aeb8cc;font-size:.84rem}
      .post-setup-enhancer{margin:18px 0 20px;padding:20px;border:1px solid rgba(212,168,79,.34);border-radius:20px;background:linear-gradient(135deg,rgba(11,20,56,.035),rgba(212,168,79,.08))}
      .post-setup-enhancer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.post-setup-enhancer-head h3{margin:0 0 4px;font-size:1.05rem;color:#0b1438}.post-setup-enhancer-head p{margin:0;color:#667085;font-size:.86rem;line-height:1.5}.post-setup-enhancer-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#0b1438;color:#fff;font-size:.7rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
      .post-setup-option-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.post-setup-option{display:flex;align-items:center;gap:12px;width:100%;min-height:72px;padding:12px 13px;border:1px solid rgba(11,20,56,.1);border-radius:15px;background:#fff;color:#111827;text-align:left;cursor:pointer;box-shadow:0 8px 20px rgba(11,20,56,.045);transition:.15s ease}.post-setup-option:hover{border-color:rgba(212,168,79,.65);transform:translateY(-1px);box-shadow:0 11px 24px rgba(11,20,56,.075)}
      .post-setup-option-icon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:12px;background:#0b1438;color:#fff}.post-setup-option strong{display:block;margin-bottom:2px;font-size:.88rem}.post-setup-option span{display:block;color:#667085;font-size:.75rem;line-height:1.35}
      @media(max-width:820px){.social-app-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:560px){.social-app-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px}.social-app-picker-head{padding:14px 12px 11px}.social-app-picker-search{padding:11px 12px 0}.post-setup-enhancer{padding:16px}.post-setup-enhancer-head{flex-direction:column}.post-setup-option-grid{grid-template-columns:1fr}.social-more-trigger small{display:none}}
    `;
    document.head.appendChild(style);
  }

  function currentSocialKeys() {
    try {
      if (!Array.isArray(socialLinks)) return new Set();
      return new Set(socialLinks.map(link => typeof socialKey === 'function' ? socialKey(link.platform) : String(link.platform || '').toLowerCase()));
    } catch (_) {
      return new Set();
    }
  }

  function focusSocialRow(index) {
    window.setTimeout(() => {
      const input = document.querySelector(`[data-social-index="${index}"] input`);
      if (!input) return;
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }, 80);
  }

  function addPlatformFromPicker(key) {
    try {
      const platform = typeof socialKey === 'function' ? socialKey(key) : key;
      const links = Array.isArray(socialLinks) ? socialLinks : [];
      const existingIndex = links.findIndex(link => (typeof socialKey === 'function' ? socialKey(link.platform) : link.platform) === platform);
      if (existingIndex >= 0) {
        focusSocialRow(existingIndex);
        return;
      }
      if (links.length >= MAX_SOCIAL_LINKS) {
        if (typeof toast === 'function') toast(`You can add up to ${MAX_SOCIAL_LINKS} social links to one card.`);
        return;
      }
      if (typeof addSocialRow !== 'function') return;
      addSocialRow({ platform, url: '' });
      renderSocialPickerGrid(document.getElementById('social-app-search')?.value || '');
      const newIndex = Array.isArray(socialLinks) ? socialLinks.length - 1 : -1;
      if (newIndex >= 0) focusSocialRow(newIndex);
    } catch (error) {
      console.warn('LIW social picker could not add platform:', error);
    }
  }

  function renderSocialPickerGrid(filter = '') {
    const grid = document.getElementById('social-app-grid');
    if (!grid || !Array.isArray(window.DOTCO_SOCIALS)) return;
    const query = String(filter || '').trim().toLowerCase();
    const added = currentSocialKeys();
    const items = window.DOTCO_SOCIALS.filter(meta => !query || meta.label.toLowerCase().includes(query) || meta.key.toLowerCase().includes(query));

    grid.innerHTML = items.length ? items.map(meta => {
      const selected = added.has(meta.key);
      const icon = typeof window.socialIconHtml === 'function'
        ? window.socialIconHtml(meta.key, { size: 18 })
        : brandSvg(meta, 20);
      return `<button class="social-app-tile${selected ? ' is-added' : ''}" type="button" data-social-app="${meta.key}" title="${meta.label}">${icon}<span class="social-app-tile-label">${meta.label}</span>${selected ? '<span class="social-app-added-mark">✓</span>' : ''}</button>`;
    }).join('') : '<div class="social-app-empty">No matching apps found.</div>';

    grid.querySelectorAll('[data-social-app]').forEach(button => button.addEventListener('click', () => addPlatformFromPicker(button.dataset.socialApp)));
  }

  function mountSocialPicker() {
    const quickAdd = document.getElementById('social-quick-add');
    if (!quickAdd || document.getElementById('social-more-trigger')) return;

    const trigger = document.createElement('button');
    trigger.id = 'social-more-trigger';
    trigger.className = 'social-more-trigger';
    trigger.type = 'button';
    trigger.innerHTML = '<i data-lucide="grid-3x3" size="17"></i> More apps & socials <small>Choose from the full icon library</small>';

    const picker = document.createElement('div');
    picker.id = 'social-app-picker';
    picker.className = 'social-app-picker';
    picker.hidden = true;
    picker.innerHTML = `
      <div class="social-app-picker-head">
        <div><span class="post-setup-option-icon"><i data-lucide="share-2" size="18"></i></span><div><strong>Choose another app or social network</strong><span>Search the full library. Add only the profiles you actually use.</span></div></div>
        <button class="social-app-picker-close" id="social-app-picker-close" type="button" aria-label="Close social picker"><i data-lucide="x" size="17"></i></button>
      </div>
      <div class="social-app-picker-search"><input id="social-app-search" type="search" placeholder="Search Instagram, X, Threads, GitHub, Spotify…" autocomplete="off"></div>
      <div class="social-app-grid" id="social-app-grid"></div>`;

    quickAdd.insertAdjacentElement('afterend', trigger);
    trigger.insertAdjacentElement('afterend', picker);

    const openPicker = () => {
      picker.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      renderSocialPickerGrid(document.getElementById('social-app-search')?.value || '');
      window.setTimeout(() => document.getElementById('social-app-search')?.focus(), 40);
    };
    const closePicker = () => {
      picker.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => picker.hidden ? openPicker() : closePicker());
    document.getElementById('social-app-picker-close')?.addEventListener('click', closePicker);
    document.getElementById('social-app-search')?.addEventListener('input', event => renderSocialPickerGrid(event.target.value));

    window.LIWOpenSocialPicker = () => {
      if (typeof openTab === 'function') openTab('links');
      window.setTimeout(() => {
        openPicker();
        trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    };

    if (window.lucide) lucide.createIcons();
  }

  function openDesignAdvanced() {
    if (typeof openTab === 'function') openTab('design');
    window.setTimeout(() => {
      const details = document.querySelector('.design-advanced-details');
      if (details) details.open = true;
      details?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  }

  function openAboutAdvanced() {
    if (typeof openTab === 'function') openTab('content');
    window.setTimeout(() => {
      const details = [...document.querySelectorAll('.editor-panel[data-panel="content"] .editor-advanced-details')].find(item => /headline|bio/i.test(item.textContent || '')) || document.querySelector('.editor-panel[data-panel="content"] .editor-advanced-details');
      if (details) details.open = true;
      details?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  }

  function openBusinessTools() {
    if (typeof openTab === 'function') openTab('tools');
    window.setTimeout(() => {
      const reveal = document.getElementById('show-business-tools');
      if (reveal && !reveal.hidden) reveal.click();
      document.querySelector('.editor-panel[data-panel="tools"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  }

  function mountPostSetupEnhancer() {
    const sharePanel = document.querySelector('.editor-panel[data-panel="share"]');
    const checklist = document.getElementById('quick-publish-checklist');
    if (!sharePanel || !checklist || document.getElementById('post-setup-enhancer')) return;

    const section = document.createElement('section');
    section.id = 'post-setup-enhancer';
    section.className = 'post-setup-enhancer';
    section.innerHTML = `
      <div class="post-setup-enhancer-head">
        <div><h3>Your 2-minute card is ready. Now make it yours.</h3><p>Everything below is optional. Add only what helps your business look stronger, convert visitors, or make the card easier to use.</p></div>
        <span class="post-setup-enhancer-badge">Optional</span>
      </div>
      <div class="post-setup-option-grid">
        <button class="post-setup-option" type="button" data-enhance-card="socials"><span class="post-setup-option-icon"><i data-lucide="share-2" size="18"></i></span><span><strong>More socials & apps</strong><span>Choose from the full brand-icon library.</span></span></button>
        <button class="post-setup-option" type="button" data-enhance-card="tools"><span class="post-setup-option-icon"><i data-lucide="briefcase-business" size="18"></i></span><span><strong>Business tools</strong><span>Services, products, booking, payments and leads.</span></span></button>
        <button class="post-setup-option" type="button" data-enhance-card="design"><span class="post-setup-option-icon"><i data-lucide="palette" size="18"></i></span><span><strong>Advanced design</strong><span>Fonts, buttons, cover, branding and SEO.</span></span></button>
        <button class="post-setup-option" type="button" data-enhance-card="about"><span class="post-setup-option-icon"><i data-lucide="sparkles" size="18"></i></span><span><strong>More about you</strong><span>Add a headline, bio and fine-tune your profile.</span></span></button>
      </div>`;

    checklist.insertAdjacentElement('afterend', section);
    section.querySelector('[data-enhance-card="socials"]')?.addEventListener('click', () => window.LIWOpenSocialPicker?.());
    section.querySelector('[data-enhance-card="tools"]')?.addEventListener('click', openBusinessTools);
    section.querySelector('[data-enhance-card="design"]')?.addEventListener('click', openDesignAdvanced);
    section.querySelector('[data-enhance-card="about"]')?.addEventListener('click', openAboutAdvanced);
    if (window.lucide) lucide.createIcons();
  }

  function run() {
    injectEnhancementStyles();
    renderQuickSocialIcons();
    mountSocialPicker();
    mountPostSetupEnhancer();
    window.setTimeout(() => {
      renderQuickSocialIcons();
      mountSocialPicker();
      mountPostSetupEnhancer();
    }, 180);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
