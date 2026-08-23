const signatureState = {
  user: null,
  cards: [],
  selectedCard: null,
  template: 'modern'
};

const $sig = id => document.getElementById(id);
const SIGNATURE_COLORS = ['#6D3CF0','#5B5CF0','#2563EB','#0F4C81','#0891B2','#0F766E','#16A34A','#D97706','#EA580C','#E11D48','#C026D3','#111827'];

(async function initEmailSignatureGenerator() {
  const user = await requireUser();
  if (!user) return;

  signatureState.user = user;
  setupSignatureEvents();
  setupSignatureColorPicker();
  setSignatureStatus('Loading your cards…');

  const { data: cards, error } = await supabaseClient
    .from('digital_cards')
    .select('id,internal_label,full_name,job_title,company_name,phone,email,website,profile_image_url,slug,status,primary_color,button_color,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    setSignatureStatus(error.message, true);
    return;
  }

  signatureState.cards = cards || [];
  populateCardPicker();

  if (signatureState.cards.length) {
    loadCardIntoSignature(signatureState.cards[0].id);
    setSignatureStatus('Ready');
  } else {
    fillSignatureForm({ email: user.email || '' });
    syncSignatureColorUi('#6D3CF0');
    renderSignature();
    setSignatureStatus('No cards yet — you can still build a signature manually.');
    $sig('signature-empty-note')?.removeAttribute('hidden');
  }

  const emailNode = $sig('signature-user-email');
  if (emailNode) emailNode.textContent = user.email || '';
  const chip = $sig('signature-user-chip');
  if (chip) chip.textContent = (user.email || 'U').slice(0, 1).toUpperCase();

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('open'));
  if (window.lucide) lucide.createIcons();
})();

function setupSignatureEvents() {
  $sig('signature-card-select')?.addEventListener('change', event => loadCardIntoSignature(event.target.value));

  document.querySelectorAll('[data-signature-input]').forEach(input => {
    input.addEventListener('input', renderSignature);
    input.addEventListener('change', renderSignature);
  });

  document.querySelectorAll('[data-signature-template]').forEach(button => {
    button.addEventListener('click', () => {
      signatureState.template = button.dataset.signatureTemplate;
      document.querySelectorAll('[data-signature-template]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderSignature();
      document.querySelector('.sig-preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  $sig('signature-reset')?.addEventListener('click', () => {
    const id = $sig('signature-card-select')?.value;
    if (id) loadCardIntoSignature(id);
    else {
      fillSignatureForm({ email: signatureState.user?.email || '' });
      syncSignatureColorUi('#6D3CF0');
      renderSignature();
    }
  });

  $sig('signature-copy')?.addEventListener('click', copyRichSignature);
  $sig('signature-copy-html')?.addEventListener('click', copySignatureHtml);
  $sig('signature-download')?.addEventListener('click', downloadSignatureHtml);
}

function setupSignatureColorPicker() {
  const swatches = $sig('signature-color-swatches');
  const trigger = $sig('signature-color-trigger');
  const popover = $sig('signature-color-popover');
  const custom = $sig('signature-custom-hex');
  const apply = $sig('signature-apply-hex');
  if (!swatches || !trigger || !popover || !custom || !apply) return;

  swatches.innerHTML = SIGNATURE_COLORS.map(color => `<button class="sig-swatch" type="button" data-color="${color}" aria-label="Use ${color}" style="--swatch:${color}"></button>`).join('');

  trigger.addEventListener('click', () => {
    const open = popover.hidden;
    popover.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  swatches.addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    applySignatureColor(button.dataset.color);
  });

  apply.addEventListener('click', () => applySignatureColor(custom.value));
  custom.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applySignatureColor(custom.value);
    }
    if (event.key === 'Escape') {
      popover.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', event => {
    const control = $sig('signature-color-control');
    if (!popover.hidden && control && !control.contains(event.target)) {
      popover.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  syncSignatureColorUi($sig('signature-accent')?.value || '#6D3CF0');
}

function applySignatureColor(value) {
  const color = normalizeHexColor(value);
  const input = $sig('signature-accent');
  if (!input) return;
  input.value = color;
  syncSignatureColorUi(color);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncSignatureColorUi(value) {
  const color = normalizeHexColor(value);
  const control = $sig('signature-color-control');
  const valueNode = $sig('signature-color-value');
  const custom = $sig('signature-custom-hex');
  if (control) control.style.setProperty('--sig-active-color', color);
  if (valueNode) valueNode.textContent = color.toUpperCase();
  if (custom && document.activeElement !== custom) custom.value = color.toUpperCase();
  document.querySelectorAll('.sig-swatch').forEach(button => button.classList.toggle('active', button.dataset.color?.toUpperCase() === color.toUpperCase()));
}

function populateCardPicker() {
  const select = $sig('signature-card-select');
  if (!select) return;
  if (!signatureState.cards.length) {
    select.innerHTML = '<option value="">No cards yet</option>';
    select.disabled = true;
    return;
  }

  select.innerHTML = signatureState.cards.map(card => {
    const name = card.internal_label || card.company_name || card.full_name || 'Untitled card';
    const status = card.status === 'published' ? 'Published' : 'Draft';
    return `<option value="${escapeSignatureHtml(card.id)}">${escapeSignatureHtml(name)} · ${status}</option>`;
  }).join('');
}

function loadCardIntoSignature(cardId) {
  const card = signatureState.cards.find(item => item.id === cardId);
  if (!card) return;
  signatureState.selectedCard = card;

  const cardUrl = card.slug ? liwUrl(`card.html?slug=${encodeURIComponent(card.slug)}`) : '';
  const accent = normalizeHexColor(card.button_color || card.primary_color || '#6D3CF0');

  fillSignatureForm({
    fullName: card.full_name || '',
    jobTitle: card.job_title || '',
    company: card.company_name || '',
    email: card.email || signatureState.user?.email || '',
    phone: card.phone || '',
    website: card.website || '',
    cardUrl,
    ctaLabel: 'View my digital card',
    accent,
    profileImage: card.profile_image_url || ''
  });

  syncSignatureColorUi(accent);
  renderSignature();
}

function fillSignatureForm(values = {}) {
  const mapping = {
    'signature-name': values.fullName ?? '',
    'signature-title': values.jobTitle ?? '',
    'signature-company': values.company ?? '',
    'signature-email': values.email ?? '',
    'signature-phone': values.phone ?? '',
    'signature-website': values.website ?? '',
    'signature-card-url': values.cardUrl ?? '',
    'signature-cta-label': values.ctaLabel ?? 'View my digital card',
    'signature-accent': values.accent ?? '#6D3CF0',
    'signature-profile-image': values.profileImage ?? ''
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const element = $sig(id);
    if (element) element.value = value;
  });
}

function readSignatureForm() {
  return {
    name: ($sig('signature-name')?.value || '').trim(),
    title: ($sig('signature-title')?.value || '').trim(),
    company: ($sig('signature-company')?.value || '').trim(),
    email: ($sig('signature-email')?.value || '').trim(),
    phone: ($sig('signature-phone')?.value || '').trim(),
    website: ($sig('signature-website')?.value || '').trim(),
    cardUrl: ($sig('signature-card-url')?.value || '').trim(),
    ctaLabel: ($sig('signature-cta-label')?.value || '').trim() || 'View my digital card',
    accent: normalizeHexColor($sig('signature-accent')?.value || '#6D3CF0'),
    profileImage: ($sig('signature-profile-image')?.value || '').trim(),
    showPhoto: Boolean($sig('signature-show-photo')?.checked),
    showCompany: Boolean($sig('signature-show-company')?.checked),
    showCta: Boolean($sig('signature-show-cta')?.checked)
  };
}

function renderSignature() {
  const data = readSignatureForm();
  const preview = $sig('signature-preview');
  if (!preview) return;
  preview.dataset.template = signatureState.template;
  preview.innerHTML = buildSignatureMarkup(data, signatureState.template);
  const label = $sig('signature-preview-label');
  if (label) label.textContent = signatureTemplateName(signatureState.template);
}

function buildSignatureMarkup(data, template = 'modern') {
  if (template === 'compact') return compactSignature(data);
  if (template === 'branded') return brandedSignature(data);
  return modernSignature(data);
}

function modernSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 62, 'padding-right:14px;');
  const titleCompany = identitySubtitle(data);
  const contacts = inlineContactLinks(data, accent);
  const cta = signatureTextCta(data, accent);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:440px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <tr>
      ${photo}
      <td style="vertical-align:middle;min-width:0;${photo ? `border-left:2px solid ${accent};padding-left:14px;` : ''}">
        <div style="font-size:18px;line-height:22px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
        ${titleCompany}
        ${cta}
      </td>
    </tr>
    ${contacts ? `<tr><td colspan="2" style="padding-top:12px;border-top:1px solid #eaecf0;"><div style="padding-top:9px;font-size:12px;line-height:19px;color:#667085;">${contacts}</div></td></tr>` : ''}
  </table>`;
}

function compactSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 46, 'padding-right:11px;');
  const titleCompany = identitySubtitle(data, true);
  const contacts = inlineContactLinks(data, accent, true);
  const cta = signatureTextCta(data, accent, true);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:420px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <tr>
      ${photo}
      <td style="vertical-align:middle;min-width:0;">
        <div style="font-size:16px;line-height:20px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
        ${titleCompany}
        ${contacts ? `<div style="margin-top:3px;font-size:11px;line-height:18px;color:#667085;">${contacts}</div>` : ''}
        ${cta}
      </td>
    </tr>
  </table>`;
}

function brandedSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 58, 'padding-right:13px;');
  const titleCompany = identitySubtitle(data);
  const contactTable = stackedContactTable(data, accent);
  const cta = signatureButtonCta(data, accent);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:460px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <tr><td style="height:4px;background:${accent};font-size:4px;line-height:4px;border-radius:4px 4px 0 0;">&nbsp;</td></tr>
    <tr><td style="padding-top:14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
        <tr>${photo}<td style="vertical-align:middle;min-width:0;">
          <div style="font-size:19px;line-height:23px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
          ${titleCompany}
        </td></tr>
      </table>
    </td></tr>
    ${contactTable ? `<tr><td style="padding-top:11px;">${contactTable}</td></tr>` : ''}
    ${cta ? `<tr><td style="padding-top:11px;">${cta}</td></tr>` : ''}
  </table>`;
}

function identitySubtitle(data, compact = false) {
  const bits = [];
  if (data.title) bits.push(escapeSignatureHtml(data.title));
  if (data.showCompany && data.company) bits.push(`<strong style="font-weight:700;color:#475467;">${escapeSignatureHtml(data.company)}</strong>`);
  if (!bits.length) return '';
  const separator = compact ? ' · ' : '<span style="color:#d0d5dd;"> &nbsp;|&nbsp; </span>';
  return `<div style="margin-top:${compact ? '1px' : '2px'};font-size:${compact ? '11px' : '12px'};line-height:${compact ? '17px' : '18px'};color:#667085;">${bits.join(separator)}</div>`;
}

function signaturePhotoCell(data, size, extraStyle = '') {
  const url = safeSignatureUrl(data.profileImage);
  if (!data.showPhoto || !url) return '';
  return `<td width="${size + 14}" style="width:${size + 14}px;vertical-align:middle;${extraStyle}"><img src="${escapeSignatureHtml(url)}" width="${size}" height="${size}" alt="${escapeSignatureHtml(data.name || 'Profile photo')}" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:50%;object-fit:cover;"></td>`;
}

function inlineContactLinks(data, accent, compact = false) {
  const items = [];
  if (data.email) items.push(signatureInlineLink(`mailto:${data.email}`, data.email, accent));
  if (data.phone) items.push(signatureInlineLink(`tel:${data.phone.replace(/[^+\d]/g, '')}`, data.phone, accent));
  if (data.website) {
    const url = safeSignatureUrl(withHttps(data.website));
    if (url) items.push(signatureInlineLink(url, readableUrl(data.website), accent));
  }
  if (!items.length) return '';
  const divider = compact ? '<span style="color:#d0d5dd;"> &nbsp;·&nbsp; </span>' : '<span style="color:#d0d5dd;"> &nbsp;•&nbsp; </span>';
  return items.join(divider);
}

function signatureInlineLink(href, label, accent) {
  const safeHref = href.startsWith('mailto:') || href.startsWith('tel:') ? href : safeSignatureUrl(href);
  if (!safeHref) return '';
  return `<a href="${escapeSignatureHtml(safeHref)}" style="display:inline-block;color:${accent};text-decoration:none;word-break:break-word;">${escapeSignatureHtml(label)}</a>`;
}

function stackedContactTable(data, accent) {
  const rows = [];
  if (data.email) rows.push(stackedContactRow('Email', `mailto:${data.email}`, data.email, accent));
  if (data.phone) rows.push(stackedContactRow('Phone', `tel:${data.phone.replace(/[^+\d]/g, '')}`, data.phone, accent));
  if (data.website) {
    const url = safeSignatureUrl(withHttps(data.website));
    if (url) rows.push(stackedContactRow('Web', url, readableUrl(data.website), accent));
  }
  if (!rows.length) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">${rows.join('')}</table>`;
}

function stackedContactRow(label, href, value, accent) {
  const safeHref = href.startsWith('mailto:') || href.startsWith('tel:') ? href : safeSignatureUrl(href);
  if (!safeHref) return '';
  return `<tr>
    <td width="48" style="width:48px;padding:1px 8px 1px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#98a2b3;">${label}</td>
    <td style="padding:1px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;min-width:0;"><a href="${escapeSignatureHtml(safeHref)}" style="color:${accent};text-decoration:none;word-break:break-word;">${escapeSignatureHtml(value)}</a></td>
  </tr>`;
}

function signatureTextCta(data, accent, compact = false) {
  const url = safeSignatureUrl(data.cardUrl);
  if (!data.showCta || !url) return '';
  return `<div style="margin-top:${compact ? '4px' : '6px'};font-size:${compact ? '11px' : '12px'};line-height:18px;"><a href="${escapeSignatureHtml(url)}" style="color:${accent};font-weight:700;text-decoration:none;">${escapeSignatureHtml(data.ctaLabel)} →</a></div>`;
}

function signatureButtonCta(data, accent) {
  const url = safeSignatureUrl(data.cardUrl);
  if (!data.showCta || !url) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td bgcolor="${accent}" style="border-radius:7px;background:${accent};"><a href="${escapeSignatureHtml(url)}" style="display:inline-block;padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeSignatureHtml(data.ctaLabel)}</a></td></tr></table>`;
}

function buildPlainSignature(data = readSignatureForm()) {
  const lines = [data.name];
  if (data.title) lines.push(data.title);
  if (data.showCompany && data.company) lines.push(data.company);
  if (data.email) lines.push(data.email);
  if (data.phone) lines.push(data.phone);
  if (data.website) lines.push(data.website);
  if (data.showCta && data.cardUrl) lines.push(`${data.ctaLabel}: ${data.cardUrl}`);
  return lines.filter(Boolean).join('\n');
}

async function copyRichSignature() {
  const button = $sig('signature-copy');
  const html = buildSignatureMarkup(readSignatureForm(), signatureState.template);
  const plain = buildPlainSignature();
  setSignatureButtonBusy(button, true, 'Copying…');
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
    } else {
      fallbackRichCopy(html);
    }
    setSignatureStatus('Signature copied — paste it into your email signature settings.');
  } catch (error) {
    try {
      fallbackRichCopy(html);
      setSignatureStatus('Signature copied — paste it into your email signature settings.');
    } catch {
      setSignatureStatus('Your browser blocked rich copy. Use Copy HTML instead.', true);
    }
  } finally {
    setSignatureButtonBusy(button, false);
  }
}

function fallbackRichCopy(html) {
  const host = document.createElement('div');
  host.contentEditable = 'true';
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.innerHTML = html;
  document.body.appendChild(host);
  const range = document.createRange();
  range.selectNodeContents(host);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  const ok = document.execCommand('copy');
  selection.removeAllRanges();
  host.remove();
  if (!ok) throw new Error('Copy failed');
}

async function copySignatureHtml() {
  const button = $sig('signature-copy-html');
  const html = buildSignatureMarkup(readSignatureForm(), signatureState.template);
  setSignatureButtonBusy(button, true, 'Copying…');
  try {
    await navigator.clipboard.writeText(html);
    setSignatureStatus('HTML copied to clipboard.');
  } catch {
    setSignatureStatus('Could not copy HTML in this browser.', true);
  } finally {
    setSignatureButtonBusy(button, false);
  }
}

function downloadSignatureHtml() {
  const data = readSignatureForm();
  const signature = buildSignatureMarkup(data, signatureState.template);
  const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeSignatureHtml(data.name || 'LIW')} email signature</title></head><body style="padding:24px;background:#ffffff;">${signature}</body></html>`;
  const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const base = (data.name || 'liw-email-signature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'liw-email-signature';
  anchor.href = url;
  anchor.download = `${base}-email-signature.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setSignatureStatus('Signature HTML downloaded.');
}

function signatureTemplateName(template) {
  return template === 'compact' ? 'Compact' : template === 'branded' ? 'Branded CTA' : 'Modern';
}

function withHttps(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, '')}`;
}

function safeSignatureUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function readableUrl(value) {
  return String(value || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function normalizeHexColor(value) {
  let color = String(value || '').trim();
  if (/^[0-9a-f]{6}$/i.test(color)) color = `#${color}`;
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '#6D3CF0';
}

function escapeSignatureHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);
}

function setSignatureStatus(message, isError = false) {
  const status = $sig('signature-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function setSignatureButtonBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-circle" size="16"></i> ${escapeSignatureHtml(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
  if (window.lucide) lucide.createIcons();
}
