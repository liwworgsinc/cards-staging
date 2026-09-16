(() => {
  const TABLE = 'staging_growth_email_sequences';
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  let sequences = [];
  let logs = [];
  let currentRecipient = '';

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

  function renderLogs() {
    const box = el('delivery-log');
    if (!logs.length) {
      box.innerHTML = '<div class="email-empty">No staging test emails sent yet.</div>';
      return;
    }
    box.innerHTML = logs.map(item => `
      <div class="email-log-row">
        <div><strong>${esc(item.sequence_key.replaceAll('_',' '))}</strong><span>${esc(item.recipient_email)}</span></div>
        <div><span class="email-log-status ${item.status === 'sent' ? 'sent' : 'failed'}">${esc(item.status)}</span><small>${new Date(item.created_at).toLocaleString()}</small></div>
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
      await loadStatus();
      el('refresh-email-growth').addEventListener('click', async () => {
        el('refresh-email-growth').disabled = true;
        try { await loadStatus(); notify('Email Growth refreshed.'); }
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
