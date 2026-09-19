(function () {
  const SECTION_DEFS = [
    { type: 'hours', title: 'Business hours', subtitle: 'Show when customers can reach or visit you.', icon: 'clock-3' },
    { type: 'gallery', title: 'Photo gallery', subtitle: 'Add work samples, products, properties, or your space.', icon: 'images' },
    { type: 'testimonials', title: 'Testimonials & reviews', subtitle: 'Build trust with short customer quotes and ratings.', icon: 'message-square-heart' },
    { type: 'faq', title: 'Frequently asked questions', subtitle: 'Answer common questions before customers ask.', icon: 'circle-help' },
    { type: 'location', title: 'Map & location', subtitle: 'Show your address and an easy directions button.', icon: 'map-pin' },
    { type: 'cta', title: 'Custom CTA buttons', subtitle: 'Add focused actions like Get a quote, Apply, Shop, or Call now.', icon: 'mouse-pointer-click' },
    { type: 'credentials', title: 'Credentials & badges', subtitle: 'Highlight licenses, certifications, awards, and memberships.', icon: 'badge-check' },
    { type: 'featured_links', title: 'Featured links', subtitle: 'Promote your most important pages, forms, menus, or resources.', icon: 'link-2' }
  ];
  const LIMITS = { gallery: 8, testimonials: 6, faq: 8, cta: 4, credentials: 6, featured_links: 6 };
  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const richSections = new Map();
  const saveTimers = new Map();
  let mounted = false;
  let loadedCardId = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function defaultContent(type) {
    if (type === 'hours') return { days: DAY_NAMES.map((label, index) => ({ label, closed: index > 4, open: '09:00', close: '17:00' })), note: '' };
    if (type === 'gallery') return { items: [] };
    if (type === 'testimonials') return { items: [] };
    if (type === 'faq') return { items: [] };
    if (type === 'location') return { address: '', label: 'Visit us', map_url: '' };
    if (type === 'cta') return { items: [] };
    if (type === 'credentials') return { items: [] };
    if (type === 'featured_links') return { items: [] };
    return {};
  }

  function normalizedSection(type, row = null) {
    return {
      id: row?.id || null,
      type,
      title: row?.title || SECTION_DEFS.find(item => item.type === type)?.title || type,
      is_visible: Boolean(row?.is_visible),
      content: { ...defaultContent(type), ...(row?.content && typeof row.content === 'object' ? row.content : {}) }
    };
  }

  function getSection(type) {
    if (!richSections.has(type)) richSections.set(type, normalizedSection(type));
    return richSections.get(type);
  }

  async function ensureCardId() {
    if (typeof currentId !== 'undefined' && currentId) return currentId;
    if (typeof flushSave === 'function') {
      try { await flushSave({ force: true, silent: true }); } catch (_) {}
    } else if (typeof save === 'function') {
      try { await save({ silent: true }); } catch (_) {}
    }
    if (typeof currentId !== 'undefined' && currentId) return currentId;
    throw new Error('Save your basic card details first, then add this section.');
  }

  function ownerId() {
    if (typeof currentCardOwnerId !== 'undefined' && currentCardOwnerId) return currentCardOwnerId;
    if (typeof user !== 'undefined' && user?.id) return user.id;
    return null;
  }

  async function loadRichSections() {
    const cardId = typeof currentId !== 'undefined' ? currentId : null;
    if (!cardId || loadedCardId === cardId || typeof supabaseClient === 'undefined') return;
    const { data, error } = await supabaseClient.from('card_sections').select('*').eq('card_id', cardId).order('sort_order');
    if (error) {
      console.warn('LIW rich sections could not load:', error);
      return;
    }
    SECTION_DEFS.forEach(def => {
      const row = (data || []).find(item => item.section_type === def.type);
      richSections.set(def.type, normalizedSection(def.type, row));
    });
    loadedCardId = cardId;
    renderAllSections();
    renderPreviewChips();
  }

  function setSaveStatus(type, state, text) {
    const element = document.querySelector(`[data-rich-save-status="${type}"]`);
    if (!element) return;
    element.dataset.state = state;
    element.textContent = text;
  }

  function scheduleSectionSave(type, delay = 650) {
    clearTimeout(saveTimers.get(type));
    setSaveStatus(type, 'saving', 'Unsaved changes');
    saveTimers.set(type, setTimeout(() => saveSection(type), delay));
  }

  async function saveSection(type) {
    const section = getSection(type);
    try {
      const cardId = await ensureCardId();
      const agencyOwnerId = ownerId();
      if (!agencyOwnerId) throw new Error('Card owner could not be resolved.');
      setSaveStatus(type, 'saving', 'Saving…');
      const payload = {
        card_id: cardId,
        agency_owner_id: agencyOwnerId,
        section_type: type,
        title: section.title,
        content: section.content,
        is_visible: section.is_visible,
        sort_order: SECTION_DEFS.findIndex(item => item.type === type) + 50,
        updated_at: new Date().toISOString()
      };
      if (section.id) {
        const { error } = await supabaseClient.from('card_sections').update(payload).eq('id', section.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseClient.from('card_sections').insert(payload).select('id').single();
        if (error) throw error;
        section.id = data.id;
      }
      await syncCompatibilityFields(type, section);
      setSaveStatus(type, 'saved', 'Saved');
      renderPreviewChips();
    } catch (error) {
      console.warn(`LIW ${type} section save failed:`, error);
      setSaveStatus(type, 'error', error?.message || 'Could not save');
      if (typeof toast === 'function') toast(error?.message || 'Unable to save this section.');
    }
  }

  async function syncCompatibilityFields(type, section) {
    const cardId = typeof currentId !== 'undefined' ? currentId : null;
    if (!cardId) return;
    const patch = {};
    if (type === 'gallery') patch.gallery_enabled = section.is_visible;
    if (type === 'testimonials') patch.testimonials_enabled = section.is_visible;
    if (type === 'hours') patch.hours_enabled = section.is_visible;
    if (type === 'location') patch.map_url = section.is_visible ? (section.content.map_url || null) : null;
    if (!Object.keys(patch).length) return;
    try { await supabaseClient.from('digital_cards').update(patch).eq('id', cardId); } catch (_) {}
  }

  function mountBuilder() {
    if (mounted) return;
    const toolsPanel = document.querySelector('.editor-panel[data-panel="tools"]');
    const host = document.getElementById('business-tools-content') || toolsPanel;
    if (!host) return;
    const wrapper = document.createElement('section');
    wrapper.id = 'rich-card-builder';
    wrapper.className = 'rich-card-builder';
    wrapper.innerHTML = `
      <div class="rich-card-builder-head">
        <div><h3>Beef up your card</h3><p>Your fast 2-minute card stays simple. Open only the extra sections you want and turn them on when they are ready.</p></div>
        <span class="rich-card-builder-badge">Optional</span>
      </div>
      <div class="rich-section-stack" id="rich-section-stack"></div>`;
    host.appendChild(wrapper);
    mounted = true;
    wireBuilderEvents(wrapper);
    renderAllSections();
    renderPreviewChips();
    if (window.lucide) lucide.createIcons();
  }

  function renderAllSections() {
    const stack = document.getElementById('rich-section-stack');
    if (!stack) return;
    const openType = stack.querySelector('.rich-section-editor[open]')?.dataset.richSection || null;
    stack.innerHTML = SECTION_DEFS.map(def => renderSection(def, getSection(def.type))).join('');
    if (openType) stack.querySelector(`[data-rich-section="${openType}"]`)?.setAttribute('open', '');
    if (window.lucide) lucide.createIcons();
  }

  function renderSection(def, section) {
    const enabled = section.is_visible;
    return `<details class="rich-section-editor" data-rich-section="${def.type}" data-enabled="${enabled}">
      <summary>
        <span class="rich-section-summary-copy"><span class="rich-section-icon"><i data-lucide="${def.icon}" size="18"></i></span><span><strong>${esc(def.title)}</strong><small>${esc(def.subtitle)}</small></span></span>
        <span class="rich-section-state"><span class="rich-section-state-dot"></span>${enabled ? 'On' : 'Off'}<i data-lucide="chevron-down" size="15"></i></span>
      </summary>
      <div class="rich-section-body">
        <div class="rich-enable-row"><span><strong>Show this on the public card</strong><small>You can fill it out first and turn it on later.</small></span><input class="rich-toggle" type="checkbox" data-rich-enable="${def.type}" ${enabled ? 'checked' : ''}></div>
        ${renderSectionFields(def.type, section.content)}
        <div class="rich-save-status" data-rich-save-status="${def.type}" data-state="saved">${section.id ? 'Saved' : 'Ready to add'}</div>
      </div>
    </details>`;
  }

  function renderSectionFields(type, content) {
    if (type === 'hours') return renderHours(content);
    if (type === 'gallery') return renderGallery(content);
    if (type === 'testimonials') return renderTestimonials(content);
    if (type === 'faq') return renderFaq(content);
    if (type === 'location') return renderLocation(content);
    if (type === 'cta') return renderCtas(content);
    if (type === 'credentials') return renderCredentials(content);
    if (type === 'featured_links') return renderFeaturedLinks(content);
    return '';
  }

  function renderHours(content) {
    const days = Array.isArray(content.days) && content.days.length === 7 ? content.days : defaultContent('hours').days;
    return `<div class="rich-fields"><div>${days.map((day, index) => `<div class="rich-hours-row">
      <span class="rich-hours-day">${esc(day.label || DAY_NAMES[index])}</span>
      <label class="rich-hours-closed"><input type="checkbox" data-rich-type="hours" data-rich-path="days.${index}.closed" ${day.closed ? 'checked' : ''}> Closed</label>
      <input type="time" aria-label="${esc(day.label)} opening time" data-rich-type="hours" data-rich-path="days.${index}.open" value="${esc(day.open || '09:00')}" ${day.closed ? 'disabled' : ''}>
      <input type="time" aria-label="${esc(day.label)} closing time" data-rich-type="hours" data-rich-path="days.${index}.close" value="${esc(day.close || '17:00')}" ${day.closed ? 'disabled' : ''}>
    </div>`).join('')}</div><div class="rich-field"><label>Hours note</label><input data-rich-type="hours" data-rich-path="note" value="${esc(content.note || '')}" placeholder="Appointments available after hours"></div></div>`;
  }

  function renderGallery(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-fields"><div class="rich-gallery-list">${items.length ? items.map((item,index) => `<div class="rich-gallery-item"><img src="${esc(item.url)}" alt=""><button class="rich-gallery-remove" type="button" data-rich-remove="gallery" data-index="${index}" aria-label="Remove photo"><i data-lucide="trash-2" size="14"></i></button>${item.caption ? `<span class="rich-gallery-caption">${esc(item.caption)}</span>` : ''}</div>`).join('') : '<div class="rich-limit">No gallery photos yet.</div>'}</div>
      <div class="rich-add-row"><label class="rich-upload-button"><i data-lucide="upload" size="15"></i> Upload photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-gallery-upload></label><span class="rich-limit">${items.length}/${LIMITS.gallery} photos</span></div>
      ${items.length ? `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-field"><label>Caption for photo ${index + 1}</label><input data-rich-type="gallery" data-rich-path="items.${index}.caption" value="${esc(item.caption || '')}" placeholder="Optional caption"></div>`).join('')}</div>` : ''}
    </div>`;
  }

  function renderTestimonials(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-repeater-item"><button class="rich-repeater-remove" type="button" data-rich-remove="testimonials" data-index="${index}"><i data-lucide="trash-2" size="14"></i></button><div class="rich-grid-2"><div class="rich-field"><label>Customer name</label><input data-rich-type="testimonials" data-rich-path="items.${index}.name" value="${esc(item.name || '')}" placeholder="Jane D."></div><div class="rich-field"><label>Role / detail</label><input data-rich-type="testimonials" data-rich-path="items.${index}.role" value="${esc(item.role || '')}" placeholder="Home buyer"></div></div><div class="rich-field"><label>Review</label><textarea data-rich-type="testimonials" data-rich-path="items.${index}.quote" placeholder="What did they say?">${esc(item.quote || '')}</textarea></div><div class="rich-field"><label>Rating</label><select data-rich-type="testimonials" data-rich-path="items.${index}.rating">${[5,4,3,2,1].map(value => `<option value="${value}" ${Number(item.rating || 5) === value ? 'selected' : ''}>${value} star${value === 1 ? '' : 's'}</option>`).join('')}</select></div></div>`).join('')}</div><div class="rich-add-row"><button class="rich-add-button" type="button" data-rich-add="testimonials"><i data-lucide="plus" size="15"></i> Add testimonial</button><span class="rich-limit">${items.length}/${LIMITS.testimonials}</span></div>`;
  }

  function renderFaq(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-repeater-item"><button class="rich-repeater-remove" type="button" data-rich-remove="faq" data-index="${index}"><i data-lucide="trash-2" size="14"></i></button><div class="rich-field"><label>Question</label><input data-rich-type="faq" data-rich-path="items.${index}.question" value="${esc(item.question || '')}" placeholder="Do you offer same-day service?"></div><div class="rich-field"><label>Answer</label><textarea data-rich-type="faq" data-rich-path="items.${index}.answer" placeholder="Give a short, useful answer.">${esc(item.answer || '')}</textarea></div></div>`).join('')}</div><div class="rich-add-row"><button class="rich-add-button" type="button" data-rich-add="faq"><i data-lucide="plus" size="15"></i> Add FAQ</button><span class="rich-limit">${items.length}/${LIMITS.faq}</span></div>`;
  }

  function renderLocation(content) {
    return `<div class="rich-fields"><div class="rich-field"><label>Location label</label><input data-rich-type="location" data-rich-path="label" value="${esc(content.label || 'Visit us')}" placeholder="Visit our office"></div><div class="rich-field"><label>Street address</label><input data-rich-type="location" data-rich-path="address" value="${esc(content.address || '')}" placeholder="873 Liberty Avenue, Brooklyn, NY 11208"></div><div class="rich-field"><label>Optional map / directions URL</label><input data-rich-type="location" data-rich-path="map_url" value="${esc(content.map_url || '')}" placeholder="https://maps.google.com/..."></div><span class="rich-limit">If you leave the map URL blank, LIW will build directions from the address.</span></div>`;
  }

  function renderCtas(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-repeater-item"><button class="rich-repeater-remove" type="button" data-rich-remove="cta" data-index="${index}"><i data-lucide="trash-2" size="14"></i></button><div class="rich-grid-2"><div class="rich-field"><label>Button text</label><input data-rich-type="cta" data-rich-path="items.${index}.label" value="${esc(item.label || '')}" placeholder="Get a free quote"></div><div class="rich-field"><label>Button style</label><select data-rich-type="cta" data-rich-path="items.${index}.style"><option value="primary" ${item.style === 'primary' ? 'selected' : ''}>Primary</option><option value="secondary" ${item.style === 'secondary' ? 'selected' : ''}>Secondary</option></select></div></div><div class="rich-field"><label>Destination URL</label><input data-rich-type="cta" data-rich-path="items.${index}.url" value="${esc(item.url || '')}" placeholder="https://..."></div></div>`).join('')}</div><div class="rich-add-row"><button class="rich-add-button" type="button" data-rich-add="cta"><i data-lucide="plus" size="15"></i> Add CTA button</button><span class="rich-limit">${items.length}/${LIMITS.cta}</span></div>`;
  }

  function renderCredentials(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-repeater-item"><button class="rich-repeater-remove" type="button" data-rich-remove="credentials" data-index="${index}"><i data-lucide="trash-2" size="14"></i></button><div class="rich-grid-2"><div class="rich-field"><label>Credential / badge</label><input data-rich-type="credentials" data-rich-path="items.${index}.title" value="${esc(item.title || '')}" placeholder="Licensed Real Estate Salesperson"></div><div class="rich-field"><label>Issuer</label><input data-rich-type="credentials" data-rich-path="items.${index}.issuer" value="${esc(item.issuer || '')}" placeholder="New York State"></div></div><div class="rich-grid-2"><div class="rich-field"><label>Credential # / year</label><input data-rich-type="credentials" data-rich-path="items.${index}.detail" value="${esc(item.detail || '')}" placeholder="License #12345"></div><div class="rich-field"><label>Verification link</label><input data-rich-type="credentials" data-rich-path="items.${index}.url" value="${esc(item.url || '')}" placeholder="https://... (optional)"></div></div></div>`).join('')}</div><div class="rich-add-row"><button class="rich-add-button" type="button" data-rich-add="credentials"><i data-lucide="plus" size="15"></i> Add credential</button><span class="rich-limit">${items.length}/${LIMITS.credentials}</span></div>`;
  }

  function renderFeaturedLinks(content) {
    const items = Array.isArray(content.items) ? content.items : [];
    return `<div class="rich-repeater">${items.map((item,index) => `<div class="rich-repeater-item"><button class="rich-repeater-remove" type="button" data-rich-remove="featured_links" data-index="${index}"><i data-lucide="trash-2" size="14"></i></button><div class="rich-field"><label>Link title</label><input data-rich-type="featured_links" data-rich-path="items.${index}.label" value="${esc(item.label || '')}" placeholder="View my portfolio"></div><div class="rich-field"><label>Short description</label><input data-rich-type="featured_links" data-rich-path="items.${index}.description" value="${esc(item.description || '')}" placeholder="See recent projects and results"></div><div class="rich-field"><label>URL</label><input data-rich-type="featured_links" data-rich-path="items.${index}.url" value="${esc(item.url || '')}" placeholder="https://..."></div></div>`).join('')}</div><div class="rich-add-row"><button class="rich-add-button" type="button" data-rich-add="featured_links"><i data-lucide="plus" size="15"></i> Add featured link</button><span class="rich-limit">${items.length}/${LIMITS.featured_links}</span></div>`;
  }

  function wireBuilderEvents(wrapper) {
    wrapper.addEventListener('input', event => {
      const input = event.target.closest('[data-rich-type][data-rich-path]');
      if (!input) return;
      updatePathFromInput(input);
    });
    wrapper.addEventListener('change', event => {
      const toggle = event.target.closest('[data-rich-enable]');
      if (toggle) {
        const type = toggle.dataset.richEnable;
        getSection(type).is_visible = toggle.checked;
        const details = toggle.closest('.rich-section-editor');
        if (details) {
          details.dataset.enabled = String(toggle.checked);
          const state = details.querySelector('.rich-section-state');
          if (state) state.innerHTML = `<span class="rich-section-state-dot"></span>${toggle.checked ? 'On' : 'Off'}<i data-lucide="chevron-down" size="15"></i>`;
        }
        scheduleSectionSave(type, 0);
        renderPreviewChips();
        if (window.lucide) lucide.createIcons();
        return;
      }
      const input = event.target.closest('[data-rich-type][data-rich-path]');
      if (input) {
        updatePathFromInput(input);
        if (input.dataset.richType === 'hours' && input.dataset.richPath.endsWith('.closed')) renderAllSections();
      }
    });
    wrapper.addEventListener('click', event => {
      const add = event.target.closest('[data-rich-add]');
      if (add) return addRepeaterItem(add.dataset.richAdd);
      const remove = event.target.closest('[data-rich-remove]');
      if (remove) return removeRepeaterItem(remove.dataset.richRemove, Number(remove.dataset.index));
    });
    wrapper.addEventListener('change', event => {
      const upload = event.target.closest('[data-gallery-upload]');
      if (upload) uploadGalleryPhotos(upload.files);
    });
  }

  function updatePathFromInput(input) {
    const type = input.dataset.richType;
    const path = input.dataset.richPath;
    const section = getSection(type);
    setPath(section.content, path, input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value);
    scheduleSectionSave(type);
    renderPreviewChips();
  }

  function setPath(target, path, value) {
    const parts = path.split('.');
    let cursor = target;
    parts.forEach((part, index) => {
      const key = /^\d+$/.test(part) ? Number(part) : part;
      if (index === parts.length - 1) cursor[key] = value;
      else {
        const nextPart = parts[index + 1];
        if (cursor[key] == null) cursor[key] = /^\d+$/.test(nextPart) ? [] : {};
        cursor = cursor[key];
      }
    });
  }

  function addRepeaterItem(type) {
    const section = getSection(type);
    const items = Array.isArray(section.content.items) ? section.content.items : (section.content.items = []);
    const limit = LIMITS[type] || 6;
    if (items.length >= limit) return typeof toast === 'function' && toast(`You can add up to ${limit} items here.`);
    if (type === 'testimonials') items.push({ name:'', role:'', quote:'', rating:5 });
    if (type === 'faq') items.push({ question:'', answer:'' });
    if (type === 'cta') items.push({ label:'', url:'', style: items.length ? 'secondary' : 'primary' });
    if (type === 'credentials') items.push({ title:'', issuer:'', detail:'', url:'' });
    if (type === 'featured_links') items.push({ label:'', description:'', url:'' });
    renderAllSections();
    document.querySelector(`[data-rich-section="${type}"]`)?.setAttribute('open', '');
    scheduleSectionSave(type);
  }

  function removeRepeaterItem(type, index) {
    const section = getSection(type);
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    if (index < 0 || index >= items.length) return;
    items.splice(index, 1);
    renderAllSections();
    document.querySelector(`[data-rich-section="${type}"]`)?.setAttribute('open', '');
    scheduleSectionSave(type, 0);
  }

  async function uploadGalleryPhotos(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const section = getSection('gallery');
    const items = Array.isArray(section.content.items) ? section.content.items : (section.content.items = []);
    const remaining = LIMITS.gallery - items.length;
    if (remaining <= 0) return typeof toast === 'function' && toast(`Gallery limit is ${LIMITS.gallery} photos.`);
    try {
      const cardId = await ensureCardId();
      setSaveStatus('gallery', 'saving', 'Uploading photos…');
      for (const file of files.slice(0, remaining)) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) continue;
        if (file.size > 5 * 1024 * 1024) {
          if (typeof toast === 'function') toast(`${file.name} is larger than 5 MB.`);
          continue;
        }
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        const path = `${ownerId()}/galleries/${cardId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safeName}`;
        const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl:'3600', upsert:false });
        if (error) throw error;
        const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
        items.push({ url: data.publicUrl, caption: '' });
      }
      renderAllSections();
      document.querySelector('[data-rich-section="gallery"]')?.setAttribute('open', '');
      await saveSection('gallery');
      if (typeof toast === 'function') toast('Gallery photos uploaded');
    } catch (error) {
      setSaveStatus('gallery', 'error', error?.message || 'Upload failed');
      if (typeof toast === 'function') toast(error?.message || 'Unable to upload gallery photos.');
    }
  }

  function renderPreviewChips() {
    const target = document.getElementById('preview-tools');
    if (!target) return;
    let wrap = document.getElementById('rich-preview-chips');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'rich-preview-chips';
      wrap.className = 'rich-preview-chips';
      target.insertAdjacentElement('afterend', wrap);
    }
    const chips = SECTION_DEFS.map(def => {
      const section = getSection(def.type);
      if (!section.is_visible) return '';
      const items = Array.isArray(section.content.items) ? section.content.items.length : null;
      const label = def.type === 'hours' ? 'Hours' : def.type === 'gallery' ? `Gallery${items ? ` ${items}` : ''}` : def.type === 'testimonials' ? `Reviews${items ? ` ${items}` : ''}` : def.type === 'faq' ? `FAQ${items ? ` ${items}` : ''}` : def.type === 'location' ? 'Location' : def.type === 'cta' ? `CTA${items ? ` ${items}` : ''}` : def.type === 'credentials' ? `Credentials${items ? ` ${items}` : ''}` : `Links${items ? ` ${items}` : ''}`;
      return `<span class="rich-preview-chip"><i data-lucide="${def.icon}" size="10"></i>${label}</span>`;
    }).join('');
    wrap.innerHTML = chips;
    wrap.hidden = !chips;
    if (window.lucide) lucide.createIcons();
  }

  function boot() {
    mountBuilder();
    loadRichSections();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      mountBuilder();
      loadRichSections();
      if ((typeof currentId !== 'undefined' && currentId && loadedCardId === currentId) || attempts > 30) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();