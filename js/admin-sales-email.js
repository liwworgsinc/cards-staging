(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  let state = null;

  const verticalNames = {
    barber: 'Barber', nail: 'Nail Tech / Nail Artist', restaurant: 'Restaurant / Food',
    real_estate: 'Real Estate / Realtor', contractor: 'Contractor / Construction',
    tax: 'Tax / Accounting / Business', tattoo: 'Tattoo / Piercing', general: 'General fallback'
  };

  function showGuard(title, text, action = '') {
    el('sales-email-auth').hidden = false;
    el('sales-auth-title').textContent = title;
    el('sales-auth-text').textContent = text;
    const link = el('sales-auth-action');
    link.hidden = !action;
    if (action) link.href = action;
  }

  function showApp() {
    el('sales-email-auth').hidden = true;
    el('sales-email-app').hidden = false;
  }

  function fmtDate(value) {
    if (!value) return 'Never';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleString();
  }

  async function invoke(action, extra = {}) {
    const { data, error } = await supabaseClient.functions.invoke('sales-email-nurture-staging', { body: { action, ...extra } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  function renderTop() {
    const counts = state?.queueCounts || {};
    el('sales-provider').textContent = state?.resendConfigured ? 'Resend connected' : 'Resend needs attention';
    el('sales-provider').className = 'sales-pill ' + (state?.resendConfigured ? 'ok' : 'bad');
    el('sales-opted').textContent = String(Number(state?.optedInCount || 0));
    el('sales-queued').textContent = String(Number(counts.queued || 0));
    el('sales-sent').textContent = String(Number(counts.sent || 0));
    el('sales-attention').textContent = String(Number(counts.failed || 0) + Number(counts.suppressed || 0));
    const enabled = Boolean(state?.automationEnabled);
    el('sales-enabled').checked = enabled;
    el('sales-enabled-label').textContent = enabled ? 'Running' : 'Paused';
    el('sales-heading').textContent = enabled ? 'Staging sales delivery is ON' : 'Staging sales delivery is paused';
    const summary = state?.lastRunSummary || {};
    const pieces = Object.entries(summary).filter(([key, value]) => key !== 'refresh' && Number.isFinite(Number(value))).map(([key, value]) => `${key.replaceAll('_',' ')}: ${value}`);
    el('sales-last-run').textContent = state?.lastRunAt ? `Last run ${fmtDate(state.lastRunAt)}${pieces.length ? ' · ' + pieces.join(' · ') : ''}` : 'No sales run yet.';
  }

  function renderSequences() {
    const sequences = state?.sequences || [];
    const groups = new Map();
    sequences.forEach(item => {
      if (!groups.has(item.vertical)) groups.set(item.vertical, []);
      groups.get(item.vertical).push(item);
    });
    const box = el('sales-sequences');
    box.innerHTML = [...groups.entries()].map(([vertical, items]) => `
      <section class="vertical-box">
        <div class="vertical-head"><h3>${esc(verticalNames[vertical] || vertical)}</h3><span class="sales-pill ok">${items.filter(x => x.enabled).length}/3 on</span></div>
        <div class="sequence-list">${items.sort((a,b) => a.step_no - b.step_no).map(item => `
          <article class="sequence-card" data-sales-sequence="${esc(item.sequence_key)}">
            <div class="sequence-head"><div><strong>Step ${Number(item.step_no)} · ${esc(item.label)}</strong><span>${Number(item.delay_hours) === 0 ? 'Immediate after opt-in' : `About ${Number(item.delay_hours)} hours after opt-in`}</span></div><label class="sales-toggle"><input type="checkbox" data-field="enabled" ${item.enabled ? 'checked' : ''}><span>${item.enabled ? 'On' : 'Off'}</span></label></div>
            <div class="sequence-grid">
              <label><span>Delay hours</span><input class="input" type="number" min="0" data-field="delayHours" value="${Number(item.delay_hours || 0)}"></label>
              <label class="wide"><span>Subject</span><input class="input" data-field="subject" value="${esc(item.subject)}"></label>
              <label class="wide"><span>Email copy</span><textarea class="input" data-field="bodyText">${esc(item.body_text)}</textarea></label>
            </div>
            <div class="sequence-actions"><button class="btn btn-primary" data-save="${esc(item.sequence_key)}">Save</button><button class="btn btn-light" data-test="${esc(item.sequence_key)}">Send test to me</button></div>
          </article>`).join('')}</div>
      </section>`).join('') || '<div class="empty">No sales sequences found.</div>';

    box.querySelectorAll('[data-field="enabled"]').forEach(input => input.addEventListener('change', () => {
      const label = input.nextElementSibling;
      if (label) label.textContent = input.checked ? 'On' : 'Off';
    }));
    box.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => saveSequence(button.dataset.save, button)));
    box.querySelectorAll('[data-test]').forEach(button => button.addEventListener('click', () => sendTest(button.dataset.test, button)));
  }

  function renderQueue() {
    const queue = state?.queue || [];
    el('sales-queue').innerHTML = queue.length ? queue.map(item => `
      <div class="log-row"><div><strong>${esc(String(item.sequence_key || '').replaceAll('_',' '))}</strong><span>Due ${esc(fmtDate(item.due_at))}</span>${item.last_error ? `<small>${esc(item.last_error)}</small>` : ''}</div><div><span class="log-status ${esc(item.status)}">${esc(item.status)}</span><small>Attempts: ${Number(item.attempt_count || 0)}</small></div></div>`).join('') : '<div class="empty">No sales email jobs yet.</div>';
  }

  function renderLog() {
    const logs = state?.logs || [];
    el('sales-log').innerHTML = logs.length ? logs.map(item => `
      <div class="log-row"><div><strong>${esc(String(item.sequence_key || '').replaceAll('_',' '))}</strong><span>${esc(item.recipient_email || '')}</span>${item.provider_error ? `<small>${esc(item.provider_error)}</small>` : ''}</div><div><span class="log-status ${esc(item.status || 'failed')}">${esc(item.status || 'failed')}</span><small>${esc(fmtDate(item.created_at))}</small></div></div>`).join('') : '<div class="empty">No sales email activity yet.</div>';
  }

  function render() {
    renderTop(); renderSequences(); renderQueue(); renderLog();
  }

  async function load() {
    state = await invoke('status');
    render();
  }

  function sequenceCard(key) {
    return document.querySelector(`[data-sales-sequence="${CSS.escape(key)}"]`);
  }

  async function saveSequence(key, button) {
    const card = sequenceCard(key);
    if (!card) return;
    const subject = card.querySelector('[data-field="subject"]').value.trim();
    const bodyText = card.querySelector('[data-field="bodyText"]').value.trim();
    if (!subject || !bodyText) return notify('Subject and email copy are required.');
    button.disabled = true;
    try {
      await invoke('update_sequence', {
        sequenceKey: key,
        enabled: card.querySelector('[data-field="enabled"]').checked,
        delayHours: Math.max(0, Number(card.querySelector('[data-field="delayHours"]').value) || 0),
        subject, bodyText
      });
      notify('Sales email step saved.');
      await load();
    } catch (error) { notify(error?.message || 'Could not save the sales email step.'); }
    finally { button.disabled = false; }
  }

  async function sendTest(key, button) {
    const original = button.textContent;
    button.disabled = true; button.textContent = 'Sending…';
    try {
      const result = await invoke('send_test', { sequenceKey: key });
      notify(`Test sent to ${result.recipient || 'your admin email'}.`);
    } catch (error) { notify(error?.message || 'Could not send the test email.'); }
    finally { button.disabled = false; button.textContent = original; }
  }

  async function setEnabled(enabled) {
    await invoke('set_enabled', { enabled });
    await load();
  }

  async function dryRun(button) {
    const original = button.textContent; button.disabled = true; button.textContent = 'Checking…';
    try {
      const data = await invoke('dry_run');
      notify(`${Number(data.dueCount || 0)} sales email${Number(data.dueCount || 0) === 1 ? '' : 's'} due right now.`);
      await load();
    } catch (error) { notify(error?.message || 'Could not check the sales queue.'); }
    finally { button.disabled = false; button.textContent = original; }
  }

  async function runNow(button) {
    if (!state?.automationEnabled) return notify('Turn staging sales delivery on first.');
    if (!confirm('Run staging sales follow-up now? This can send real email to opted-in sales leads that are due.')) return;
    const original = button.textContent; button.disabled = true; button.textContent = 'Running…';
    try {
      const data = await invoke('run');
      notify(`Sales follow-up complete. Sent: ${Number(data?.summary?.sent || 0)}.`);
      await load();
    } catch (error) { notify(error?.message || 'Could not run sales follow-up.'); }
    finally { button.disabled = false; button.textContent = original; }
  }

  async function bootstrap() {
    try {
      if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') throw new Error('The staging auth runtime did not load.');
      const user = await requireUser();
      if (!user) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        showGuard('Admin access required', 'Sales Email Follow-up is only available to LIW Cards administrators.', 'dashboard.html');
        return;
      }
      showApp();
      await load();
      el('sales-enabled').addEventListener('change', async event => {
        const input = event.currentTarget; input.disabled = true;
        try {
          await setEnabled(input.checked);
          notify(input.checked ? 'Staging sales delivery enabled.' : 'Staging sales delivery paused.');
        } catch (error) {
          input.checked = !input.checked;
          notify(error?.message || 'Could not change sales delivery status.');
        } finally { input.disabled = false; }
      });
      el('sales-dry-run').addEventListener('click', event => dryRun(event.currentTarget));
      el('sales-run-now').addEventListener('click', event => runNow(event.currentTarget));
      el('sales-refresh').addEventListener('click', async event => {
        const button = event.currentTarget; button.disabled = true;
        try { await load(); notify('Sales Email refreshed.'); }
        catch (error) { notify(error?.message || 'Could not refresh sales email.'); }
        finally { button.disabled = false; }
      });
    } catch (error) {
      console.error('Sales Email startup failed', error);
      showGuard('Sales Email could not start', error?.message || 'The staging sales email tools could not connect.', 'admin-email-growth.html');
    }
  }

  bootstrap();
})();
