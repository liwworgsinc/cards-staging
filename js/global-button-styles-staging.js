/* LIW Cards staging — shared global button styles for editor + public card. */
(function installLiwGlobalButtonStyles(global) {
  'use strict';
  if (global.__LIW_GLOBAL_BUTTON_STYLES_STAGING__) return;
  global.__LIW_GLOBAL_BUTTON_STYLES_STAGING__ = true;

  const STYLE_OPTIONS = [
    ['filled', 'Filled'],
    ['soft', 'Soft'],
    ['outline', 'Outline'],
    ['ghost', 'Ghost'],
    ['glass', 'Glass'],
    ['gradient', 'Gradient']
  ];
  const VALID_STYLES = new Set(STYLE_OPTIONS.map(([value]) => value));
  const STYLE_LABELS = new Set(STYLE_OPTIONS.map(([, label]) => label.toLowerCase()));
  const WATCHED_EDITOR_FIELDS = new Set(['button_style', 'button_color', 'button_text_color', 'primary_color', 'secondary_color']);

  function normalizeStyle(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return VALID_STYLES.has(normalized) ? normalized : 'filled';
  }

  function fieldValue(name, fallback = '') {
    const input = document.querySelector(`[name="${name}"]`);
    return String(input?.value || fallback).trim() || fallback;
  }

  function ensureStyleSheet() {
    if (document.getElementById('liw-global-button-styles-staging')) return;
    const style = document.createElement('style');
    style.id = 'liw-global-button-styles-staging';
    style.textContent = `
      /* Staging editor: one visible six-choice button style picker. */
      .liw-button-style-native{
        position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;
        overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;
      }
      .liw-button-style-picker{
        display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;width:100%!important;margin-top:8px!important;
      }
      .liw-button-style-option{
        position:relative!important;min-height:48px!important;padding:10px 12px!important;border:1px solid #d7ddea!important;
        border-radius:12px!important;background:#fff!important;color:#20283d!important;font:700 13px/1.2 inherit!important;
        cursor:pointer!important;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease,transform .16s ease!important;
      }
      .liw-button-style-option:hover{border-color:#9ca9c2!important;background:#f8faff!important;}
      .liw-button-style-option:focus-visible{outline:3px solid rgba(37,99,235,.2)!important;outline-offset:2px!important;}
      .liw-button-style-option[aria-pressed="true"]{
        border:2px solid #14213d!important;background:#f2f4f8!important;color:#111a33!important;
        box-shadow:0 0 0 2px rgba(20,33,61,.08)!important;
      }
      .liw-button-style-option[aria-pressed="true"]::after{
        content:'✓';position:absolute;right:8px;top:7px;width:16px;height:16px;border-radius:999px;background:#14213d;color:#fff;
        display:grid;place-items:center;font-size:11px;line-height:1;
      }
      .liw-button-style-option[data-style="outline"]{background:transparent!important;}
      .liw-button-style-option[data-style="soft"]{background:#f5f7fb!important;}
      .liw-button-style-option[data-style="ghost"]{border-color:transparent!important;background:transparent!important;text-decoration:underline;text-underline-offset:3px;}
      .liw-button-style-option[data-style="glass"]{background:rgba(255,255,255,.72)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.55),0 5px 14px rgba(15,23,42,.08)!important;}
      .liw-button-style-option[data-style="gradient"]{background:linear-gradient(135deg,#eef2ff,#f7ecff)!important;}
      .liw-button-style-help{display:flex;flex-direction:column;gap:3px;margin-top:8px;color:#69748e;font-size:12px;line-height:1.35;}
      .liw-button-style-help strong{color:#38445f;font-weight:700;}
      @media(max-width:640px){.liw-button-style-picker{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}

      /* Editor live preview — button style wins over legacy inline preview styles. */
      .phone[data-liw-button-style] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease!important;
      }
      .phone[data-liw-button-style="filled"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:var(--liw-global-button)!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 9px 22px color-mix(in srgb,var(--liw-global-button) 24%,transparent)!important;
      }
      .phone[data-liw-button-style="outline"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:transparent!important;color:var(--liw-global-button)!important;border:1.5px solid var(--liw-global-button)!important;box-shadow:none!important;
      }
      .phone[data-liw-button-style="soft"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:color-mix(in srgb,var(--liw-global-button) 14%,transparent)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 24%,transparent)!important;box-shadow:none!important;
      }
      .phone[data-liw-button-style="ghost"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:transparent!important;color:var(--liw-global-button)!important;border:1px solid transparent!important;box-shadow:none!important;
      }
      .phone[data-liw-button-style="glass"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:color-mix(in srgb,#fff 74%,var(--liw-global-button) 8%)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 24%,#fff)!important;box-shadow:0 8px 24px color-mix(in srgb,var(--liw-global-button) 12%,transparent)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
      }
      .phone[data-liw-button-style="gradient"] :is(.preview-save-contact,.preview-business-action.primary,.preview-payment-action){
        background:linear-gradient(135deg,var(--liw-global-button),var(--liw-global-button-secondary))!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 10px 24px color-mix(in srgb,var(--liw-global-button) 26%,transparent)!important;
      }

      /* Public card — shared CTAs plus CTA groups used by custom experiences. Social controls stay independent. */
      body[data-liw-button-style] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style] .public-shell [class*="-cta"] :is(a,button){
        border-radius:var(--card-radius,16px)!important;
        transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease!important;
      }
      body[data-liw-button-style="filled"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="filled"] .public-shell [class*="-cta"] :is(a,button){
        background:var(--liw-global-button)!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 11px 25px color-mix(in srgb,var(--liw-global-button) 25%,transparent)!important;
      }
      body[data-liw-button-style="outline"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="outline"] .public-shell [class*="-cta"] :is(a,button){
        background:transparent!important;color:var(--liw-global-button)!important;border:1.5px solid var(--liw-global-button)!important;box-shadow:none!important;
      }
      body[data-liw-button-style="soft"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="soft"] .public-shell [class*="-cta"] :is(a,button){
        background:color-mix(in srgb,var(--liw-global-button) 14%,transparent)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 28%,transparent)!important;box-shadow:none!important;
      }
      body[data-liw-button-style="ghost"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="ghost"] .public-shell [class*="-cta"] :is(a,button){
        background:transparent!important;color:var(--liw-global-button)!important;border:1px solid transparent!important;box-shadow:none!important;
      }
      body[data-liw-button-style="glass"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="glass"] .public-shell [class*="-cta"] :is(a,button){
        background:color-mix(in srgb,#fff 72%,var(--liw-global-button) 8%)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 24%,#fff)!important;box-shadow:0 10px 28px color-mix(in srgb,var(--liw-global-button) 14%,transparent)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      }
      body[data-liw-button-style="gradient"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta]),
      body[data-liw-button-style="gradient"] .public-shell [class*="-cta"] :is(a,button){
        background:linear-gradient(135deg,var(--liw-global-button),var(--liw-global-button-secondary))!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 12px 28px color-mix(in srgb,var(--liw-global-button) 28%,transparent)!important;
      }
      body[data-liw-button-style] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[data-liw-global-cta],[class*="-cta"] a,[class*="-cta"] button):focus-visible{
        outline:3px solid color-mix(in srgb,var(--liw-global-button) 36%,#fff)!important;outline-offset:3px!important;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureEditorOptions() {
    const select = document.getElementById('button_style') || document.querySelector('[name="button_style"]');
    if (!select || select.tagName !== 'SELECT') return null;
    STYLE_OPTIONS.forEach(([value, label]) => {
      if (select.querySelector(`option[value="${value}"]`)) return;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.classList.add('liw-button-style-native');
    select.title = 'Global CTA style: Filled, Soft, Outline, Ghost, Glass, or Gradient';
    return select;
  }

  function hideLegacyButtonStyleUi(group, select, picker) {
    if (!group) return;
    const legacyButtons = Array.from(group.querySelectorAll('button')).filter(button => {
      if (button.closest('.liw-button-style-picker')) return false;
      return STYLE_LABELS.has(String(button.textContent || '').trim().toLowerCase());
    });

    const legacyParents = new Set();
    legacyButtons.forEach(button => {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      const parent = button.parentElement;
      if (parent && parent !== group && !parent.contains(select) && parent !== picker) legacyParents.add(parent);
    });
    legacyParents.forEach(parent => {
      const matchingButtons = Array.from(parent.querySelectorAll('button')).filter(button => STYLE_LABELS.has(String(button.textContent || '').trim().toLowerCase()));
      if (matchingButtons.length >= 2) parent.hidden = true;
    });

    Array.from(group.querySelectorAll('.input-help,p,small')).forEach(node => {
      if (node.closest('.liw-button-style-help')) return;
      const copy = String(node.textContent || '').toLowerCase();
      if (copy.includes('selection updates the live card preview') || copy.includes('global cta style across supported')) node.hidden = true;
    });
  }

  function syncPickerState(select, picker) {
    if (!select || !picker) return;
    const active = normalizeStyle(select.value);
    picker.querySelectorAll('.liw-button-style-option').forEach(button => {
      const selected = button.dataset.style === active;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.classList.toggle('is-selected', selected);
    });
  }

  function ensureEditorPicker(select) {
    if (!select) return null;
    const group = select.closest('.form-group') || select.parentElement;
    if (!group) return null;

    let picker = group.querySelector('.liw-button-style-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.className = 'liw-button-style-picker';
      picker.setAttribute('role', 'group');
      picker.setAttribute('aria-label', 'Button style');
      picker.innerHTML = STYLE_OPTIONS.map(([value, label]) =>
        `<button class="liw-button-style-option" type="button" data-style="${value}" aria-pressed="false">${label}</button>`
      ).join('');
      select.insertAdjacentElement('afterend', picker);

      const help = document.createElement('div');
      help.className = 'liw-button-style-help';
      help.innerHTML = '<span>Your selection updates the live card preview immediately.</span><span><strong>6 global CTA styles:</strong> Filled, Soft, Outline, Ghost, Glass and Gradient.</span>';
      picker.insertAdjacentElement('afterend', help);

      picker.addEventListener('click', event => {
        const option = event.target.closest('.liw-button-style-option');
        if (!option) return;
        const next = normalizeStyle(option.dataset.style);
        if (select.value !== next) select.value = next;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncPickerState(select, picker);
        syncEditorStyle();
      });
    }

    hideLegacyButtonStyleUi(group, select, picker);
    syncPickerState(select, picker);
    return picker;
  }

  function syncEditorStyle() {
    const select = ensureEditorOptions();
    if (!select) return;
    const picker = ensureEditorPicker(select);
    syncPickerState(select, picker);

    const phone = document.getElementById('phone-preview');
    if (!phone) return;
    const style = normalizeStyle(select.value);
    const button = fieldValue('button_color', fieldValue('primary_color', '#0b1438'));
    const text = fieldValue('button_text_color', '#ffffff');
    const secondary = fieldValue('secondary_color', button);
    phone.dataset.liwButtonStyle = style;
    phone.style.setProperty('--liw-global-button', button);
    phone.style.setProperty('--liw-global-button-text', text);
    phone.style.setProperty('--liw-global-button-secondary', secondary);
  }

  function syncPublicStyle(cardData) {
    if (!cardData || typeof cardData !== 'object') return;
    const style = normalizeStyle(cardData.button_style);
    const primary = String(cardData.primary_color || '#0b1438');
    const button = String(cardData.button_color || primary);
    const text = String(cardData.button_text_color || '#ffffff');
    const secondary = String(cardData.secondary_color || button);
    const roots = [document.documentElement, document.body, document.getElementById('card')].filter(Boolean);
    roots.forEach(root => {
      root.dataset.liwButtonStyle = style;
      root.style.setProperty('--liw-global-button', button);
      root.style.setProperty('--liw-global-button-text', text);
      root.style.setProperty('--liw-global-button-secondary', secondary);
    });
    const card = document.getElementById('card');
    if (card) card.dataset.buttonStyle = style;
  }

  function boot() {
    ensureStyleSheet();
    syncEditorStyle();
    try {
      if (global.publicCard) syncPublicStyle(global.publicCard);
    } catch (_) {}

    document.addEventListener('input', event => {
      if (WATCHED_EDITOR_FIELDS.has(event.target?.name)) syncEditorStyle();
    }, true);
    document.addEventListener('change', event => {
      if (WATCHED_EDITOR_FIELDS.has(event.target?.name)) syncEditorStyle();
    }, true);

    // The legacy staging enhancer can build its 3-choice UI after this script.
    // Reconcile any late DOM additions and keep this six-choice picker authoritative.
    if (document.body) {
      let mutationQueued = false;
      const observer = new MutationObserver(() => {
        if (mutationQueued) return;
        mutationQueued = true;
        requestAnimationFrame(() => {
          mutationQueued = false;
          const select = ensureEditorOptions();
          if (select) ensureEditorPicker(select);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Card hydration assigns select.value directly; watch the initial load long enough
    // to catch an existing saved style and update the visible selected chip.
    let checks = 0;
    let lastSignature = '';
    const hydrationTimer = global.setInterval(() => {
      checks += 1;
      const select = ensureEditorOptions();
      if (select) {
        ensureEditorPicker(select);
        const signature = [select.value, fieldValue('button_color'), fieldValue('button_text_color'), fieldValue('secondary_color')].join('|');
        if (signature !== lastSignature) {
          lastSignature = signature;
          syncEditorStyle();
        }
      }
      if (checks >= 120) global.clearInterval(hydrationTimer);
    }, 250);
  }

  document.addEventListener('liw:public-card-ready', event => syncPublicStyle(event.detail?.card));
  document.addEventListener('liw:public-card-rendered', event => syncPublicStyle(event.detail?.card));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
