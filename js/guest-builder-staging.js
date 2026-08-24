(() => {
  const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';
  const GUEST_PRODUCT_PENDING_KEY = 'liw_guest_product_pending_v1';

  function injectGuestEnhancements() {
    if (!document.getElementById('guest-plus-preview-styles')) {
      const style = document.createElement('style');
      style.id = 'guest-plus-preview-styles';
      style.textContent = `
        .guest-save-contact{width:100%;min-height:42px;border:0;border-radius:13px;background:var(--card-primary,#0b1438);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:.76rem;font-weight:850;margin:0 0 16px;padding:10px 14px;box-shadow:0 5px 12px color-mix(in srgb,var(--card-primary,#0b1438) 18%,transparent)}
        .guest-save-contact svg{width:16px!important;height:16px!important;stroke-width:2.1}
        .guest-social-chip{gap:7px;padding:5px 9px 5px 6px}.guest-social-chip .social-brand-icon{flex:0 0 auto;width:25px!important;height:25px!important}.guest-social-chip .social-brand-icon svg{width:13px!important;height:13px!important}.guest-social-chip .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        .guest-plus-section{position:relative}.guest-plus-section:before{content:'';position:absolute;inset:10px -10px;border-radius:20px;background:linear-gradient(135deg,rgba(11,20,56,.035),rgba(212,168,79,.07));pointer-events:none}.guest-plus-section>*{position:relative}.guest-plus-note{display:flex;gap:9px;align-items:flex-start;background:#fffbeb;border:1px solid #f6e6b0;border-radius:14px;padding:11px 12px;margin:0 0 15px;color:#725513;font-size:.8rem;line-height:1.45}.guest-plus-note strong{display:block;color:#553d0c;margin-bottom:2px}.guest-plus-note svg{flex:0 0 auto;margin-top:1px}.guest-plus-badge{color:#775500!important;background:#fff3c4!important}
        .guest-product-preview{margin-top:16px;padding-top:15px;border-top:1px solid #edf0f2}.guest-product-preview[hidden]{display:none!important}.guest-preview-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.guest-preview-section-head strong{font-size:.78rem}.guest-preview-section-head span{font-size:.62rem;font-weight:900;color:#765a12;background:#fff6d8;border-radius:999px;padding:4px 7px}.guest-product-card{display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;align-items:center;border:1px solid #e7e9ee;border-radius:14px;padding:9px;background:#fff}.guest-product-image{width:58px;height:58px;border-radius:11px;overflow:hidden;background:#f2f4f7;display:grid;place-items:center;color:#7b8494}.guest-product-image img{width:100%;height:100%;object-fit:cover;display:block}.guest-product-copy{min-width:0}.guest-product-copy strong{display:block;font-size:.78rem;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.guest-product-copy small{display:block;color:#667085;font-size:.66rem;line-height:1.35;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.guest-product-price{display:inline-block!important;color:var(--card-primary,#0b1438)!important;font-weight:900!important;margin-top:4px!important}.guest-product-cta{grid-column:1/-1;border:0;border-radius:10px;background:color-mix(in srgb,var(--card-primary,#0b1438) 9%,white);color:var(--card-primary,#0b1438);font:inherit;font-size:.68rem;font-weight:850;padding:8px 10px;text-align:center}
        @media(max-width:620px){.guest-save-contact{min-height:39px;font-size:.71rem;margin-bottom:14px}.guest-social-chip .social-brand-icon{width:23px!important;height:23px!important}.guest-product-card{grid-template-columns:52px minmax(0,1fr)}.guest-product-image{width:52px;height:52px}}
      `;
      document.head.appendChild(style);
    }

    const actions = document.querySelector('.guest-actions');
    if (actions && !document.getElementById('guest-product-section')) {
      actions.insertAdjacentHTML('beforebegin', `
        <div class="guest-section guest-plus-section" id="guest-product-section">
          <div class="guest-section-head"><div><h2>4. Try one product</h2><p>Optional — preview a Plus feature before you decide.</p></div><span class="guest-section-badge guest-plus-badge">PLUS · 1 MAX</span></div>
          <div class="guest-plus-note"><i data-lucide="sparkles" size="17"></i><div><strong>You will not lose this product.</strong><span>If you publish on Free, it stays saved to your account but remains hidden from the live card. Upgrade to Plus later and you can publish it.</span></div></div>
          <div class="guest-grid">
            <div class="guest-field"><label for="guest-product-name">Product name</label><input id="guest-product-name" maxlength="80" placeholder="Signature candle"/></div>
            <div class="guest-field"><label for="guest-product-price">Price</label><input id="guest-product-price" inputmode="decimal" placeholder="29.99"/></div>
            <div class="guest-field full"><label for="guest-product-description">Short description</label><textarea id="guest-product-description" maxlength="180" placeholder="A quick description of what you sell."></textarea></div>
            <div class="guest-field"><label for="guest-product-image">Image URL</label><input id="guest-product-image" inputmode="url" placeholder="https://..."/></div>
            <div class="guest-field"><label for="guest-product-link">Buy / product link</label><input id="guest-product-link" inputmode="url" placeholder="https://..."/></div>
          </div>
        </div>
      `);
    }

    const contacts = document.getElementById('preview-contacts');
    if (contacts && !document.getElementById('guest-save-contact')) {
      contacts.insertAdjacentHTML('afterend', '<button class="guest-save-contact" id="guest-save-contact" type="button" aria-label="Save contact preview"><i data-lucide="user-round-plus" size="16"></i><span>Save Contact</span></button>');
    }

    const socials = document.getElementById('preview-socials');
    if (socials && !document.getElementById('preview-product-section')) {
      socials.insertAdjacentHTML('afterend', `
        <section class="guest-product-preview" id="preview-product-section" hidden>
          <div class="guest-preview-section-head"><strong>Featured product</strong><span>PLUS PREVIEW</span></div>
          <article class="guest-product-card">
            <div class="guest-product-image" id="preview-product-image"><i data-lucide="package" size="18"></i></div>
            <div class="guest-product-copy"><strong id="preview-product-name"></strong><small id="preview-product-description"></small><small class="guest-product-price" id="preview-product-price"></small></div>
            <div class="guest-product-cta" id="preview-product-cta">View product</div>
          </article>
        </section>
      `);
    }
  }

  injectGuestEnhancements();

  const fields = {
    fullName: document.getElementById('guest-full-name'),
    company: document.getElementById('guest-company'),
    title: document.getElementById('guest-title'),
    headline: document.getElementById('guest-headline'),
    bio: document.getElementById('guest-bio'),
    phone: document.getElementById('guest-phone'),
    email: document.getElementById('guest-email'),
    website: document.getElementById('guest-website'),
    instagram: document.getElementById('guest-instagram'),
    linkedin: document.getElementById('guest-linkedin')
  };
  const productFields = {
    name: document.getElementById('guest-product-name'),
    price: document.getElementById('guest-product-price'),
    description: document.getElementById('guest-product-description'),
    image: document.getElementById('guest-product-image'),
    link: document.getElementById('guest-product-link')
  };

  let primary = '#0b1438';
  let secondary = '#d4a84f';

  const text = value => String(value || '').trim();
  const initials = value => {
    const parts = text(value).split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join('') || 'YN').toUpperCase();
  };
  const ensureUrl = value => {
    const raw = text(value);
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  };
  const instagramUrl = value => {
    const raw = text(value);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://instagram.com/${raw.replace(/^@/, '')}`;
  };
  const linkedinUrl = value => {
    const raw = text(value);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/linkedin\.com/i.test(raw)) return `https://${raw.replace(/^\/+/, '')}`;
    return `https://linkedin.com/in/${raw.replace(/^@/, '')}`;
  };
  const priceToCents = value => {
    const cleaned = text(value).replace(/[$,\s]/g, '');
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
  };
  const formatMoney = cents => cents == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents) / 100);

  function collectProduct() {
    const name = text(productFields.name?.value);
    if (!name) return null;
    const image = ensureUrl(productFields.image?.value);
    return {
      name,
      description: text(productFields.description?.value) || null,
      price_cents: priceToCents(productFields.price?.value),
      currency: 'usd',
      image_urls: image ? [image] : [],
      purchase_url: ensureUrl(productFields.link?.value) || null,
      is_enabled: true,
      sort_order: 0
    };
  }

  function persistPendingProduct() {
    try {
      const product = collectProduct();
      if (!product) {
        localStorage.removeItem(GUEST_PRODUCT_PENDING_KEY);
        return;
      }
      localStorage.setItem(GUEST_PRODUCT_PENDING_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), product }));
    } catch (_) {}
  }

  function collectDraft() {
    const fullName = text(fields.fullName?.value);
    const phone = text(fields.phone?.value);
    const socialLinks = [];
    const ig = instagramUrl(fields.instagram?.value);
    const li = linkedinUrl(fields.linkedin?.value);
    if (ig) socialLinks.push({ platform: 'instagram', url: ig });
    if (li) socialLinks.push({ platform: 'linkedin', url: li });
    const product = collectProduct();

    return {
      version: 1,
      cardId: null,
      savedAt: Date.now(),
      card: {
        full_name: fullName,
        company_name: text(fields.company?.value),
        job_title: text(fields.title?.value),
        headline: text(fields.headline?.value),
        biography: text(fields.bio?.value),
        phone,
        sms_phone: phone,
        email: text(fields.email?.value),
        website: ensureUrl(fields.website?.value),
        primary_color: primary,
        secondary_color: secondary,
        background_color: '#ffffff',
        text_color: '#111827',
        button_color: primary,
        button_text_color: '#ffffff',
        font_family: 'DM Sans',
        button_style: 'filled',
        profile_image_shape: 'circle',
        profile_position_x: '50',
        profile_position_y: '22',
        profile_zoom: '125',
        border_radius: '16',
        card_layout: 'classic',
        card_experience: 'classic',
        gradient_background: `linear-gradient(135deg,${primary},${secondary})`,
        color_mode: 'light',
        branding_mode: 'liw',
        custom_branding_text: '',
        custom_branding_url: '',
        slug: '',
        template_id: '',
        profile_image_url: '',
        cover_image_url: '',
        cover_position: 'center',
        cover_overlay: '24',
        services_enabled: false,
        products_enabled: false,
        booking_enabled: false,
        lead_form_enabled: false,
        payment_sharing_enabled: false,
        social_button_style: 'brand',
        social_button_size: 'small',
        qr_foreground_color: '#000000',
        qr_background_color: '#FFFFFF',
        qr_logo_url: '',
        status: 'draft',
        show_branding: true
      },
      profileUrl: '',
      coverUrl: '',
      socialLinks,
      services: [],
      products: product ? [product] : []
    };
  }

  function saveGuestDraft() {
    try {
      localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(collectDraft()));
      persistPendingProduct();
    } catch (_) {}
  }

  function moveDraftToUser(user) {
    if (!user?.id) return false;
    try {
      const draft = collectDraft();
      const product = draft.products?.[0] || null;
      draft.savedAt = Date.now();
      draft.card.products_enabled = false;
      draft.products = [];
      localStorage.setItem(`liw_editor_draft_${user.id}_new`, JSON.stringify(draft));
      if (product) {
        localStorage.setItem(`liw_saved_guest_product_${user.id}`, JSON.stringify({ version: 1, savedAt: Date.now(), product }));
        localStorage.setItem(GUEST_PRODUCT_PENDING_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), product }));
      }
      localStorage.removeItem(GUEST_DRAFT_KEY);
      sessionStorage.removeItem('liw_guest_signup_pending');
      return true;
    } catch (_) {
      return false;
    }
  }

  function setError(message = '') {
    const box = document.getElementById('guest-error');
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('show', Boolean(message));
  }

  function renderContacts() {
    const area = document.getElementById('preview-contacts');
    if (!area) return;
    const items = [];
    if (text(fields.phone?.value)) items.push(['phone', 'Call']);
    if (text(fields.phone?.value)) items.push(['message-square-text', 'Text']);
    if (text(fields.email?.value)) items.push(['mail', 'Email']);
    if (text(fields.website?.value)) items.push(['globe', 'Website']);
    if (!items.length) items.push(['phone', 'Call'], ['mail', 'Email'], ['globe', 'Website']);
    area.style.gridTemplateColumns = `repeat(${Math.min(items.length, 4)},1fr)`;
    area.innerHTML = items.slice(0, 4).map(([icon, label]) => `<span class="guest-contact"><i data-lucide="${icon}" size="15"></i>${label}</span>`).join('');
  }

  function renderSocials() {
    const area = document.getElementById('preview-socials');
    if (!area) return;
    const items = [];
    if (text(fields.instagram?.value)) items.push({ key: 'instagram', label: 'Instagram' });
    if (text(fields.linkedin?.value)) items.push({ key: 'linkedin', label: 'LinkedIn' });
    area.innerHTML = items.map(item => {
      const icon = typeof window.socialIconHtml === 'function'
        ? window.socialIconHtml(item.key, { size: 13, title: false })
        : `<i data-lucide="${item.key}" size="14"></i>`;
      return `<span class="guest-social-chip">${icon}<span>${item.label}</span></span>`;
    }).join('');
  }

  function renderProduct() {
    const section = document.getElementById('preview-product-section');
    if (!section) return;
    const product = collectProduct();
    section.hidden = !product;
    if (!product) return;
    document.getElementById('preview-product-name').textContent = product.name;
    document.getElementById('preview-product-description').textContent = product.description || 'Product preview';
    document.getElementById('preview-product-price').textContent = formatMoney(product.price_cents);
    const imageBox = document.getElementById('preview-product-image');
    const image = product.image_urls?.[0] || '';
    imageBox.innerHTML = image ? `<img src="${image.replace(/"/g, '&quot;')}" alt="">` : '<i data-lucide="package" size="18"></i>';
    document.getElementById('preview-product-cta').textContent = product.purchase_url ? 'View product' : 'Product preview';
  }

  function render() {
    const fullName = text(fields.fullName?.value);
    const company = text(fields.company?.value);
    const title = text(fields.title?.value);
    const role = [title, company].filter(Boolean).join(' · ');
    document.getElementById('preview-initials').textContent = initials(fullName);
    document.getElementById('preview-name').textContent = fullName || 'Your Name';
    document.getElementById('preview-role').textContent = role || 'Your title · Your business';
    document.getElementById('preview-headline').textContent = text(fields.headline?.value) || 'Your professional headline';
    document.getElementById('preview-bio').textContent = text(fields.bio?.value) || 'A short introduction will appear here as you build your card.';
    document.getElementById('guest-bio-count').textContent = String(fields.bio?.value?.length || 0);
    const card = document.getElementById('guest-card-preview');
    card?.style.setProperty('--card-primary', primary);
    card?.style.setProperty('--card-secondary', secondary);
    renderContacts();
    renderSocials();
    renderProduct();
    if (window.lucide) lucide.createIcons();
  }

  function restore() {
    try {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      const draft = raw ? JSON.parse(raw) : null;
      const card = draft?.card || {};
      if (draft) {
        fields.fullName.value = card.full_name || '';
        fields.company.value = card.company_name || '';
        fields.title.value = card.job_title || '';
        fields.headline.value = card.headline || '';
        fields.bio.value = card.biography || '';
        fields.phone.value = card.phone || '';
        fields.email.value = card.email || '';
        fields.website.value = card.website || '';
        const socials = Array.isArray(draft.socialLinks) ? draft.socialLinks : [];
        fields.instagram.value = socials.find(link => link.platform === 'instagram')?.url?.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@') || '';
        fields.linkedin.value = socials.find(link => link.platform === 'linkedin')?.url || '';
        primary = card.primary_color || primary;
        secondary = card.secondary_color || secondary;
        document.querySelectorAll('.guest-color').forEach(button => button.classList.toggle('active', button.dataset.primary === primary && button.dataset.secondary === secondary));
      }

      let product = Array.isArray(draft?.products) ? draft.products[0] : null;
      if (!product) {
        const pendingRaw = localStorage.getItem(GUEST_PRODUCT_PENDING_KEY);
        product = pendingRaw ? JSON.parse(pendingRaw)?.product : null;
      }
      if (product) {
        productFields.name.value = product.name || '';
        productFields.price.value = product.price_cents == null ? '' : (Number(product.price_cents) / 100).toFixed(2);
        productFields.description.value = product.description || '';
        productFields.image.value = product.image_urls?.[0] || '';
        productFields.link.value = product.purchase_url || '';
      }
    } catch (_) {}
  }

  [...Object.values(fields), ...Object.values(productFields)].forEach(input => input?.addEventListener('input', () => {
    setError('');
    render();
    saveGuestDraft();
  }));

  document.querySelectorAll('.guest-color').forEach(button => button.addEventListener('click', () => {
    primary = button.dataset.primary || primary;
    secondary = button.dataset.secondary || secondary;
    document.querySelectorAll('.guest-color').forEach(item => item.classList.toggle('active', item === button));
    render();
    saveGuestDraft();
  }));

  document.getElementById('guest-save-contact')?.addEventListener('click', () => {
    const button = document.getElementById('guest-save-contact');
    if (!button) return;
    const original = button.innerHTML;
    button.innerHTML = '<i data-lucide="circle-check" size="16"></i><span>Available when published</span>';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => { button.innerHTML = original; if (window.lucide) lucide.createIcons(); }, 1500);
  });

  document.getElementById('guest-clear')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(GUEST_DRAFT_KEY);
      localStorage.removeItem(GUEST_PRODUCT_PENDING_KEY);
    } catch (_) {}
    [...Object.values(fields), ...Object.values(productFields)].forEach(input => { if (input) input.value = ''; });
    primary = '#0b1438';
    secondary = '#d4a84f';
    document.querySelectorAll('.guest-color').forEach((button, index) => button.classList.toggle('active', index === 0));
    setError('');
    render();
  });

  document.getElementById('guest-publish')?.addEventListener('click', async () => {
    const fullName = text(fields.fullName?.value);
    if (!fullName) {
      setError('Add your full name before publishing your card.');
      fields.fullName?.focus();
      return;
    }
    saveGuestDraft();
    setError('');
    const button = document.getElementById('guest-publish');
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Preparing…</span>';
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user && moveDraftToUser(data.session.user)) {
        location.href = liwUrl('editor.html?welcome=1&guest_claim=1');
        return;
      }
      sessionStorage.setItem('liw_guest_signup_pending', '1');
      location.href = liwUrl('register.html?guest=1');
    } catch (_) {
      sessionStorage.setItem('liw_guest_signup_pending', '1');
      location.href = liwUrl('register.html?guest=1');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });

  document.getElementById('guest-login-link')?.addEventListener('click', () => {
    saveGuestDraft();
    try { sessionStorage.setItem('liw_guest_signup_pending', '1'); } catch (_) {}
  });

  function ensureBrandIcons() {
    if (typeof window.socialIconHtml === 'function') return;
    if (document.querySelector('script[data-guest-social-icons]')) return;
    const script = document.createElement('script');
    script.src = 'js/social-icons.js?v=20260824-guest-product-1';
    script.dataset.guestSocialIcons = 'true';
    script.onload = () => render();
    document.head.appendChild(script);
  }

  restore();
  ensureBrandIcons();
  render();
  if (window.lucide) lucide.createIcons();
})();
