(function () {
  const DEFAULTS = {
    hours: { appearance: 'luxe', layout: 'compact' },
    gallery: { appearance: 'luxe', layout: 'mosaic' },
    testimonials: { appearance: 'luxe', layout: 'spotlight' },
    faq: { appearance: 'luxe', layout: 'accordion' },
    location: { appearance: 'luxe', layout: 'map-first' },
    cta: { appearance: 'luxe', layout: 'split' },
    credentials: { appearance: 'luxe', layout: 'badges' },
    featured_links: { appearance: 'luxe', layout: 'cards' }
  };

  const LAYOUTS = {
    hours: [['classic','Classic rows'],['compact','Compact'],['split','Two-column']],
    gallery: [['grid','Grid'],['mosaic','Mosaic'],['filmstrip','Filmstrip']],
    testimonials: [['stack','Stack'],['cards','Cards'],['spotlight','Spotlight']],
    faq: [['accordion','Accordion'],['minimal','Minimal'],['boxed','Boxed']],
    location: [['map-first','Map first'],['compact','Compact']],
    cta: [['stack','Stacked'],['split','Two-up'],['pill','Pill buttons']],
    credentials: [['tiles','Tiles'],['badges','Badges'],['minimal','Minimal']],
    featured_links: [['cards','Cards'],['split','Two-column'],['minimal','Minimal']]
  };

  const state = new Map();
  let editorObserver = null;
  let publicObserver = null;
  let editorStateWired = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function safeValue(type, key) {
    const defaults = DEFAULTS[type] || { appearance: 'luxe', layout: 'classic' };
    return state.get(type)?.[key] ?? defaults[key] ?? '';
  }

  function setState(type, content) {
    state.set(type, {
      appearance: content?.appearance || DEFAULTS[type]?.appearance || 'luxe',
      layout: content?.layout || DEFAULTS[type]?.layout || 'classic',
      accent: content?.accent || 'gold',
      heading_align: content?.heading_align || 'left',
      display_title: content?.display_title || '',
      display_kicker: content?.display_kicker || ''
    });
  }

  async function resolveCardId(mode) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        if (mode === 'editor' && typeof currentId !== 'undefined' && currentId) return currentId;
        if (mode === 'public' && typeof publicCard !== 'undefined' && publicCard?.id) return publicCard.id;
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return null;
  }

  async function loadState(mode) {
    if (typeof supabaseClient === 'undefined') return;
    const cardId = await resolveCardId(mode);
    if (!cardId) return;
    const { data } = await supabaseClient.from('card_sections').select('section_type,content').eq('card_id', cardId);
    (data || []).forEach(row => setState(row.section_type, row.content || {}));
    Object.keys(DEFAULTS).forEach(type => { if (!state.has(type)) setState(type, {}); });
  }

  function appearanceOptions(type) {
    const selected = safeValue(type, 'appearance');
    return [
      ['clean','Clean','Airy and simple'],
      ['luxe','Luxe','Gold detail + depth'],
      ['glass','Glass','Soft translucent surface'],
      ['bold','Bold','High-contrast statement']
    ].map(([value,label,copy]) => `<label class="rich-style-choice" data-style-choice="${value}"><input type="radio" name="rich-style-${type}" data-rich-type="${type}" data-rich-path="appearance" value="${value}" ${selected === value ? 'checked' : ''}><span class="rich-style-swatch rich-style-swatch-${value}"></span><span><strong>${label}</strong><small>${copy}</small></span></label>`).join('');
  }

  function layoutOptions(type) {
    const selected = safeValue(type, 'layout');
    return (LAYOUTS[type] || [['classic','Classic']]).map(([value,label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
  }

  function premiumControls(type) {
    const accent = safeValue(type, 'accent');
    const align = safeValue(type, 'heading_align');
    return `<details class="rich-premium-options">
      <summary><span><i data-lucide="sparkles" size="15"></i><strong>Style & layout</strong></span><small>Make this section feel premium</small></summary>
      <div class="rich-premium-body">
        <div class="rich-premium-label"><strong>Section style</strong><span>Choose the visual personality for this section.</span></div>
        <div class="rich-style-choices">${appearanceOptions(type)}</div>
        <div class="rich-grid-2 rich-premium-fields">
          <div class="rich-field"><label>Layout</label><select data-rich-type="${type}" data-rich-path="layout">${layoutOptions(type)}</select></div>
          <div class="rich-field"><label>Accent</label><select data-rich-type="${type}" data-rich-path="accent"><option value="gold" ${accent === 'gold' ? 'selected' : ''}>Gold</option><option value="brand" ${accent === 'brand' ? 'selected' : ''}>Card brand color</option><option value="dark" ${accent === 'dark' ? 'selected' : ''}>Deep navy</option></select></div>
        </div>
        <div class="rich-grid-2 rich-premium-fields">
          <div class="rich-field"><label>Heading alignment</label><select data-rich-type="${type}" data-rich-path="heading_align"><option value="left" ${align === 'left' ? 'selected' : ''}>Left</option><option value="center" ${align === 'center' ? 'selected' : ''}>Centered</option></select></div>
          <div class="rich-field"><label>Custom section heading</label><input data-rich-type="${type}" data-rich-path="display_title" value="${esc(safeValue(type, 'display_title'))}" placeholder="Use the default heading"></div>
        </div>
        <div class="rich-field"><label>Small heading label</label><input data-rich-type="${type}" data-rich-path="display_kicker" value="${esc(safeValue(type, 'display_kicker'))}" placeholder="Use the default label"></div>
      </div>
    </details>`;
  }

  function injectEditorControls() {
    let inserted = false;
    document.querySelectorAll('.rich-section-editor[data-rich-section]').forEach(details => {
      const type = details.dataset.richSection;
      if (!DEFAULTS[type] || details.querySelector('.rich-premium-options')) return;
      const enableRow = details.querySelector('.rich-enable-row');
      if (!enableRow) return;
      enableRow.insertAdjacentHTML('afterend', premiumControls(type));
      details.dataset.previewStyle = safeValue(type, 'appearance') || 'luxe';
      details.dataset.previewAccent = safeValue(type, 'accent') || 'gold';
      inserted = true;
    });
    if (inserted && window.lucide) lucide.createIcons();
  }

  function wireEditorState() {
    if (editorStateWired) return;
    editorStateWired = true;
    document.addEventListener('change', event => {
      const input = event.target.closest('.rich-premium-options [data-rich-type][data-rich-path]');
      if (!input) return;
      const type = input.dataset.richType;
      const path = input.dataset.richPath;
      const current = state.get(type) || {};
      current[path] = input.value;
      state.set(type, current);
      const details = input.closest('.rich-section-editor');
      if (details) {
        details.dataset.previewStyle = current.appearance || 'luxe';
        details.dataset.previewAccent = current.accent || 'gold';
      }
    });
  }

  async function bootEditor() {
    await loadState('editor');
    injectEditorControls();
    const stack = document.getElementById('rich-section-stack');
    if (stack && !editorObserver) {
      editorObserver = new MutationObserver(() => injectEditorControls());
      // Watch only the stack's direct children. Watching the whole subtree caused
      // an icon-render -> observer -> icon-render loop that could freeze the editor.
      editorObserver.observe(stack, { childList: true, subtree: false });
    }
    wireEditorState();
  }

  function accentValue(value) {
    if (value === 'brand') return 'var(--card-primary,#0b1438)';
    if (value === 'dark') return '#0b1438';
    return '#d4a84f';
  }

  function applyPublicStyles() {
    const container = document.getElementById('public-rich-sections');
    if (!container) return;
    container.querySelectorAll('.public-rich-section[data-public-rich]').forEach(section => {
      const type = section.dataset.publicRich;
      const current = state.get(type) || { ...DEFAULTS[type], accent: 'gold', heading_align: 'left' };
      section.dataset.richStyle = current.appearance || 'luxe';
      section.dataset.richLayout = current.layout || DEFAULTS[type]?.layout || 'classic';
      section.dataset.richAlign = current.heading_align || 'left';
      section.style.setProperty('--rich-accent', accentValue(current.accent || 'gold'));
      const heading = section.querySelector('.public-rich-head h2');
      const kicker = section.querySelector('.public-rich-head span');
      if (heading && current.display_title && heading.textContent !== current.display_title) heading.textContent = current.display_title;
      if (kicker && current.display_kicker && kicker.textContent !== current.display_kicker) kicker.textContent = current.display_kicker;
    });
  }

  function watchPublicContainer(container) {
    if (!container || publicObserver) return;
    publicObserver = new MutationObserver(() => applyPublicStyles());
    // The renderer replaces direct section children. Descendant mutations do not
    // need observation and can create needless render loops.
    publicObserver.observe(container, { childList: true, subtree: false });
  }

  async function bootPublic() {
    await loadState('public');
    applyPublicStyles();
    const container = document.getElementById('public-rich-sections');
    if (container) {
      watchPublicContainer(container);
      return;
    }
    const bodyObserver = new MutationObserver(() => {
      const found = document.getElementById('public-rich-sections');
      if (!found) return;
      bodyObserver.disconnect();
      applyPublicStyles();
      watchPublicContainer(found);
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    if (document.body.classList.contains('editor-page')) bootEditor();
    if (document.body.classList.contains('public-body')) bootPublic();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();