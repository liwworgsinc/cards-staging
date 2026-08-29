(() => {
  'use strict';
  if (!(location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/'))) return;
  if (!/\/dashboard(?:\.html)?$/.test(location.pathname)) return;
  if (window.__liwDashboardPerformanceGuardInstalled) return;
  window.__liwDashboardPerformanceGuardInstalled = true;

  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver !== 'function') return;

  class DashboardGuardedMutationObserver {
    constructor(callback) {
      this._observer = new NativeMutationObserver(callback);
    }

    observe(target, options) {
      const isSidebarTreeObserver = Boolean(
        target &&
        target.nodeType === 1 &&
        target.classList?.contains('sidebar') &&
        options?.childList &&
        options?.subtree
      );

      if (isSidebarTreeObserver) {
        console.warn('LIW staging: blocked continuous sidebar MutationObserver to protect dashboard performance.');
        return;
      }

      return this._observer.observe(target, options);
    }

    disconnect() {
      return this._observer.disconnect();
    }

    takeRecords() {
      return this._observer.takeRecords();
    }
  }

  window.MutationObserver = DashboardGuardedMutationObserver;

  // The premium sidebar initializes during the first moments after page load.
  // Restore the native constructor afterward so unrelated later features keep
  // normal browser behavior. Any blocked sidebar observer remains unattached.
  window.setTimeout(() => {
    if (window.MutationObserver === DashboardGuardedMutationObserver) {
      window.MutationObserver = NativeMutationObserver;
    }
  }, 4000);
})();
