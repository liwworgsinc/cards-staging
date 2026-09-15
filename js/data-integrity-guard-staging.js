(function liwDataIntegrityGuard(){
  if (!window.LIW_IS_GITHUB_STAGING && !(location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/'))) return;

  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  const sessionId = (crypto.randomUUID ? crypto.randomUUID() : `liw-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const log = (event, details = {}) => {
    try {
      console.info('[LIW data safety]', JSON.stringify({ event, session_id: sessionId, page, ...details }));
    } catch {
      console.info('[LIW data safety]', event, details);
    }
  };

  function safeJson(value, fallback = null) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function editorGuard() {
    const cardId = new URLSearchParams(location.search).get('id');
    if (!cardId || !window.supabaseClient || typeof window.fetch !== 'function') return;

    let expectedRevision = null;
    let persistedUpdatedAt = null;
    let conflictActive = false;
    let revisionLoadError = null;

    const revisionPromise = (async () => {
      const { data, error } = await window.supabaseClient
        .from('digital_cards')
        .select('id,revision,updated_at')
        .eq('id', cardId)
        .maybeSingle();
      if (error) {
        revisionLoadError = error;
        log('revision_load_failed', { card_id: cardId, error: error.message || String(error) });
        return null;
      }
      if (!data) {
        revisionLoadError = new Error('Card not found');
        log('revision_load_missing', { card_id: cardId });
        return null;
      }
      expectedRevision = Number(data.revision);
      persistedUpdatedAt = data.updated_at || null;
      log('revision_loaded', { card_id: cardId, loaded_revision: expectedRevision, updated_at: persistedUpdatedAt });
      return expectedRevision;
    })();

    function disableEditorControls() {
      document.querySelectorAll('.editor-page button,.editor-page input,.editor-page select,.editor-page textarea').forEach(element => {
        if (!element.closest('[data-liw-concurrency-dialog]')) element.disabled = true;
      });
      document.querySelector('.editor-shell')?.setAttribute('aria-disabled', 'true');
    }

    function showConflict(message, kind = 'conflict') {
      conflictActive = true;
      disableEditorControls();
      if (document.querySelector('[data-liw-concurrency-dialog]')) return;

      const backdrop = document.createElement('div');
      backdrop.dataset.liwConcurrencyDialog = 'true';
      backdrop.setAttribute('role', 'alertdialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(11,20,56,.72);display:grid;place-items:center;padding:20px;backdrop-filter:blur(5px)';
      backdrop.innerHTML = `
        <div style="width:min(94vw,520px);background:#fff;color:#111827;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.3);font-family:inherit">
          <div style="font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px">LIW Cards data protection</div>
          <h2 style="margin:0 0 10px;font-size:1.35rem">${kind === 'missing' ? 'This card changed in another session' : 'This card was updated in another session.'}</h2>
          <p style="margin:0 0 8px;line-height:1.55;color:#4b5563">${message}</p>
          <p style="margin:0 0 20px;line-height:1.5;color:#4b5563;font-size:.92rem">This tab has been locked so it cannot overwrite the newer saved version.</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
            <a href="dashboard.html" style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border:1px solid #d1d5db;border-radius:12px;color:#111827;text-decoration:none;font-weight:700">Back to dashboard</a>
            <button type="button" data-liw-reload-latest style="min-height:42px;padding:0 17px;border:0;border-radius:12px;background:#0b1438;color:#fff;font:inherit;font-weight:800;cursor:pointer">Reload latest version</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      backdrop.querySelector('[data-liw-reload-latest]')?.addEventListener('click', () => location.reload());
    }

    function syntheticResponse(status, body) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function liwConcurrencyFetch(input, init) {
      const url = typeof input === 'string' ? input : input?.url || '';
      const isCardSave = /\/functions\/v1\/(save-card-state|save-designer-card-state)(?:\?|$)/.test(String(url));
      if (!isCardSave) return nativeFetch(input, init);

      if (conflictActive) {
        return syntheticResponse(409, {
          error: 'This card was updated in another session.',
          code: 'CARD_CONFLICT',
          cardId
        });
      }

      let requestBody = null;
      let nextInit = init ? { ...init } : {};
      try {
        const rawBody = init?.body ?? (input instanceof Request ? await input.clone().text() : null);
        requestBody = typeof rawBody === 'string' ? safeJson(rawBody) : rawBody;
      } catch (error) {
        log('save_body_parse_failed', { card_id: cardId, error: error?.message || String(error) });
      }
      if (!requestBody || typeof requestBody !== 'object') return nativeFetch(input, init);

      const requestCardId = String(requestBody.cardId || '').trim();
      if (requestCardId !== cardId) {
        log('save_blocked_card_id_mismatch', { card_id: cardId, request_card_id: requestCardId || null });
        showConflict('The editor could not verify that this save belongs to the card you opened. Reload the latest version before continuing.');
        return syntheticResponse(409, {
          error: 'The card ID changed while this editor was open.',
          code: 'CARD_ID_MISMATCH',
          cardId
        });
      }

      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) await revisionPromise;
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        log('save_blocked_revision_unavailable', { card_id: cardId, error: revisionLoadError?.message || null });
        return syntheticResponse(503, {
          error: 'LIW Cards could not verify the saved version yet. Your card was not overwritten. Please retry or reload.',
          code: 'CARD_REVISION_UNAVAILABLE',
          cardId
        });
      }

      requestBody.expectedRevision = expectedRevision;
      requestBody.editorSessionId = sessionId;
      nextInit.body = JSON.stringify(requestBody);
      log('save_attempt', {
        card_id: cardId,
        loaded_revision: expectedRevision,
        updated_at: persistedUpdatedAt,
        operation: 'save'
      });

      const response = await nativeFetch(input, nextInit);
      let payload = null;
      try { payload = await response.clone().json(); } catch { /* non-JSON response */ }

      const returnedRevision = Number(payload?.card?.revision ?? payload?.persistedRevision);
      if (Number.isInteger(returnedRevision) && returnedRevision > 0 && response.status !== 409) {
        expectedRevision = returnedRevision;
        persistedUpdatedAt = payload?.card?.updated_at || payload?.updatedAt || persistedUpdatedAt;
      }

      if (response.status === 409 && ['CARD_CONFLICT','CARD_REVISION_REQUIRED','CARD_ID_MISMATCH'].includes(payload?.code)) {
        log('save_conflict', {
          card_id: cardId,
          loaded_revision: expectedRevision,
          persisted_revision: payload?.persistedRevision ?? payload?.currentRevision ?? null,
          updated_at: payload?.updatedAt || null,
          operation: 'save',
          result: 'blocked'
        });
        showConflict('A newer saved version exists. Reload it before making any more changes in this tab.');
      } else if (response.status === 410 || payload?.code === 'CARD_MISSING') {
        log('save_missing_card', { card_id: cardId, loaded_revision: expectedRevision, operation: 'save', result: 'blocked' });
        showConflict('This card no longer exists in the database. It may have been deleted from another browser or session.', 'missing');
      } else if (!response.ok) {
        log('save_failed', {
          card_id: cardId,
          loaded_revision: expectedRevision,
          persisted_revision: payload?.persistedRevision ?? null,
          operation: 'save',
          result: 'error',
          status: response.status,
          code: payload?.code || null
        });
      } else {
        log('save_succeeded', {
          card_id: cardId,
          loaded_revision: requestBody.expectedRevision,
          persisted_revision: expectedRevision,
          updated_at: persistedUpdatedAt,
          operation: 'save',
          result: 'ok'
        });
      }

      return response;
    };
  }

  async function dashboardGuard() {
    if (!window.supabaseClient) return;
    const { data: authData, error: authError } = await window.supabaseClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user) return;

    const cacheKey = `liw-card-list-last-good:${user.id}`;
    const cached = safeJson(sessionStorage.getItem(cacheKey) || 'null');

    async function fetchCards() {
      const [ownedResult, membershipResult, hiddenResult] = await Promise.all([
        window.supabaseClient.from('digital_cards').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        window.supabaseClient.from('workspace_members').select('owner_user_id,role,status').eq('member_user_id', user.id).eq('status', 'active'),
        window.supabaseClient.from('hidden_shared_cards').select('card_id').eq('user_id', user.id)
      ]);
      if (ownedResult.error) throw ownedResult.error;
      if (membershipResult.error) throw membershipResult.error;
      if (hiddenResult.error) throw hiddenResult.error;

      const roles = new Map((membershipResult.data || []).map(row => [row.owner_user_id, row.role || 'viewer']));
      const sharedOwnerIds = [...roles.keys()].filter(ownerId => ownerId && ownerId !== user.id);
      let shared = [];
      if (sharedOwnerIds.length) {
        const sharedResult = await window.supabaseClient.from('digital_cards').select('*').in('user_id', sharedOwnerIds).order('updated_at', { ascending: false });
        if (sharedResult.error) throw sharedResult.error;
        const hiddenIds = new Set((hiddenResult.data || []).map(row => row.card_id));
        shared = (sharedResult.data || [])
          .filter(card => roles.has(card.user_id) && !hiddenIds.has(card.id))
          .map(card => ({ ...card, _team_role: roles.get(card.user_id) || 'viewer', _can_edit: roles.get(card.user_id) === 'editor' }));
      }

      const owned = ownedResult.data || [];
      return {
        owned,
        cards: [...owned, ...shared].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      };
    }

    function waitForRenderer(timeoutMs = 5000) {
      return new Promise(resolve => {
        const started = Date.now();
        const check = () => {
          if (typeof window.renderCards === 'function' && document.getElementById('card-list')) return resolve(true);
          if (Date.now() - started > timeoutMs) return resolve(false);
          setTimeout(check, 50);
        };
        check();
      });
    }

    function updateCounts(ownedCount) {
      const count = document.getElementById('card-count');
      const usage = document.getElementById('usage-count');
      if (count) count.textContent = String(ownedCount);
      if (usage) usage.textContent = String(ownedCount);
    }

    function showStaleNotice() {
      const list = document.getElementById('card-list');
      if (!list || list.querySelector('[data-liw-stale-card-notice]')) return;
      const notice = document.createElement('div');
      notice.dataset.liwStaleCardNotice = 'true';
      notice.style.cssText = 'grid-column:1/-1;padding:12px 14px;border:1px solid #f0c36d;border-radius:12px;background:#fff8e6;color:#6b4f00;font-size:.9rem';
      notice.innerHTML = '<strong>Showing your last known card list.</strong> LIW Cards could not refresh the database just now. No cards were deleted. <button type="button" data-liw-retry-cards style="border:0;background:transparent;color:inherit;text-decoration:underline;font:inherit;font-weight:800;cursor:pointer">Retry</button>';
      list.prepend(notice);
      notice.querySelector('[data-liw-retry-cards]')?.addEventListener('click', () => location.reload());
    }

    function showUnavailableState() {
      const list = document.getElementById('card-list');
      if (!list) return;
      list.innerHTML = `<div class="empty-state" style="grid-column:1/-1" data-liw-card-load-error>
        <span class="empty-icon">!</span>
        <h3>Your cards could not be refreshed</h3>
        <p class="muted">This is a loading error, not an empty account. LIW Cards did not delete anything.</p>
        <button class="btn btn-primary" type="button" data-liw-retry-cards>Retry loading cards</button>
      </div>`;
      list.querySelector('[data-liw-retry-cards]')?.addEventListener('click', () => location.reload());
    }

    let current = null;
    try {
      current = await fetchCards();
      sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), owned: current.owned, cards: current.cards }));
      log('dashboard_cards_refreshed', { user_id: user.id, card_count: current.owned.length, result: 'ok' });
    } catch (error) {
      log('dashboard_cards_fetch_failed', { user_id: user.id, error: error?.message || String(error), result: 'error' });
    }

    if (!(await waitForRenderer())) return;

    if (current) {
      const list = document.getElementById('card-list');
      const dashboardAlreadyHasCards = Boolean(list?.querySelector('.card-item'));
      if (!dashboardAlreadyHasCards && current.cards.length) {
        window.renderCards(current.cards, user.id);
        updateCounts(current.owned.length);
        log('dashboard_cards_restored_after_primary_fetch', { user_id: user.id, card_count: current.owned.length });
      }
      return;
    }

    const list = document.getElementById('card-list');
    if (list?.querySelector('.card-item')) return;

    if (cached && Array.isArray(cached.cards) && Array.isArray(cached.owned) && cached.cards.length) {
      window.renderCards(cached.cards, user.id);
      updateCounts(cached.owned.length);
      showStaleNotice();
      log('dashboard_cards_restored_from_cache', { user_id: user.id, card_count: cached.owned.length, cached_at: cached.at || null });
    } else {
      showUnavailableState();
    }
  }

  if (page === 'editor.html') editorGuard();
  if (page === 'dashboard.html') dashboardGuard();
})();
