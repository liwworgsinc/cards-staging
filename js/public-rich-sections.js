(function () {
  const SECTION_ORDER = ['hours','gallery','testimonials','faq','location','cta','credentials','featured_links'];
  const SECTION_META = {
    hours: ['Business hours','Availability'],
    gallery: ['Gallery','Photos'],
    testimonials: ['What clients say','Reviews'],
    faq: ['Frequently asked questions','Helpful answers'],
    location: ['Location','Find us'],
    cta: ['Take the next step','Quick actions'],
    credentials: ['Credentials','Trust & qualifications'],
    featured_links: ['Featured links','Explore more']
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function safeHref(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(mailto:|tel:|sms:)/i.test(raw)) return raw;
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function sectionShell(type, body, titleOverride = '') {
    const [fallbackTitle, kicker] = SECTION_META[type] || ['More','Details'];
    return `<section class="public-rich-section" data-public-rich="${type}"><div class="public-rich-head"><h2>${esc(titleOverride || fallbackTitle)}</h2><span>${esc(kicker)}</span></div>${body}</section>`;
  }

  function renderHours(section) {
    const days = Array.isArray(section.content?.days) ? section.content.days : [];
    const visible = days.filter(day => day && day.label);
    if (!visible.length) return '';
    const rows = visible.map(day => `<div class="public-hours-row"><strong>${esc(day.label)}</strong><span>${day.closed ? 'Closed' : `${esc(formatTime(day.open))} – ${esc(formatTime(day.close))}`}</span></div>`).join('');
    const note = section.content?.note ? `<p style="margin:10px 0 0;color:#667085;font-size:.73rem;line-height:1.45">${esc(section.content.note)}</p>` : '';
    return sectionShell('hours', `<div class="public-hours">${rows}</div>${note}`, section.title);
  }

  function formatTime(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return value || '';
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
  }

  function renderGallery(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).filter(item => item?.url).slice(0, 8);
    if (!items.length) return '';
    const grid = items.map((item,index) => `<button type="button" data-rich-gallery-image="${esc(item.url)}" data-rich-gallery-caption="${esc(item.caption || '')}" aria-label="Open gallery photo ${index + 1}"><img src="${esc(item.url)}" alt="${esc(item.caption || `Gallery photo ${index + 1}`)}" loading="lazy"></button>`).join('');
    return sectionShell('gallery', `<div class="public-gallery-grid">${grid}</div>`, section.title);
  }

  function renderTestimonials(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).filter(item => item?.quote).slice(0, 6);
    if (!items.length) return '';
    const body = items.map(item => {
      const rating = Math.max(1, Math.min(5, Number(item.rating || 5)));
      return `<article class="public-testimonial"><div class="public-testimonial-stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>“${esc(item.quote)}”</blockquote><footer>${item.name ? `<strong>${esc(item.name)}</strong>` : 'Customer'}${item.role ? ` · ${esc(item.role)}` : ''}</footer></article>`;
    }).join('');
    return sectionShell('testimonials', `<div class="public-testimonial-list">${body}</div>`, section.title);
  }

  function renderFaq(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).filter(item => item?.question && item?.answer).slice(0, 8);
    if (!items.length) return '';
    return sectionShell('faq', `<div class="public-faq-list">${items.map(item => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</div>`, section.title);
  }

  function renderLocation(section) {
    const address = String(section.content?.address || '').trim();
    const explicitUrl = safeHref(section.content?.map_url || '');
    if (!address && !explicitUrl) return '';
    const directions = explicitUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '');
    const map = address ? `<iframe class="public-map-frame" title="Map showing ${esc(address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>` : '';
    const label = section.content?.label || 'Get directions';
    return sectionShell('location', `<div class="public-location-card">${map}${address ? `<div class="public-location-address">${esc(address)}</div>` : ''}${directions ? `<a class="public-rich-action" href="${esc(directions)}" target="_blank" rel="noopener" data-rich-track="location_directions"><i data-lucide="navigation" size="16"></i>${esc(label)}</a>` : ''}</div>`, section.title);
  }

  function renderCta(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).map(item => ({ ...item, href: safeHref(item?.url) })).filter(item => item?.label && item.href).slice(0, 4);
    if (!items.length) return '';
    const body = items.map(item => `<a class="public-cta-link ${item.style === 'primary' ? 'primary' : ''}" href="${esc(item.href)}" ${/^https?:/i.test(item.href) ? 'target="_blank" rel="noopener"' : ''} data-rich-track="custom_cta_click" data-rich-target="${esc(item.label)}"><strong>${esc(item.label)}</strong><i data-lucide="arrow-up-right" size="16"></i></a>`).join('');
    return sectionShell('cta', `<div class="public-cta-grid">${body}</div>`, section.title);
  }

  function renderCredentials(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).filter(item => item?.title).slice(0, 6);
    if (!items.length) return '';
    const body = items.map(item => {
      const href = safeHref(item.url || '');
      const inner = `<span class="public-credential-icon"><i data-lucide="badge-check" size="17"></i></span><strong>${esc(item.title)}</strong>${item.issuer ? `<small>${esc(item.issuer)}</small>` : ''}${item.detail ? `<small>${esc(item.detail)}</small>` : ''}`;
      return href ? `<a class="public-credential" href="${esc(href)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit" data-rich-track="credential_click" data-rich-target="${esc(item.title)}">${inner}</a>` : `<article class="public-credential">${inner}</article>`;
    }).join('');
    return sectionShell('credentials', `<div class="public-credential-grid">${body}</div>`, section.title);
  }

  function renderFeaturedLinks(section) {
    const items = (Array.isArray(section.content?.items) ? section.content.items : []).map(item => ({ ...item, href: safeHref(item?.url) })).filter(item => item?.label && item.href).slice(0, 6);
    if (!items.length) return '';
    const body = items.map(item => `<a class="public-featured-link" href="${esc(item.href)}" target="_blank" rel="noopener" data-rich-track="featured_link_click" data-rich-target="${esc(item.label)}"><span><strong>${esc(item.label)}</strong>${item.description ? `<small>${esc(item.description)}</small>` : ''}</span><i data-lucide="arrow-up-right" size="16"></i></a>`).join('');
    return sectionShell('featured_links', `<div class="public-featured-links">${body}</div>`, section.title);
  }

  function renderSection(section) {
    if (!section?.is_visible) return '';
    if (section.section_type === 'hours') return renderHours(section);
    if (section.section_type === 'gallery') return renderGallery(section);
    if (section.section_type === 'testimonials') return renderTestimonials(section);
    if (section.section_type === 'faq') return renderFaq(section);
    if (section.section_type === 'location') return renderLocation(section);
    if (section.section_type === 'cta') return renderCta(section);
    if (section.section_type === 'credentials') return renderCredentials(section);
    if (section.section_type === 'featured_links') return renderFeaturedLinks(section);
    return '';
  }

  function ensureContainer() {
    let container = document.getElementById('public-rich-sections');
    if (container) return container;
    const lead = document.getElementById('lead-section');
    const branding = document.getElementById('branding');
    const parent = lead?.parentElement || branding?.parentElement || document.querySelector('.public-content');
    if (!parent) return null;
    container = document.createElement('div');
    container.id = 'public-rich-sections';
    if (lead) lead.insertAdjacentElement('beforebegin', container);
    else if (branding) branding.insertAdjacentElement('beforebegin', container);
    else parent.appendChild(container);
    return container;
  }

  function wireInteractions(container) {
    container.querySelectorAll('[data-rich-track]').forEach(link => link.addEventListener('click', () => {
      if (typeof window.track === 'function') window.track(link.dataset.richTrack, link.dataset.richTarget || null);
    }));
    container.querySelectorAll('[data-rich-gallery-image]').forEach(button => button.addEventListener('click', () => openLightbox(button.dataset.richGalleryImage, button.dataset.richGalleryCaption || '')));
  }

  function openLightbox(url, caption) {
    let lightbox = document.getElementById('public-rich-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'public-rich-lightbox';
      lightbox.className = 'public-lightbox';
      lightbox.hidden = true;
      lightbox.innerHTML = '<button type="button" aria-label="Close image">×</button><figure style="margin:0;text-align:center"><img alt=""><figcaption style="margin-top:9px;color:#fff;font:600 13px system-ui"></figcaption></figure>';
      document.body.appendChild(lightbox);
      lightbox.addEventListener('click', event => { if (event.target === lightbox || event.target.closest('button')) lightbox.hidden = true; });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') lightbox.hidden = true; });
    }
    lightbox.querySelector('img').src = url;
    lightbox.querySelector('img').alt = caption || 'Gallery image';
    lightbox.querySelector('figcaption').textContent = caption;
    lightbox.querySelector('figcaption').hidden = !caption;
    lightbox.hidden = false;
    if (typeof window.track === 'function') window.track('gallery_open');
  }

  async function loadSectionsWhenReady() {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      let card = null;
      try { card = typeof publicCard !== 'undefined' ? publicCard : null; } catch (_) {}
      if (!card?.id) {
        if (attempts > 40) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      try {
        const { data, error } = await supabaseClient.from('card_sections').select('*').eq('card_id', card.id).eq('is_visible', true).order('sort_order');
        if (error) throw error;
        const rows = (data || []).filter(row => SECTION_ORDER.includes(row.section_type)).sort((a,b) => SECTION_ORDER.indexOf(a.section_type) - SECTION_ORDER.indexOf(b.section_type));
        const container = ensureContainer();
        if (!container) return;
        container.innerHTML = rows.map(renderSection).join('');
        container.hidden = !container.innerHTML.trim();
        wireInteractions(container);
        if (window.lucide) lucide.createIcons();
      } catch (error) {
        console.warn('LIW rich public sections could not load:', error);
      }
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSectionsWhenReady);
  else loadSectionsWhenReady();
})();