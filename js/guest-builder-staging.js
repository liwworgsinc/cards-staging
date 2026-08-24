(() => {
  const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';
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

  function collectDraft() {
    const fullName = text(fields.fullName?.value);
    const phone = text(fields.phone?.value);
    const socialLinks = [];
    const ig = instagramUrl(fields.instagram?.value);
    const li = linkedinUrl(fields.linkedin?.value);
    if (ig) socialLinks.push({ platform: 'instagram', url: ig });
    if (li) socialLinks.push({ platform: 'linkedin', url: li });

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
      products: []
    };
  }

  function saveGuestDraft() {
    try {
      localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(collectDraft()));
    } catch (_) {}
  }

  function moveDraftToUser(user) {
    if (!user?.id) return false;
    try {
      const draft = collectDraft();
      draft.savedAt = Date.now();
      draft.card.products_enabled = false;
      draft.products = [];
      localStorage.setItem(`liw_editor_draft_${user.id}_new`, JSON.stringify(draft));
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
    if (text(fields.instagram?.value)) items.push('Instagram');
    if (text(fields.linkedin?.value)) items.push('LinkedIn');
    area.innerHTML = items.map(label => `<span class="guest-social-chip">${label}</span>`).join('');
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
    if (window.lucide) lucide.createIcons();
  }

  function restore() {
    try {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const card = draft?.card || {};
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
    } catch (_) {}
  }

  Object.values(fields).forEach(input => input?.addEventListener('input', () => {
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

  document.getElementById('guest-clear')?.addEventListener('click', () => {
    try { localStorage.removeItem(GUEST_DRAFT_KEY); } catch (_) {}
    Object.values(fields).forEach(input => { if (input) input.value = ''; });
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

  restore();
  render();
  if (window.lucide) lucide.createIcons();
})();
