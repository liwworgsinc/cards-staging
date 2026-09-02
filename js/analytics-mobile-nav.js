/* LIW Cards Staging — single-source mobile analytics drawer controller */
(function initAnalyticsMobileNav(){
  const body = document.body;
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (!body || !sidebar || !toggle) return;

  const mobileQuery = window.matchMedia('(max-width: 900px)');

  let closeButton = sidebar.querySelector('.analytics-sidebar-close');
  if (!closeButton) {
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'analytics-sidebar-close';
    closeButton.setAttribute('aria-label', 'Close menu');
    closeButton.innerHTML = '<i data-lucide="x"></i>';
    sidebar.prepend(closeButton);
  }

  let backdrop = document.querySelector('.analytics-nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'analytics-nav-backdrop';
    backdrop.setAttribute('aria-label', 'Close menu');
    sidebar.insertAdjacentElement('afterend', backdrop);
  }

  toggle.setAttribute('aria-controls', 'sidebar');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');

  function setOpen(open, returnFocus) {
    if (!mobileQuery.matches) open = false;
    sidebar.classList.toggle('open', open);
    body.classList.toggle('analytics-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    sidebar.setAttribute('aria-hidden', open || !mobileQuery.matches ? 'false' : 'true');
    if (open) {
      window.setTimeout(() => closeButton.focus({ preventScroll: true }), 80);
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  /* Capture phase prevents the legacy analytics toggle listener from firing too. */
  document.addEventListener('click', function(event){
    const trigger = event.target.closest('#sidebar-toggle');
    if (!trigger || !mobileQuery.matches) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setOpen(!sidebar.classList.contains('open'), false);
  }, true);

  closeButton.addEventListener('click', function(event){
    event.preventDefault();
    setOpen(false, true);
  });

  backdrop.addEventListener('click', function(){
    setOpen(false, true);
  });

  sidebar.addEventListener('click', function(event){
    if (!mobileQuery.matches) return;
    if (event.target.closest('a')) setOpen(false, false);
  });

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  function syncViewport(){
    if (!mobileQuery.matches) {
      sidebar.classList.remove('open');
      body.classList.remove('analytics-nav-open');
      sidebar.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'false');
    } else if (!sidebar.classList.contains('open')) {
      sidebar.setAttribute('aria-hidden', 'true');
    }
  }

  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', syncViewport);
  else mobileQuery.addListener(syncViewport);

  syncViewport();
  if (window.lucide) window.lucide.createIcons();
})();
