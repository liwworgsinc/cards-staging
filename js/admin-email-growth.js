(() => {
  const TABLE = 'staging_growth_email_sequences';
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  let sequences = [];
  let logs = [];
  let currentRecipient = '';
  let automationStatus = null;

  function showGuard(title, text, action = '') {
    const guard = el('email-auth-guard');
    guard.hidden = false;
    el('email-auth-title').textContent = title;
    el('email-auth-text').textContent = text;
    const link = el('email-auth-action');
    link.hidden = !action;
    if (action) link.href = action;
  }

  function showApp() {
    el('email-auth-guard').hidden = true;
    el('email-app').hidden = false;
  }

  function renderStatus(resendConfigured) {
    el('email-provider-status').textContent = resendConfigured ? 'Resend connected' : 'Resend not configured';
    el('email-provider-status').className = `email-pill ${resendConfigured ? 'ok' : 'warn'}`;
    el('email-test-recipient').textContent = currentRecipient || 'Signed-in admin email';
  }

  function renderSequences() {
    const box = el('sequence-list');
    box.innerHTML = sequences.map((item, index) => `
      <article class="email-sequence" data-sequence="${esc(item.sequence_key)}">
        <div class="email-sequence-head">
          <div><span class="email-step">Step ${index + 1}</span><h2>${esc(item.label)}</h2></div>
          <label class="email-toggle"><input type="checkbox" data-field="enabled" ${item.enabled ? 'checked' : ''}><span>${item.enabled ? 'Enabled' : 'Disabled'}</span></label>
        </div>
        <div class="email-grid">
          <label><span>Delay (hours)</span><input class="input" type="number" min="0" data-field="delay_hours" value="${Number(item.delay_hours || 0)}"></label>
          <label class="wide"><span>Subject</span><input class="input" data-field="subject" value="${esc(item.subject)}"></label>
          <label class="wide"><span>Email copy</span><textarea class="input email-body" data-field="body_text">${esc(item.body_text)}</textarea></label>
        </div>
        <div class="email-actions">
          <button class="btn btn-primary" data-save="${esc(item.sequence_key)}">Save step</button>
          <button class="btn btn-light" data-test="${esc(item.sequence_key)}">Send test to me</button>
        </div>
      </article>`).join('');

    box.querySelectorAll('[data-field="enabled"]').forEach(input => {
      input.addEventListener('change', () => {
        const label = input.nextElementSibling;
        if (label) label.textContent = input.checked ? 'Enabled' : 'Disabled';
      });
    });
    box.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => saveSequence(button.dataset.save, button)));
    box.querySelectorAll('[data-test]').forEach(button => button.addEventListener('click', () => sendTest(button.dataset.test, button)));
  }

  function fmtDate(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }

  function renderAutomation() {
    const status = automationStatus || {};
    const counts = status.queueCounts || {};
    const toggle = el('email-automation-enabled');
    const label = el('email-automation-label');
    if (toggle) toggle.checked = Boolean(status.automationEnabled);
    if (label) label.textContent = status.automationEnabled ? 'Running' : 'Paused';

    ['queued','sent','skipped','suppressed','failed'].forEach(key => {
      const target = el('email-queue-' + key);
      if (target) target.textContent = String(Number(counts[key] || 0));
    });

    const lastRun = el('email-last-run');
    if (lastRun) {
      const summary = status.lastRunSummary || {};
      const pieces = Object.entries(summary)
        .filter(([key, value]) => key !== 'refresh' && Number.isFinite(Number(value)))
        .map(([key, value]) => key.replaceAll('_',' ') + ': ' + value);
      lastRun.textContent = status.lastRunAt
        ? 'Last run ' + fmtDate(status.lastRunAt) + (pieces.length ? ' · ' + pieces.join(' · ') : '')
        : 'No automation run yet.';
    }

    const queueBox = el('automation-queue');
    const queue = status.queue || [];
    if (queueBox) {
      queueBox.innerHTML = queue.length ? queue.map(item => `
        <div class="email-log-row">
          <div><strong>${esc(String(item.sequence_key || '').replaceAll('_',' '))}</strong><span>Due ${esc(fmtDate(item.due_at))}</span>${item.last_error ? `<small>${esc(item.last_error)}</small>` : ''}</div>
          <div><span class="email-log-status ${esc(item.status)}">${esc(item.status)}</span><small>Attempts: ${Number(item.attempt_count || 0)}</small></div>
        </div>`).join('') : '<div class="email-empty">No automation jobs yet.</div>';
    }

    const suppressionBox = el('email-suppressions');
    const suppressions = status.suppressions || [];
    if (suppressionBox) {
      suppressionBox.innerHTML = suppressions.length ? suppressions.map(item => `
        <div class="email-log-row">
          <div><strong>${esc(item.email)}</strong><span>${esc(item.reason || 'suppressed')}</span></div>
          <div><small>${esc(fmtDate(item.suppressed_at))}</small></div>
        </div>`).join('') : '<div class="email-empty">No suppressed staging addresses.</div>';
    }
  }

  function renderLogs() {
    const box = el('delivery-log');
    if (!logs.length) {
      box.innerHTML = '<div class="email-empty">No staging test emails sent yet.</div>';
      return;
    }
    box.innerHTML = logs.map(item => `
      <div class="email-log-row">
        <div><strong>${esc(item.sequence_key.replaceAll('_',' '))}</strong><span>${esc(item.recipient_email)}</span></div>
        <div><span class="email-log-status ${esc(item.status || 'failed')}">${esc(item.status)}</span><small>${new Date(item.created_at).toLocaleString()}</small></div>
      </div>`).join('');
  }

  function sequenceCard(key) {
    return document.querySelector(`[data-sequence="${CSS.escape(key)}"]`);
  }

  async function saveSequence(key, button) {
    const card = sequenceCard(key);
    if (!card) return;
    const payload = {
      enabled: card.querySelector('[data-field="enabled"]').checked,
      delay_hours: Math.max(0, Number(card.querySelector('[data-field="delay_hours"]').value) || 0),
      subject: card.querySelector('[data-field="subject"]').value.trim(),
      body_text: card.querySelector('[data-field="body_text"]').value.trim(),
      updated_at: new Date().toISOString()
    };
    if (!payload.subject || !payload.body_text) return notify('Subject and email copy are required.');
    button.disabled = true;
    const { data, error } = await supabaseClient.from(TABLE).update(payload).eq('sequence_key', key).select('*').single();
    button.disabled = false;
    if (error) return notify(error.message || 'Could not save this email step.');
    const index = sequences.findIndex(item => item.sequence_key === key);
    if (index >= 0) sequences[index] = data;
    notify('Email step saved in staging.');
  }

  async function sendTest(key, button) {
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const { data, error } = await supabaseClient.functions.invoke('growth-email-staging', { body: { action: 'send_test', sequenceKey: key } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      notify(data?.message || 'Staging test email sent.');
      await loadStatus();
    } catch (error) {
      notify(error?.message || 'Could not send the staging test email.');
    } finally {
      button.disabled = false;
      button.textContent = 'Send test to me';
    }
  }

  async function loadAutomationStatus() {
    const { data, error } = await supabaseClient.functions.invoke('email-nurture-staging', { body: { action: 'status' } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    automationStatus = data || {};
    renderAutomation();
  }

  async function setAutomationEnabled(enabled) {
    const payload = { automation_enabled: Boolean(enabled), updated_at: new Date().toISOString() };
    const { error } = await supabaseClient
      .from('staging_email_automation_config')
      .update(payload)
      .eq('singleton', true);
    if (error) throw error;
    await loadAutomationStatus();
  }

  async function dryRunAutomation(button) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Checking…';
    try {
      const { data, error } = await supabaseClient.functions.invoke('email-nurture-staging', { body: { action: 'dry_run' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      notify((data?.dueCount || 0) + ' nurture email' + ((data?.dueCount || 0) === 1 ? '' : 's') + ' due right now.');
      await loadAutomationStatus();
    } catch (error) {
      notify(error?.message || 'Could not check the nurture queue.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function runAutomationNow(button) {
    if (!automationStatus?.automationEnabled) {
      notify('Turn automation on before running nurture delivery.');
      return;
    }
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Running…';
    try {
      const { data, error } = await supabaseClient.functions.invoke('email-nurture-staging', { body: { action: 'run' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const sent = Number(data?.summary?.sent || 0);
      notify('Nurture run complete. Sent: ' + sent + '.');
      await Promise.all([loadStatus(), loadAutomationStatus()]);
    } catch (error) {
      notify(error?.message || 'Could not run nurture delivery.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function loadStatus() {
    const { data, error } = await supabaseClient.functions.invoke('growth-email-staging', { body: { action: 'status' } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    sequences = data.sequences || [];
    logs = data.logs || [];
    currentRecipient = data.recipient || '';
    renderStatus(Boolean(data.resendConfigured));
    renderSequences();
    renderLogs();
  }

  async function bootstrap() {
    try {
      if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') throw new Error('The staging auth runtime did not load.');
      const user = await requireUser();
      if (!user) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        showGuard('Admin access required', 'Email Growth is only available to LIW Cards administrators.', 'dashboard.html');
        return;
      }
      showApp();
      await Promise.all([loadStatus(), loadAutomationStatus()]);

      el('email-automation-enabled')?.addEventListener('change', async event => {
        const input = event.currentTarget;
        input.disabled = true;
        try {
          await setAutomationEnabled(input.checked);
          notify(input.checked ? 'Staging nurture automation enabled.' : 'Staging nurture automation paused.');
        } catch (error) {
          input.checked = !input.checked;
          notify(error?.message || 'Could not change automation status.');
        } finally {
          input.disabled = false;
        }
      });

      el('email-dry-run')?.addEventListener('click', event => dryRunAutomation(event.currentTarget));
      el('email-run-now')?.addEventListener('click', event => runAutomationNow(event.currentTarget));

      el('refresh-email-growth').addEventListener('click', async () => {
        el('refresh-email-growth').disabled = true;
        try { await Promise.all([loadStatus(), loadAutomationStatus()]); notify('Email Growth refreshed.'); }
        catch (error) { notify(error?.message || 'Could not refresh Email Growth.'); }
        finally { el('refresh-email-growth').disabled = false; }
      });
    } catch (error) {
      console.error('Email Growth startup failed', error);
      showGuard('Email Growth could not start', error?.message || 'The staging email tools could not connect.', 'admin-growth.html');
    }
  }

  bootstrap();
})();
