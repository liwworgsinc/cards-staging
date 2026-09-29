/* LIW Cards staging: a visitor's text preference, never a saved card-design mutation. */
(function () {
  'use strict';
  if (window.LIWCardReadability) return;
  const KEY = 'liw_cards_reading_size_v1';
  const allowed = ['normal', 'large', 'extra'];
  const options = { normal:16, large:18, extra:20 };
  let selected = 'normal';
  let dialog = null;
  let trigger = null;
  let queued = false;

  try {
    const stored = localStorage.getItem(KEY);
    if (allowed.includes(stored)) selected = stored;
  } catch (_) { /* private browsing can block storage */ }

  function card() { return document.getElementById('card'); }
  function apply() {
    const root = card();
    if (root) root.dataset.liwReadingSize = selected;
    document.querySelectorAll('[data-liw-reading-trigger]').forEach(button => {
      button.setAttribute('aria-label', 'Text size: ' + selected + '. Change text size');
      button.setAttribute('aria-expanded', String(Boolean(dialog && dialog.open)));
    });
    if (dialog) {
      dialog.querySelectorAll('[data-liw-reading-option]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.liwReadingOption === selected));
      });
      const status = dialog.querySelector('[data-liw-reading-status]');
      if (status) status.textContent = 'Text size: ' + options[selected] + ' pixels';
    }
  }

  function choose(level) {
    if (!allowed.includes(level)) return;
    selected = level;
    try { localStorage.setItem(KEY, level); } catch (_) {}
    apply();
  }

  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
  }
  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'liw-reading-dialog';
    dialog.className = 'liw-reading-dialog';
    dialog.setAttribute('aria-labelledby', 'liw-reading-title');
    dialog.innerHTML =
      '<div class="liw-reading-dialog-header"><div><h2 id="liw-reading-title">Text size</h2><p>Make this card easier to read.</p></div>' +
      '<button type="button" class="liw-reading-dialog-close" aria-label="Close text size options">×</button></div>' +
      '<div class="liw-reading-options" role="group" aria-label="Choose text size">' +
      '<button class="liw-reading-option" type="button" data-liw-reading-option="normal" aria-pressed="false"><strong>Normal</strong><small>16px · A</small></button>' +
      '<button class="liw-reading-option" type="button" data-liw-reading-option="large" aria-pressed="false"><strong>Comfortable</strong><small>18px · A+</small></button>' +
      '<button class="liw-reading-option" type="button" data-liw-reading-option="extra" aria-pressed="false"><strong>Extra large</strong><small>20px · A++</small></button></div>' +
      '<p class="liw-reading-note" data-liw-reading-status role="status" aria-live="polite"></p>' +
      '<p class="liw-reading-note">Your choice stays on this device and does not change the card owner’s design.</p>';
    document.body.appendChild(dialog);
    dialog.querySelector('.liw-reading-dialog-close').addEventListener('click', closeDialog);
    dialog.querySelectorAll('[data-liw-reading-option]').forEach(button => {
      button.addEventListener('click', () => choose(button.dataset.liwReadingOption));
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
      }
    });
    dialog.addEventListener('close', () => {
      apply();
      if (trigger && trigger.isConnected) trigger.focus({preventScroll:true});
      trigger = null;
    });
    apply();
    return dialog;
  }
  function openDialog(button) {
    const panel = ensureDialog();
    trigger = button;
    if (!panel.open) panel.showModal();
    apply();
    panel.querySelector('[aria-pressed="true"]')?.focus();
  }

  const hosts = [
    {selector:'.public-top-actions', buttonClass:'public-round-btn'},
    {selector:'.realtor-public-top-actions', buttonClass:'realtor-public-icon'},
    {selector:'.restaurant-public-top-actions', buttonClass:'restaurant-public-icon'}
  ];
  function sync() {
    queued = false;
    const root = card();
    if (!root) return;
    root.dataset.liwReadingSize = selected;
    hosts.forEach(({selector, buttonClass}) => {
      root.querySelectorAll(selector).forEach(host => {
        if (host.querySelector('[data-liw-reading-trigger]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = buttonClass + ' liw-reading-trigger';
        button.dataset.liwReadingTrigger = 'true';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', 'liw-reading-dialog');
        button.innerHTML = '<span aria-hidden="true">Aa</span>';
        button.addEventListener('click', () => openDialog(button));
        host.appendChild(button);
      });
    });
    apply();
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  }
  document.addEventListener('liw:public-card-ready', schedule);
  document.addEventListener('liw:public-card-rendered', schedule);
  function start() {
    schedule();
    const root = card();
    if (root) {
      const observer = new MutationObserver(records => {
        if (records.some(record => record.addedNodes.length || record.removedNodes.length)) schedule();
      });
      observer.observe(root, {childList:true, subtree:true});
    }
  }
  window.LIWCardReadability = { choose, getSize:() => selected, sync:schedule };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else start();
  schedule();
})();
