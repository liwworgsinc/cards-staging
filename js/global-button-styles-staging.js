/* LIW Cards staging — shared global button styles for editor + public card. */
(function installLiwGlobalButtonStyles(global) {
  'use strict';
  if (global.__LIW_GLOBAL_BUTTON_STYLES_STAGING__) return;
  global.__LIW_GLOBAL_BUTTON_STYLES_STAGING__ = true;

  const STYLE_OPTIONS = [
    ['filled', 'Filled'],
    ['outline', 'Outline'],
    ['soft', 'Soft'],
    ['ghost', 'Ghost'],
    ['glass', 'Glass'],
    ['gradient', 'Gradient']
  ];
  const VALID_STYLES = new Set(STYLE_OPTIONS.map(([value]) => value));
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
      body[data-liw-button-style] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style] .public-shell [class*="-cta"] :is(a,button){
        border-radius:var(--card-radius,16px)!important;
        transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease!important;
      }
      body[data-liw-button-style="filled"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="filled"] .public-shell [class*="-cta"] :is(a,button){
        background:var(--liw-global-button)!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 11px 25px color-mix(in srgb,var(--liw-global-button) 25%,transparent)!important;
      }
      body[data-liw-button-style="outline"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="outline"] .public-shell [class*="-cta"] :is(a,button){
        background:transparent!important;color:var(--liw-global-button)!important;border:1.5px solid var(--liw-global-button)!important;box-shadow:none!important;
      }
      body[data-liw-button-style="soft"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="soft"] .public-shell [class*="-cta"] :is(a,button){
        background:color-mix(in srgb,var(--liw-global-button) 14%,transparent)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 28%,transparent)!important;box-shadow:none!important;
      }
      body[data-liw-button-style="ghost"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="ghost"] .public-shell [class*="-cta"] :is(a,button){
        background:transparent!important;color:var(--liw-global-button)!important;border:1px solid transparent!important;box-shadow:none!important;
      }
      body[data-liw-button-style="glass"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="glass"] .public-shell [class*="-cta"] :is(a,button){
        background:color-mix(in srgb,#fff 72%,var(--liw-global-button) 8%)!important;color:var(--liw-global-button)!important;border:1px solid color-mix(in srgb,var(--liw-global-button) 24%,#fff)!important;box-shadow:0 10px 28px color-mix(in srgb,var(--liw-global-button) 14%,transparent)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      }
      body[data-liw-button-style="gradient"] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary),
      body[data-liw-button-style="gradient"] .public-shell [class*="-cta"] :is(a,button){
        background:linear-gradient(135deg,var(--liw-global-button),var(--liw-global-button-secondary))!important;color:var(--liw-global-button-text)!important;border:1px solid transparent!important;box-shadow:0 12px 28px color-mix(in srgb,var(--liw-global-button) 28%,transparent)!important;
      }
      body[data-liw-button-style] .public-shell :is(.primary-card-cta,.business-action.primary,.business-action.payment-action,.payment-share-button,.btn.btn-primary,[class*="-cta"] a,[class*="-cta"] button):focus-visible{
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
    select.title = 'Global CTA style: Filled, Outline, Soft, Ghost, Glass, or Gradient';
    return select;
  }

  function syncEditorStyle() {
    const select = ensureEditorOptions();
    if (!select) return;
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

    // Card hydration assigns select.value directly, so briefly watch for that programmatic load.
    let checks = 0;
    let lastSignature = '';
    const hydrationTimer = global.setInterval(() => {
      checks += 1;
      const select = ensureEditorOptions();
      if (select) {
        const signature = [select.value, fieldValue('button_color'), fieldValue('button_text_color'), fieldValue('secondary_color')].join('|');
        if (signature !== lastSignature) {
          lastSignature = signature;
          syncEditorStyle();
        }
      }
      if (checks >= 60) global.clearInterval(hydrationTimer);
    }, 250);
  }

  document.addEventListener('liw:public-card-ready', event => syncPublicStyle(event.detail?.card));
  document.addEventListener('liw:public-card-rendered', event => syncPublicStyle(event.detail?.card));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
