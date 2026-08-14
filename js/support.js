const LIW_SUPPORT_EMAIL = 'support@liwworgs.com';
let liwSupportUser = null;

function supportToast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__supportToastTimer);
  window.__supportToastTimer = window.setTimeout(() => element.classList.remove('show'), 3200);
}

function supportPageLabel() {
  const raw = new URLSearchParams(location.search).get('from') || '';
  return raw ? raw.replace(/\.html$/i, '').replace(/[-_]+/g, ' ') : 'support center';
}

function supportRequestData() {
  return {
    name: document.getElementById('support-name')?.value.trim() || '',
    email: document.getElementById('support-email')?.value.trim() || '',
    topic: document.getElementById('support-topic')?.value.trim() || '',
    subject: document.getElementById('support-subject')?.value.trim() || '',
    message: document.getElementById('support-message')?.value.trim() || '',
    source: document.getElementById('support-source-page')?.value.trim() || supportPageLabel()
  };
}

function supportRequestText(data = supportRequestData()) {
  return [
    'LIW Cards Support Request',
    '',
    `Name: ${data.name || 'Not provided'}`,
    `Account email: ${data.email || 'Not provided'}`,
    `Topic: ${data.topic || 'General support'}`,
    `Page: ${data.source || 'Support center'}`,
    '',
    data.message || 'Please describe the issue.',
    '',
    `Browser: ${navigator.userAgent}`
  ].join('\n');
}

function gmailComposeUrl(data = supportRequestData()) {
  const subject = `LIW Cards Support — ${data.subject || data.topic || 'Help request'}`;
  const body = supportRequestText(data);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(LIW_SUPPORT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openSupportUrl(url) {
  const opened = window.open(url, '_blank');
  if (opened) opened.opener = null;
  else window.location.href = url;
}

async function copySupportText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  supportToast(successMessage);
}

async function personalizeSupportPage() {
  const source = supportPageLabel();
  document.getElementById('support-source-page').value = source;
  document.getElementById('support-page-status').textContent = source.replace(/\b\w/g, char => char.toUpperCase());

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    liwSupportUser = user || null;
    if (!user) {
      document.getElementById('support-account-status').textContent = 'Not signed in';
      return;
    }

    document.getElementById('support-email').value = user.email || '';
    const { data: profile } = await supabaseClient.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const name = String(profile?.full_name || user.user_metadata?.full_name || '').trim();
    if (name) document.getElementById('support-name').value = name;
    document.getElementById('support-account-status').textContent = user.email || 'Signed in';
  } catch (_) {
    document.getElementById('support-account-status').textContent = 'Unable to check account';
  }
}

function validateSupportRequest() {
  const form = document.getElementById('support-request-form');
  if (!form.reportValidity()) return null;
  return supportRequestData();
}

function bindSupportActions() {
  const quickData = () => ({
    name: document.getElementById('support-name')?.value.trim() || '',
    email: document.getElementById('support-email')?.value.trim() || '',
    topic: 'General support',
    subject: 'Help request',
    message: 'Hello LIW Cards Support,\n\nI need help with my account.',
    source: supportPageLabel()
  });

  const gmail = document.getElementById('support-gmail');
  if (gmail) {
    gmail.href = gmailComposeUrl(quickData());
    gmail.addEventListener('click', () => { gmail.href = gmailComposeUrl(quickData()); });
  }

  document.getElementById('support-copy-email')?.addEventListener('click', () => copySupportText(LIW_SUPPORT_EMAIL, 'Support email copied'));

  document.getElementById('support-request-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = validateSupportRequest();
    if (!data) return;
    openSupportUrl(gmailComposeUrl(data));
    supportToast('Gmail opened with your request');
  });

  document.getElementById('support-copy-request')?.addEventListener('click', () => {
    const data = validateSupportRequest();
    if (!data) return;
    copySupportText(supportRequestText(data), 'Support request copied');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindSupportActions();
  await personalizeSupportPage();
  if (window.lucide) lucide.createIcons();
});