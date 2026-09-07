(() => {
  'use strict';
  if (window.__LIW_WALLET_IMPORT_TOOLS__) return;
  window.__LIW_WALLET_IMPORT_TOOLS__ = true;

  const HTML5_QR_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const $ = selector => document.querySelector(selector);
  const safe = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
  let qrScanner = null;
  let batchContacts = [];

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function notify(message) {
    try {
      if (typeof toast === 'function') {
        toast(message);
        return;
      }
    } catch (_) {}
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._walletImportTimer);
    node._walletImportTimer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing) {
      return new Promise((resolve, reject) => {
        if (!globalName || window[globalName]) return resolve(globalName ? window[globalName] : true);
        existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load scanner support.')), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(globalName ? window[globalName] : true);
      script.onerror = () => reject(new Error('Could not load scanner support.'));
      document.head.appendChild(script);
    });
  }

  function ensureStyle() {
    if ($('#liw-wallet-import-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-wallet-import-style';
    style.textContent = `
      .wallet-import-launch{display:inline-flex!important}
      .wallet-import-dialog{width:min(760px,calc(100vw - 22px));max-height:calc(100dvh - 22px);padding:0;border:0;border-radius:24px;background:#fff;color:#101828;box-shadow:0 30px 100px rgba(11,20,56,.3);overflow:auto}
      .wallet-import-dialog::backdrop{background:rgba(7,13,35,.65);backdrop-filter:blur(4px)}
      .wallet-import-panel{padding:22px}
      .wallet-import-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:17px}
      .wallet-import-head h2{margin:4px 0 4px;color:#0b1438;font-size:1.35rem}.wallet-import-head p{margin:0;color:#667085;font-size:.8rem;line-height:1.5}
      .wallet-import-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .wallet-import-method{display:flex;align-items:center;gap:12px;min-height:88px;padding:14px;border:1px solid #e4e7ec;border-radius:16px;background:#fff;color:#101828;text-align:left;cursor:pointer;font:inherit;transition:.16s ease}
      .wallet-import-method:hover{border-color:#c9b16e;box-shadow:0 8px 22px rgba(11,20,56,.07);transform:translateY(-1px)}
      .wallet-import-method>span{width:42px;height:42px;display:grid;place-items:center;flex:0 0 42px;border-radius:13px;background:#0b1438;color:#e5c77c}
      .wallet-import-method strong{display:block;font-size:.84rem}.wallet-import-method small{display:block;margin-top:3px;color:#667085;font-size:.68rem;line-height:1.35}
      .wallet-import-footnote{margin:13px 0 0;color:#667085;font-size:.68rem;line-height:1.45;text-align:center}
      .wallet-tool-view[hidden]{display:none!important}.wallet-tool-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 13px;padding:0;border:0;background:transparent;color:#475467;font:inherit;font-size:.75rem;font-weight:800;cursor:pointer}
      .wallet-tool-card{padding:15px;border:1px solid #e4e7ec;border-radius:16px;background:#f9fafb}.wallet-tool-card h3{margin:0 0 5px;color:#0b1438;font-size:1rem}.wallet-tool-card p{margin:0;color:#667085;font-size:.76rem;line-height:1.5}
      .wallet-tool-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:15px}
      .wallet-paper-preview{display:block;width:100%;max-height:280px;object-fit:contain;margin-top:12px;border-radius:13px;background:#eef0f4}
      .wallet-ocr-progress{height:8px;margin-top:13px;border-radius:999px;background:#e9edf3;overflow:hidden}.wallet-ocr-progress>span{display:block;height:100%;width:0;background:#0b1438;transition:width .2s ease}
      .wallet-status{margin:9px 0 0;color:#667085;font-size:.72rem;line-height:1.45}.wallet-status.error{color:#b42318}.wallet-status.success{color:#167746}
      #liw-wallet-qr-reader{width:100%;overflow:hidden;margin-top:12px;border-radius:15px;background:#111827}#liw-wallet-qr-reader video{border-radius:14px}
      .wallet-batch-list{display:grid;gap:8px;max-height:360px;overflow:auto;margin-top:12px;padding-right:2px}.wallet-batch-row{display:flex;align-items:flex-start;gap:10px;padding:11px;border:1px solid #e4e7ec;border-radius:13px;background:#fff}.wallet-batch-row input{width:18px;height:18px;margin-top:2px;accent-color:#0b1438}.wallet-batch-row strong{display:block;color:#101828;font-size:.8rem}.wallet-batch-row span{display:block;margin-top:3px;color:#667085;font-size:.68rem;line-height:1.4;overflow-wrap:anywhere}
      .wallet-import-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;color:#667085;font-size:.72rem}.wallet-import-summary button{border:0;background:transparent;color:#0b1438;font:inherit;font-weight:800;cursor:pointer}
      @media(max-width:640px){.wallet-import-panel{padding:17px}.wallet-import-methods{grid-template-columns:1fr}.wallet-import-method{min-height:74px}.wallet-tool-actions{display:grid;grid-template-columns:1fr}.wallet-tool-actions .btn{width:100%;justify-content:center}.wallet-batch-list{max-height:42dvh}}
    `;
    document.head.appendChild(style);
  }

  function mountUi() {
    ensureStyle();
    const heroActions = $('.rolodex-hero-actions');
    if (heroActions && !$('#wallet-import-button')) {
      const button = document.createElement('button');
      button.id = 'wallet-import-button';
      button.type = 'button';
      button.className = 'btn btn-light wallet-import-launch';
      button.innerHTML = '<i data-lucide="scan-line" size="17"></i> Scan / import';
      heroActions.appendChild(button);
      button.addEventListener('click', openMethods);
    }

    if (!$('#liw-wallet-import-dialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'liw-wallet-import-dialog';
      dialog.className = 'wallet-import-dialog';
      dialog.innerHTML = `
        <div class="wallet-import-panel">
          <div class="wallet-import-head">
            <div><h2 id="wallet-import-title">Add to LIW Wallet</h2><p id="wallet-import-copy">Scan or import contacts from the tools you already use.</p></div>
            <button type="button" class="icon-btn" data-wallet-import-close aria-label="Close"><i data-lucide="x"></i></button>
          </div>
          <section class="wallet-tool-view" data-wallet-view="methods">
            <div class="wallet-import-methods">
              <button type="button" class="wallet-import-method" data-wallet-method="paper"><span><i data-lucide="scan-text" size="21"></i></span><div><strong>Scan paper card</strong><small>Take a photo and extract the contact info.</small></div></button>
              <button type="button" class="wallet-import-method" data-wallet-method="qr"><span><i data-lucide="qr-code" size="21"></i></span><div><strong>Scan any QR</strong><small>LIW, vCard, website, email, phone and more.</small></div></button>
              <button type="button" class="wallet-import-method" data-wallet-method="phone"><span><i data-lucide="contact-round" size="21"></i></span><div><strong>Phone contacts</strong><small>Choose contacts already saved on your phone.</small></div></button>
              <button type="button" class="wallet-import-method" data-wallet-method="vcf"><span><i data-lucide="file-up" size="21"></i></span><div><strong>Import VCF</strong><small>Bring in one contact or a whole vCard file.</small></div></button>
            </div>
            <p class="wallet-import-footnote">Paper and QR scans are reviewed before saving. LIW QR cards remain live-linked.</p>
          </section>
          <section class="wallet-tool-view" data-wallet-view="paper" hidden>
            <button class="wallet-tool-back" type="button" data-wallet-back><i data-lucide="arrow-left" size="15"></i> Back</button>
            <div class="wallet-tool-card"><h3>Scan a paper business card</h3><p>Use the rear camera or choose a clear photo. LIW will read the card, then let you correct anything before saving.</p>
              <input id="liw-paper-card-file" type="file" accept="image/*" capture="environment" hidden>
              <img id="liw-paper-preview" class="wallet-paper-preview" alt="Paper card preview" hidden>
              <div class="wallet-ocr-progress" id="liw-ocr-progress" hidden><span></span></div>
              <p class="wallet-status" id="liw-paper-status">Nothing is saved until you review it.</p>
              <div class="wallet-tool-actions"><button type="button" class="btn btn-primary" id="liw-paper-camera"><i data-lucide="camera" size="17"></i> Take photo / choose image</button></div>
            </div>
          </section>
          <section class="wallet-tool-view" data-wallet-view="qr" hidden>
            <button class="wallet-tool-back" type="button" data-wallet-back><i data-lucide="arrow-left" size="15"></i> Back</button>
            <div class="wallet-tool-card"><h3>Scan any QR code</h3><p>Point the camera at a QR. LIW cards save live; other codes are decoded and reviewed before saving.</p>
              <div id="liw-wallet-qr-reader"></div>
              <p class="wallet-status" id="liw-qr-status">Camera access is used only while this scanner is open.</p>
              <div class="wallet-tool-actions"><button type="button" class="btn btn-light" id="liw-qr-stop" hidden><i data-lucide="square" size="16"></i> Stop scanner</button></div>
            </div>
          </section>
          <section class="wallet-tool-view" data-wallet-view="batch" hidden>
            <button class="wallet-tool-back" type="button" data-wallet-back><i data-lucide="arrow-left" size="15"></i> Back</button>
            <div class="wallet-tool-card"><h3 id="liw-batch-title">Review contacts</h3><p id="liw-batch-copy">Choose the contacts you want to add.</p>
              <div class="wallet-import-summary"><span id="liw-batch-summary">0 contacts</span><button type="button" id="liw-batch-toggle">Uncheck all</button></div>
              <div class="wallet-batch-list" id="liw-batch-list"></div>
              <p class="wallet-status" id="liw-batch-status"></p>
              <div class="wallet-tool-actions"><button type="button" class="btn btn-primary" id="liw-batch-import"><i data-lucide="user-round-plus" size="16"></i> Import selected</button></div>
            </div>
          </section>
          <input id="liw-vcf-file" type="file" accept=".vcf,text/vcard,text/x-vcard" hidden>
        </div>`;
      document.body.appendChild(dialog);

      dialog.querySelector('[data-wallet-import-close]').addEventListener('click', closeDialog);
      dialog.querySelectorAll('[data-wallet-back]').forEach(button => button.addEventListener('click', () => showView('methods')));
      dialog.querySelectorAll('[data-wallet-method]').forEach(button => button.addEventListener('click', () => chooseMethod(button.dataset.walletMethod)));
      $('#liw-paper-camera').addEventListener('click', () => $('#liw-paper-card-file').click());
      $('#liw-paper-card-file').addEventListener('change', event => processPaperImage(event.target.files?.[0]));
      $('#liw-qr-stop').addEventListener('click', () => stopQrScanner());
      $('#liw-vcf-file').addEventListener('change', event => importVcfFile(event.target.files?.[0]));
      $('#liw-batch-import').addEventListener('click', importBatch);
      $('#liw-batch-toggle').addEventListener('click', toggleBatchChecks);
      dialog.addEventListener('close', () => stopQrScanner());
    }
    if (window.lucide) lucide.createIcons();
  }

  function openMethods() {
    showView('methods');
    const dialog = $('#liw-wallet-import-dialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeDialog() {
    stopQrScanner();
    $('#liw-wallet-import-dialog')?.close();
  }

  function showView(name) {
    document.querySelectorAll('[data-wallet-view]').forEach(view => { view.hidden = view.dataset.walletView !== name; });
    const title = $('#wallet-import-title');
    const copy = $('#wallet-import-copy');
    const labels = {
      methods: ['Add to LIW Wallet', 'Scan or import contacts from the tools you already use.'],
      paper: ['Scan paper card', 'Read a printed business card and review the contact before saving.'],
      qr: ['Scan any QR', 'LIW QR codes stay live-linked; other QR data can be saved too.'],
      batch: ['Review contacts', 'Choose what you want to bring into your LIW Wallet.']
    };
    if (title) title.textContent = labels[name]?.[0] || labels.methods[0];
    if (copy) copy.textContent = labels[name]?.[1] || labels.methods[1];
    if (name !== 'qr') stopQrScanner();
    if (window.lucide) lucide.createIcons();
  }

  async function chooseMethod(method) {
    if (method === 'paper') return showView('paper');
    if (method === 'qr') {
      showView('qr');
      return startQrScanner();
    }
    if (method === 'phone') return importPhoneContacts();
    if (method === 'vcf') return $('#liw-vcf-file').click();
  }

  function fillExistingContactForm(contact = {}) {
    closeDialog();
    $('#add-other-card-button')?.click();
    setTimeout(() => {
      const map = {
        'contact-name': contact.display_name,
        'contact-company': contact.company_name,
        'contact-title': contact.job_title,
        'contact-category': contact.category || 'Contacts',
        'contact-phone': contact.phone,
        'contact-email': contact.email,
        'contact-website': contact.website,
        'contact-external-url': contact.external_url,
        'contact-notes': contact.notes
      };
      Object.entries(map).forEach(([id, value]) => {
        const node = document.getElementById(id);
        if (node) node.value = safe(value, id === 'contact-notes' ? 1200 : 1000);
      });
      $('#contact-name')?.focus();
      notify('Review the scanned contact, then tap Save contact.');
    }, 60);
  }

  function normalizePhone(value) {
    return safe(value, 80).replace(/[^0-9+]/g, '');
  }

  function normalizeEmail(value) {
    return safe(value, 180).toLowerCase();
  }

  async function currentUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data?.session?.user) throw new Error('Please sign in to use LIW Wallet imports.');
    return data.session.user;
  }

  async function importBatch() {
    const checked = [...document.querySelectorAll('[data-wallet-batch-check]:checked')];
    const status = $('#liw-batch-status');
    if (!checked.length) {
      if (status) { status.textContent = 'Select at least one contact.'; status.className = 'wallet-status error'; }
      return;
    }
    const button = $('#liw-batch-import');
    if (button) button.disabled = true;
    try {
      const user = await currentUser();
      const selected = checked.map(input => batchContacts[Number(input.value)]).filter(Boolean);
      const { data: existing, error: existingError } = await supabaseClient
        .from('rolodex_entries')
        .select('email,phone')
        .eq('user_id', user.id);
      if (existingError) throw existingError;
      const emails = new Set((existing || []).map(row => normalizeEmail(row.email)).filter(Boolean));
      const phones = new Set((existing || []).map(row => normalizePhone(row.phone)).filter(Boolean));
      const seenEmails = new Set(emails);
      const seenPhones = new Set(phones);
      const rows = [];
      let skipped = 0;
      selected.forEach(contact => {
        const emailKey = normalizeEmail(contact.email);
        const phoneKey = normalizePhone(contact.phone);
        const duplicate = (emailKey && seenEmails.has(emailKey)) || (phoneKey && seenPhones.has(phoneKey));
        if (duplicate) { skipped += 1; return; }
        if (emailKey) seenEmails.add(emailKey);
        if (phoneKey) seenPhones.add(phoneKey);
        rows.push({
          user_id: user.id,
          source_type: contact.external_url ? 'external' : 'manual',
          display_name: safe(contact.display_name, 140) || 'Imported contact',
          company_name: safe(contact.company_name, 160) || null,
          job_title: safe(contact.job_title, 160) || null,
          category: safe(contact.category, 80) || 'Imported contacts',
          phone: safe(contact.phone, 80) || null,
          email: safe(contact.email, 180) || null,
          website: safe(contact.website, 500) || null,
          external_url: safe(contact.external_url, 1000) || null,
          notes: safe(contact.notes, 1200)
        });
      });
      if (!rows.length) {
        if (status) { status.textContent = skipped ? 'Those contacts are already in your LIW Wallet.' : 'Nothing to import.'; status.className = 'wallet-status'; }
        return;
      }
      const { error } = await supabaseClient.from('rolodex_entries').insert(rows);
      if (error) throw error;
      if (status) {
        status.textContent = `Imported ${rows.length} contact${rows.length === 1 ? '' : 's'}${skipped ? ` · skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}.`;
        status.className = 'wallet-status success';
      }
      notify(`${rows.length} contact${rows.length === 1 ? '' : 's'} added to LIW Wallet.`);
      setTimeout(() => location.reload(), 650);
    } catch (error) {
      if (status) { status.textContent = error?.message || 'Could not import those contacts.'; status.className = 'wallet-status error'; }
    } finally {
      if (button) button.disabled = false;
    }
  }

  function showBatch(contacts, title, copy) {
    batchContacts = contacts.filter(contact => safe(contact.display_name || contact.email || contact.phone, 180));
    const list = $('#liw-batch-list');
    const summary = $('#liw-batch-summary');
    const status = $('#liw-batch-status');
    if (!batchContacts.length) {
      notify('No usable contacts were found.');
      return;
    }
    if ($('#liw-batch-title')) $('#liw-batch-title').textContent = title || 'Review contacts';
    if ($('#liw-batch-copy')) $('#liw-batch-copy').textContent = copy || 'Choose the contacts you want to add.';
    if (summary) summary.textContent = `${batchContacts.length} contact${batchContacts.length === 1 ? '' : 's'} found`;
    if (status) { status.textContent = ''; status.className = 'wallet-status'; }
    list.innerHTML = batchContacts.map((contact, index) => {
      const detail = [contact.company_name, contact.phone, contact.email].filter(Boolean).join(' · ');
      return `<label class="wallet-batch-row"><input type="checkbox" data-wallet-batch-check value="${index}" checked><div><strong>${esc(contact.display_name || contact.email || contact.phone || 'Imported contact')}</strong><span>${esc(detail || 'Contact')}</span></div></label>`;
    }).join('');
    $('#liw-batch-toggle').textContent = 'Uncheck all';
    showView('batch');
  }

  function toggleBatchChecks() {
    const checks = [...document.querySelectorAll('[data-wallet-batch-check]')];
    const shouldCheck = checks.some(input => !input.checked);
    checks.forEach(input => { input.checked = shouldCheck; });
    $('#liw-batch-toggle').textContent = shouldCheck ? 'Uncheck all' : 'Check all';
  }

  async function importPhoneContacts() {
    if (!navigator.contacts?.select) {
      notify('Direct phone contact picking is not supported in this browser. Use Import VCF instead.');
      $('#liw-vcf-file').click();
      return;
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
      if (!contacts?.length) return;
      const normalized = contacts.map(contact => ({
        display_name: safe(contact.name?.[0] || contact.email?.[0] || contact.tel?.[0], 140),
        email: safe(contact.email?.[0], 180),
        phone: safe(contact.tel?.[0], 80),
        category: 'Phone contacts'
      }));
      showBatch(normalized, 'Import phone contacts', 'Choose which contacts to copy into your LIW Wallet.');
    } catch (error) {
      if (error?.name !== 'AbortError') notify(error?.message || 'Could not open your phone contacts.');
    }
  }

  function decodeQuotedPrintable(value) {
    return String(value || '')
      .replace(/=\r?\n/g, '')
      .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  function vcardValue(raw) {
    return decodeQuotedPrintable(String(raw || ''))
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  function parseVcards(text) {
    const unfolded = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const blocks = unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
    return blocks.map(block => {
      const rows = block.split(/\r?\n/);
      const fields = {};
      rows.forEach(line => {
        const colon = line.indexOf(':');
        if (colon < 0) return;
        const keyPart = line.slice(0, colon);
        const value = vcardValue(line.slice(colon + 1));
        const key = keyPart.split(';')[0].toUpperCase();
        if (!fields[key]) fields[key] = [];
        fields[key].push(value);
      });
      const nParts = safe(fields.N?.[0], 200).split(';');
      const fallbackName = [nParts[1], nParts[0]].filter(Boolean).join(' ');
      const org = safe(fields.ORG?.[0], 160).split(';')[0];
      return {
        display_name: safe(fields.FN?.[0] || fallbackName || fields.ORG?.[0], 140),
        company_name: org,
        job_title: safe(fields.TITLE?.[0], 160),
        phone: safe(fields.TEL?.[0], 80),
        email: safe(fields.EMAIL?.[0], 180),
        website: normalizeUrl(fields.URL?.[0]),
        category: 'Imported contacts',
        notes: safe(fields.NOTE?.[0], 1200)
      };
    }).filter(contact => contact.display_name || contact.email || contact.phone);
  }

  async function importVcfFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const contacts = parseVcards(text);
      if (!contacts.length) throw new Error('No contacts were found in that VCF file.');
      showBatch(contacts, 'Import VCF contacts', `Found contacts in ${file.name}. Choose what to add.`);
    } catch (error) {
      notify(error?.message || 'Could not read that VCF file.');
    } finally {
      $('#liw-vcf-file').value = '';
    }
  }

  function normalizeUrl(value) {
    const raw = safe(value, 1000);
    if (!raw) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function parsePaperText(text) {
    const raw = String(text || '').replace(/\r/g, '');
    const lines = raw.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const email = (raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
    const phoneMatches = raw.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || [];
    const phone = phoneMatches[0] || '';
    const webMatch = raw.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
    const website = normalizeUrl(webMatch?.[0] || '');
    const reject = value => {
      const lower = value.toLowerCase();
      return !value || value.includes('@') || /\d{3}.*\d{3}.*\d{4}/.test(value) || /www\.|https?:\/\//i.test(value) || (website && lower.includes(new URL(website).hostname.toLowerCase()));
    };
    const candidates = lines.filter(line => !reject(line));
    const titleWords = /\b(owner|founder|president|ceo|chief|manager|director|realtor|agent|broker|consultant|designer|developer|attorney|doctor|dr\.?|sales|specialist|stylist|barber|photographer|contractor|advisor|producer|artist)\b/i;
    const companyWords = /\b(inc\.?|llc|corp\.?|company|co\.?|group|services|solutions|studio|agency|associates|enterprises|designs|consulting|realty|properties|construction|salon|barbershop)\b/i;
    const jobTitle = candidates.find(line => titleWords.test(line)) || '';
    const company = candidates.find(line => line !== jobTitle && companyWords.test(line)) || '';
    const name = candidates.find(line => line !== jobTitle && line !== company && /^[A-Za-zÀ-ÿ'.-]+(?:\s+[A-Za-zÀ-ÿ'.-]+){1,3}$/.test(line) && line.length <= 60) || candidates[0] || company || 'Paper card contact';
    return {
      display_name: safe(name, 140),
      company_name: safe(company, 160),
      job_title: safe(jobTitle, 160),
      phone: safe(phone, 80),
      email: safe(email, 180),
      website,
      category: 'Paper cards',
      notes: 'Scanned from a paper business card. Review details before saving.'
    };
  }

  async function processPaperImage(file) {
    if (!file) return;
    const status = $('#liw-paper-status');
    const preview = $('#liw-paper-preview');
    const progressWrap = $('#liw-ocr-progress');
    const progressBar = progressWrap?.querySelector('span');
    const button = $('#liw-paper-camera');
    if (button) button.disabled = true;
    try {
      const objectUrl = URL.createObjectURL(file);
      if (preview) { preview.src = objectUrl; preview.hidden = false; }
      if (progressWrap) progressWrap.hidden = false;
      if (progressBar) progressBar.style.width = '4%';
      if (status) { status.textContent = 'Preparing card reader…'; status.className = 'wallet-status'; }
      await loadScript(TESSERACT_URL, 'Tesseract');
      if (status) status.textContent = 'Reading the business card…';
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: message => {
          if (message?.progress != null && progressBar) progressBar.style.width = `${Math.max(6, Math.round(message.progress * 100))}%`;
          if (message?.status && status) status.textContent = message.status.replace(/_/g, ' ');
        }
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      if (progressBar) progressBar.style.width = '100%';
      const text = safe(result?.data?.text, 5000);
      if (!text) throw new Error('I could not read text from that card. Try a clearer photo with less glare.');
      const contact = parsePaperText(text);
      if (status) { status.textContent = 'Card read. Opening the review screen…'; status.className = 'wallet-status success'; }
      setTimeout(() => fillExistingContactForm(contact), 250);
    } catch (error) {
      if (status) { status.textContent = error?.message || 'Could not read that paper card.'; status.className = 'wallet-status error'; }
    } finally {
      if (button) button.disabled = false;
      $('#liw-paper-card-file').value = '';
    }
  }

  function parseMecard(text) {
    const body = String(text || '').replace(/^MECARD:/i, '').replace(/;;?$/, '');
    const fields = {};
    body.split(';').forEach(part => {
      const idx = part.indexOf(':');
      if (idx < 0) return;
      const key = part.slice(0, idx).toUpperCase();
      const value = part.slice(idx + 1).trim();
      fields[key] = fields[key] || value;
    });
    const n = safe(fields.N, 140).split(',').reverse().join(' ').trim();
    return {
      display_name: n || safe(fields.ORG, 140) || 'QR contact',
      company_name: safe(fields.ORG, 160),
      phone: safe(fields.TEL, 80),
      email: safe(fields.EMAIL, 180),
      website: normalizeUrl(fields.URL),
      category: 'QR scans'
    };
  }

  function liwSlugFromQr(text) {
    try {
      const url = new URL(text);
      const host = url.hostname.toLowerCase();
      const liwHost = host === 'cards.liwworgs.com' || (host === 'liwworgsinc.github.io' && url.pathname.includes('/cards-staging/'));
      if (!liwHost) return '';
      return safe(url.searchParams.get('slug'), 160);
    } catch (_) { return ''; }
  }

  async function saveLiwQr(slug) {
    const { data, error } = await supabaseClient.rpc('rolodex_save_liw_card', { p_slug: slug });
    if (error) throw error;
    const result = data || {};
    if (!result.ok) {
      if (result.reason === 'own_card') throw new Error('That is your own LIW Card.');
      if (result.reason === 'not_found') throw new Error('That LIW Card is not published or could not be found.');
      throw new Error('Could not save that LIW Card.');
    }
    notify(result.already_saved ? 'That LIW Card is already in your Wallet — live details refreshed.' : 'LIW Card saved live to your Wallet.');
    closeDialog();
    setTimeout(() => location.reload(), 450);
  }

  async function handleQrText(decodedText) {
    const text = safe(decodedText, 5000);
    const status = $('#liw-qr-status');
    if (status) { status.textContent = 'QR found. Reading it…'; status.className = 'wallet-status success'; }
    await stopQrScanner();
    const liwSlug = liwSlugFromQr(text);
    if (liwSlug) return saveLiwQr(liwSlug);
    if (/^BEGIN:VCARD/i.test(text)) {
      const contact = parseVcards(text)[0];
      if (contact) { contact.category = 'QR scans'; return fillExistingContactForm(contact); }
    }
    if (/^MECARD:/i.test(text)) return fillExistingContactForm(parseMecard(text));
    if (/^mailto:/i.test(text)) return fillExistingContactForm({ display_name: 'Email contact', email: text.replace(/^mailto:/i, '').split('?')[0], category: 'QR scans' });
    if (/^tel:/i.test(text)) return fillExistingContactForm({ display_name: 'Phone contact', phone: text.replace(/^tel:/i, ''), category: 'QR scans' });
    const url = normalizeUrl(text);
    if (url) {
      let label = 'QR website';
      try { label = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}
      return fillExistingContactForm({ display_name: label, website: url, external_url: url, category: 'QR scans' });
    }
    const firstLine = safe(text.split(/\r?\n/)[0], 140) || 'QR contact';
    fillExistingContactForm({ display_name: firstLine, category: 'QR scans', notes: `Scanned QR content:\n${safe(text, 900)}` });
  }

  async function startQrScanner() {
    const status = $('#liw-qr-status');
    const stop = $('#liw-qr-stop');
    if (status) { status.textContent = 'Starting camera…'; status.className = 'wallet-status'; }
    try {
      await loadScript(HTML5_QR_URL, 'Html5Qrcode');
      if (qrScanner) await stopQrScanner();
      qrScanner = new Html5Qrcode('liw-wallet-qr-reader');
      await qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 245, height: 245 }, aspectRatio: 1.333334 },
        decodedText => handleQrText(decodedText).catch(error => {
          if (status) { status.textContent = error?.message || 'Could not process that QR.'; status.className = 'wallet-status error'; }
        }),
        () => {}
      );
      if (stop) stop.hidden = false;
      if (status) status.textContent = 'Point the camera at a QR code.';
    } catch (error) {
      if (status) { status.textContent = 'Camera scanner could not start. Check camera permission and try again.'; status.className = 'wallet-status error'; }
      if (stop) stop.hidden = true;
    }
  }

  async function stopQrScanner() {
    const stop = $('#liw-qr-stop');
    if (!qrScanner) { if (stop) stop.hidden = true; return; }
    try {
      if (qrScanner.isScanning) await qrScanner.stop();
      await qrScanner.clear();
    } catch (_) {}
    qrScanner = null;
    const reader = $('#liw-wallet-qr-reader');
    if (reader) reader.innerHTML = '';
    if (stop) stop.hidden = true;
  }

  function start() {
    mountUi();
    const observer = new MutationObserver(() => {
      if (!$('#wallet-import-button') || !$('#liw-wallet-import-dialog')) mountUi();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();