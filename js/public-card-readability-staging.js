/* LIW Cards staging: visitor text preference with a movable floating Aa control.
   It never mutates the card owner's saved design. */
(function () {
  'use strict';
  if (window.LIWCardReadability) return;

  const KEY = 'liw_cards_reading_size_v1';
  const POS_KEY = 'liw_cards_reading_fab_pos_v1';
  const allowed = ['normal', 'large', 'extra'];
  const options = { normal:16, large:18, extra:20 };
  const EDGE = 10;

  let selected = 'normal';
  let dialog = null;
  let trigger = null;
  let floating = null;
  let queued = false;
  let suppressClick = false;

  try {
    const stored = localStorage.getItem(KEY);
    if (allowed.includes(stored)) selected = stored;
  } catch (_) {}

  function card() { return document.getElementById('card'); }
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

  function apply() {
    const root = card();
    if (root) root.dataset.liwReadingSize = selected;

    document.querySelectorAll('[data-liw-reading-trigger]').forEach(button => {
      button.setAttribute('aria-label', 'Text size: ' + selected + '. Change text size. Drag to move.');
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
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
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

  function setPosition(x, y) {
    if (!floating) return;
    const width = floating.offsetWidth || 52;
    const height = floating.offsetHeight || 52;
    const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
    const maxY = Math.max(EDGE, window.innerHeight - height - EDGE);

    floating.style.left = clamp(x, EDGE, maxX) + 'px';
    floating.style.top = clamp(y, EDGE, maxY) + 'px';
    floating.style.right = 'auto';
    floating.style.bottom = 'auto';
  }

  function savePosition() {
    if (!floating) return;
    const rect = floating.getBoundingClientRect();
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        x: Math.round(rect.left),
        y: Math.round(rect.top)
      }));
    } catch (_) {}
  }

  function restorePosition() {
    if (!floating) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (_) {}

    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      setPosition(saved.x, saved.y);
    } else {
      floating.style.left = 'auto';
      floating.style.top = 'auto';
      floating.style.right = '14px';
      floating.style.bottom = '88px';
    }
  }

  function clampCurrentPosition() {
    if (!floating || floating.hidden || !floating.style.left) return;
    const rect = floating.getBoundingClientRect();
    setPosition(rect.left, rect.top);
    savePosition();
  }

  function makeDraggable(button) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let moved = false;

    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const rect = button.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originX = rect.left;
      originY = rect.top;
      moved = false;
      button.setPointerCapture?.(pointerId);
      button.classList.add('is-dragging');
    });

    button.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) moved = true;
      if (!moved) return;

      event.preventDefault();
      suppressClick = true;
      setPosition(originX + dx, originY + dy);
    });

    function finish(event) {
      if (pointerId !== event.pointerId) return;
      if (button.hasPointerCapture?.(pointerId)) button.releasePointerCapture(pointerId);
      pointerId = null;
      button.classList.remove('is-dragging');
      if (moved) savePosition();
      setTimeout(() => { suppressClick = false; }, 0);
    }

    button.addEventListener('pointerup', finish);
    button.addEventListener('pointercancel', finish);
  }

  function ensureFloatingTrigger() {
    if (floating && floating.isConnected) return floating;

    floating = document.createElement('button');
    floating.type = 'button';
    floating.className = 'liw-reading-floating';
    floating.dataset.liwReadingTrigger = 'true';
    floating.setAttribute('aria-haspopup', 'dialog');
    floating.setAttribute('aria-controls', 'liw-reading-dialog');
    floating.title = 'Text size — drag to move';
    floating.innerHTML = '<span aria-hidden="true">Aa</span>';

    floating.addEventListener('click', event => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      openDialog(floating);
    });

    makeDraggable(floating);
    document.body.appendChild(floating);
    restorePosition();
    return floating;
  }

  function sync() {
    queued = false;
    const root = card();
    if (!root) return;

    root.dataset.liwReadingSize = selected;
    const button = ensureFloatingTrigger();
    button.hidden = Boolean(root.hidden);
    apply();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  }

  document.addEventListener('liw:public-card-ready', schedule);
  document.addEventListener('liw:public-card-rendered', schedule);
  window.addEventListener('resize', clampCurrentPosition, {passive:true});

  function start() {
    schedule();
    const root = card();
    if (root) {
      const observer = new MutationObserver(records => {
        if (records.some(record =>
          record.type === 'childList' ||
          (record.type === 'attributes' && record.target === root)
        )) schedule();
      });
      observer.observe(root, {
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:['hidden','class']
      });
    }
  }

  window.LIWCardReadability = {
    choose,
    getSize:() => selected,
    sync:schedule,
    resetButtonPosition:() => {
      try { localStorage.removeItem(POS_KEY); } catch (_) {}
      restorePosition();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
  schedule();
})();
