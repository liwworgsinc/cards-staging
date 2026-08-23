const signatureState = {
  user: null,
  cards: [],
  selectedCard: null,
  template: 'modern'
};

const $sig = id => document.getElementById(id);

(async function initEmailSignatureGenerator() {
  const user = await requireUser();
  if (!user) return;

  signatureState.user = user;
  setupSignatureEvents();
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
    renderSignature();
    setSignatureStatus('No cards yet — you can still build a signature manually.');
    $sig('signature-empty-note')?.removeAttribute('hidden');
  }

  $sig('signature-user-email').textContent = user.email || '';
  $sig('signature-user-chip').textContent = (user.email || 'U').slice(0, 1).toUpperCase();
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
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      renderSignature();
    });
  });

  $sig('signature-reset')?.addEventListener('click', () => {
    const id = $sig('signature-card-select')?.value;
    if (id) loadCardIntoSignature(id);
    else {
      fillSignatureForm({ email: signatureState.user?.email || '' });
      renderSignature();
    }
  });

  $sig('signature-copy')?.addEventListener('click', copyRichSignature);
  $sig('signature-copy-html')?.addEventListener('click', copySignatureHtml);
  $sig('signature-download')?.addEventListener('click', downloadSignatureHtml);
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
  const accent = normalizeHexColor(card.button_color || card.primary_color || '#5b5cf0');

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
    'signature-accent': values.accent ?? '#5b5cf0',
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
    accent: normalizeHexColor($sig('signature-accent')?.value || '#5b5cf0'),
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
  preview.innerHTML = buildSignatureMarkup(data, signatureState.template);
  $sig('signature-preview-label').textContent = signatureTemplateName(signatureState.template);
}

function buildSignatureMarkup(data, template = 'modern') {
  if (template === 'compact') return compactSignature(data);
  if (template === 'branded') return brandedSignature(data);
  return modernSignature(data);
}

function modernSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 74);
  const companyLine = data.showCompany && data.company
    ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#475467;font-weight:600;">${escapeSignatureHtml(data.company)}</div>`
    : '';
  const titleLine = data.title
    ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#667085;">${escapeSignatureHtml(data.title)}</div>`
    : '';
  const contact = contactRows(data, accent);
  const cta = signatureCta(data, accent);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <tr>
      ${photo}
      <td style="vertical-align:top;padding:${photo ? '0 0 0 16px' : '0'};border-left:${photo ? `2px solid ${accent}` : '0'};${photo ? 'padding-left:16px;' : ''}">
        <div style="font-size:18px;line-height:22px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
        ${titleLine}${companyLine}
        <div style="height:7px;line-height:7px;font-size:7px;">&nbsp;</div>
        ${contact}
        ${cta}
      </td>
    </tr>
  </table>`;
}

function compactSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 54);
  const secondary = [data.title, data.showCompany ? data.company : ''].filter(Boolean).map(escapeSignatureHtml).join(' · ');
  const links = compactContactLinks(data, accent);
  const cta = signatureCta(data, accent, true);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <tr>
      ${photo}
      <td style="vertical-align:middle;padding:${photo ? '0 0 0 12px' : '0'};">
        <div style="font-size:16px;line-height:20px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
        ${secondary ? `<div style="font-size:12px;line-height:18px;color:#667085;">${secondary}</div>` : ''}
        ${links ? `<div style="margin-top:4px;font-size:12px;line-height:18px;">${links}</div>` : ''}
        ${cta}
      </td>
    </tr>
  </table>`;
}

function brandedSignature(data) {
  const accent = data.accent;
  const photo = signaturePhotoCell(data, 68);
  const company = data.showCompany && data.company ? escapeSignatureHtml(data.company) : '';
  const contact = contactRows(data, accent);
  const cta = signatureCta(data, accent);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#101828;min-width:300px;">
    <tr><td colspan="2" style="height:4px;background:${accent};font-size:4px;line-height:4px;">&nbsp;</td></tr>
    <tr>
      <td colspan="2" style="padding-top:12px;${company ? '' : 'padding-bottom:2px;'}">
        ${company ? `<div style="font-size:11px;line-height:16px;letter-spacing:.7px;text-transform:uppercase;font-weight:700;color:${accent};">${company}</div>` : ''}
      </td>
    </tr>
    <tr>
      ${photo}
      <td style="vertical-align:top;padding:${photo ? '0 0 0 14px' : '0'};">
        <div style="font-size:18px;line-height:22px;font-weight:700;color:#101828;">${escapeSignatureHtml(data.name || 'Your name')}</div>
        ${data.title ? `<div style="font-size:13px;line-height:19px;color:#667085;">${escapeSignatureHtml(data.title)}</div>` : ''}
        <div style="height:6px;line-height:6px;font-size:6px;">&nbsp;</div>
        ${contact}
        ${cta}
      </td>
    </tr>
  </table>`;
}

function signaturePhotoCell(data, size) {
  const url = safeSignatureUrl(data.profileImage);
  if (!data.showPhoto || !url) return '';
  return `<td style="vertical-align:top;padding:0;"><img src="${escapeSignatureHtml(url)}" width="${size}" height="${size}" alt="${escapeSignatureHtml(data.name || 'Profile photo')}" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:50%;object-fit:cover;"></td>`;
}

function contactRows(data, accent) {
  const rows = [];
  if (data.email) rows.push(signatureLinkRow('Email', `mailto:${data.email}`, data.email, accent));
  if (data.phone) rows.push(signatureLinkRow('Phone', `tel:${data.phone.replace(/[^+\d]/g, '')}`, data.phone, accent));
  if (data.website) {
    const url = safeSignatureUrl(withHttps(data.website));
    if (url) rows.push(signatureLinkRow('Web', url, readableUrl(data.website), accent));
  }
  return rows.join('');
}

function signatureLinkRow(label, href, value, accent) {
  const safeHref = href.startsWith('mailto:') || href.startsWith('tel:') ? href : safeSignatureUrl(href);
  if (!safeHref) return '';
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#667085;"><span style="color:#98a2b3;">${label}:</span> <a href="${escapeSignatureHtml(safeHref)}" style="color:${accent};text-decoration:none;">${escapeSignatureHtml(value)}</a></div>`;
}

function compactContactLinks(data, accent) {
  const links = [];
  if (data.email) links.push(`<a href="mailto:${escapeSignatureHtml(data.email)}" style="color:${accent};text-decoration:none;">Email</a>`);
  if (data.phone) links.push(`<a href="tel:${escapeSignatureHtml(data.phone.replace(/[^+\d]/g, ''))}" style="color:${accent};text-decoration:none;">Call</a>`);
  if (data.website) {
    const url = safeSignatureUrl(withHttps(data.website));
    if (url) links.push(`<a href="${escapeSignatureHtml(url)}" style="color:${accent};text-decoration:none;">Website</a>`);
  }
  return links.join(`<span style="color:#d0d5dd;"> &nbsp;|&nbsp; </span>`);
}

function signatureCta(data, accent, compact = false) {
  const url = safeSignatureUrl(data.cardUrl);
  if (!data.showCta || !url) return '';
  if (compact) {
    return `<div style="margin-top:5px;font-size:12px;line-height:18px;"><a href="${escapeSignatureHtml(url)}" style="color:${accent};font-weight:700;text-decoration:none;">${escapeSignatureHtml(data.ctaLabel)} →</a></div>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:9px;"><tr><td bgcolor="${accent}" style="border-radius:6px;background:${accent};"><a href="${escapeSignatureHtml(url)}" style="display:inline-block;padding:7px 11px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeSignatureHtml(data.ctaLabel)}</a></td></tr></table>`;
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
  const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeSignatureHtml(data.name || 'LIW')} email signature</title></head><body style="padding:24px;background:#ffffff;">${signature}</body></html>`;
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
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#5b5cf0';
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
