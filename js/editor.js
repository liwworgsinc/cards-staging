let currentId = null;
let user = null;
let saveTimer = null;
let saveChain = Promise.resolve();
let autosaveRetryTimer = null;
let dirtyRevision = 0;
let savedRevision = 0;
let autosaveRetryCount = 0;
let lastSavedAt = null;
let lastServerUpdatedAt = 0;
let autosaveWatchdog = null;
let profileUrl = '';
let coverUrl = '';
let subscription = null;
let currentPlan = 'starter';
let templates = [];
let templatePurchases = [];
let addonDefinitions = [];
let activeAddons = [];
let socialLinks = [];
let services = [];
let products = [];
let isAdmin = false;
let isPlanPreview = false;
let editorAccess = null;
let currentCardOwnerId = null;
let currentTeamRole = null;
let canEditCurrentCard = true;
let editorEventsWired = false;
let editorInitializationComplete = false;
let saveInFlightPromise = null;
let previewOpening = false;

const editorStepOrder = ['content', 'links', 'design', 'share'];
const editorPanelNames = ['content', 'links', 'design', 'tools', 'share'];
const editorStepDetails = {
  content: { title: 'Start with you', help: 'Add your name, photo, company, and title. Optional details can wait.' },
  links: { title: 'How customers reach you', help: 'Add one contact method, then the social profiles you actively use.' },
  design: { title: 'Make it yours', help: 'Choose a template, brand colors, and an optional cover image.' },
  tools: { title: 'Advanced business tools', help: 'Optional extras that can be added before or after publishing.' },
  share: { title: 'Review and publish', help: 'Check the essentials, choose your link, and put your card online.' },
};

const fieldNames = [
  'full_name', 'job_title', 'company_name', 'biography', 'phone', 'sms_phone', 'email', 'website', 'business_address', 'headline',
  'primary_color', 'secondary_color', 'background_color', 'text_color', 'button_color', 'button_text_color',
  'font_family', 'button_style', 'profile_image_shape', 'profile_border_color', 'profile_position_x', 'profile_position_y', 'profile_zoom', 'border_radius', 'card_layout', 'card_experience', 'gradient_background', 'color_mode',
  'cover_image_url', 'cover_position', 'cover_overlay', 'branding_mode', 'custom_branding_text', 'custom_branding_url',
  'seo_title', 'seo_description', 'internal_label', 'client_name', 'campaign_tag', 'slug', 'template_id', 'profile_image_url', 'booking_url', 'payment_url', 'services_enabled',
  'products_enabled', 'booking_enabled', 'lead_form_enabled', 'payment_sharing_enabled',
  'cash_app_cashtag', 'cash_app_label', 'venmo_username', 'venmo_label', 'paypal_url', 'paypal_label',
  'social_button_style', 'social_button_size',
  'zelle_contact', 'zelle_label', 'payment_qr_url',
  'qr_foreground_color', 'qr_background_color', 'qr_logo_url'
];

async function safeEditorLookup(label, request, fallbackData = null) {
  try {
    const result = await request;
    if (result?.error) console.warn(`LIW editor optional lookup failed (${label}):`, result.error);
    return { data: result?.data ?? fallbackData, error: result?.error || null };
  } catch (error) {
    console.warn(`LIW editor optional lookup failed (${label}):`, error);
    return { data: fallbackData, error };
  }
}

function safeEditorSetup(label, callback) {
  try {
    return callback();
  } catch (error) {
    console.warn(`LIW editor setup continued after ${label} failed:`, error);
    return null;
  }
}

(async function initEditor() {
  const params = new URLSearchParams(location.search);
  currentId = params.get('id');

  try {
    user = await requireUser();
    if (!user) return;

    // Make the customer editor responsive immediately. Account lookups and
    // entitlement checks must never leave every button and field unbound.
    if (!currentId) initializeNewCard();
    wireEvents();
    render();
    updateCompletion();
    setSaveState('saving', 'Loading your editor…');

    const [profileResult, subscriptionResult, templateResult, addonDefinitionResult, activeAddonResult, templatePurchaseResult] = await Promise.all([
      safeEditorLookup('profile', supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle(), null),
      safeEditorLookup('subscription', supabaseClient.from('subscriptions').select('plan_key,status,billing_interval').eq('user_id', user.id).maybeSingle(), null),
      safeEditorLookup('templates', supabaseClient.from('templates').select('*').eq('is_active', true).order('is_premium').order('name'), []),
      safeEditorLookup('add-on definitions', supabaseClient.from('addon_definitions').select('*').eq('is_active', true).order('sort_order'), []),
      safeEditorLookup('active add-ons', supabaseClient.from('subscription_addons').select('*').eq('user_id', user.id), []),
      safeEditorLookup('template purchases', supabaseClient.from('template_purchases').select('template_id,license_type,status').eq('user_id', user.id), [])
    ]);

    subscription = subscriptionResult.data || null;
    templates = templateResult.data || [];
    templatePurchases = templatePurchaseResult.data || [];
    addonDefinitions = addonDefinitionResult.data || [];
    activeAddons = (activeAddonResult.data || []).filter(row => ['active', 'trialing'].includes(row.status));

    try {
      editorAccess = await getLiwAccessContext(user, { refresh: true });
    } catch (accessError) {
      console.warn('LIW editor access context fallback:', accessError);
      editorAccess = createEditorAccessFallback(profileResult.data, subscription);
    }

    isAdmin = Boolean(editorAccess?.isAdmin);
    isPlanPreview = Boolean(editorAccess?.isPlanPreview);
    currentPlan = editorAccess?.planKey || subscription?.plan_key || 'starter';
    if (isPlanPreview) activeAddons = [];

    if (currentId) {
      try {
        await loadCard();
      } catch (cardLoadError) {
        console.warn('LIW editor card extras could not fully load:', cardLoadError);
      }
    }

    safeEditorSetup('plan-value cleanup', () => sanitizeLockedEntitlementValues());
    safeEditorSetup('entitlement controls', () => applyEntitlements());
    safeEditorSetup('template library', () => renderTemplates());
    safeEditorSetup('social links', () => renderSocialRows());
    safeEditorSetup('services', () => renderServiceRows());
    safeEditorSetup('products', () => renderProductRows());
    safeEditorSetup('business tool visibility', () => syncBusinessToolsVisibility());
    safeEditorSetup('editor permissions', () => applyEditorPermissionMode());
    safeEditorSetup('live preview', () => render());
    safeEditorSetup('completion status', () => updateCompletion());
    dirtyRevision = 0;
    savedRevision = 0;
    lastSavedAt = currentId && lastServerUpdatedAt ? new Date(lastServerUpdatedAt) : null;
    setSaveState('saved', currentId ? savedStateText() : 'New card · autosave ready');
    restoreLocalDraftIfNewer();
    handleEditorDeepLink(params);
    editorInitializationComplete = true;
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error('LIW customer editor startup error:', error);

    // Last-resort customer-safe mode: the form, tabs and live preview remain
    // usable even when a nonessential plan lookup is temporarily unavailable.
    if (user && !currentId && !value('primary_color')) initializeNewCard();
    wireEvents();
    try { renderSocialRows(); } catch (_) {}
    try { renderServiceRows(); } catch (_) {}
    try { renderProductRows(); } catch (_) {}
    try { render(); updateCompletion(); } catch (_) {}
    editorInitializationComplete = true;
    setSaveState('saved', currentId ? savedStateText() : 'Editor ready');
    toast('The editor is ready. Optional account tools will load again on your next visit.');
  }
})();

function createEditorAccessFallback(profile = null, currentSubscription = null) {
  const email = String(user?.email || '').trim().toLowerCase();
  const adminAccount = profile?.role === 'admin' || ['liwworgsinc@gmail.com', 'globalcorent@gmail.com'].includes(email);
  const active = currentSubscription && ['active', 'trialing'].includes(currentSubscription.status);
  const planKey = adminAccount ? 'white_label' : active ? (currentSubscription.plan_key || 'starter') : 'starter';
  return {
    isAdmin: adminAccount,
    isPlanPreview: false,
    planKey,
    planName: adminAccount ? 'LIW Admin' : titleCase(planKey),
    entitlements: {},
    has(feature) {
      if (adminAccount) return true;
      const definition = addonDefinitions.find(item => item.entitlement_key === feature || item.addon_key === feature);
      return Boolean(definition?.included_plans?.includes(planKey) || activeAddons.some(row => row.addon_key === definition?.addon_key));
    }
  };
}

function field(name) {
  return document.querySelector(`[name="${name}"]`);
}

function value(name) {
  const element = field(name);
  if (!element) return '';
  return element.type === 'checkbox' ? element.checked : element.value || '';
}

function initializeNewCard() {
  // Account profile data and card content are intentionally separate.
  // A new card must start with a blank display name chosen by the user.
  if (field('full_name')) field('full_name').value = '';
  field('primary_color').value = '#0b1438';
  field('secondary_color').value = '#d4a84f';
  field('background_color').value = '#ffffff';
  field('text_color').value = '#111827';
  field('button_color').value = '#0b1438';
  field('button_text_color').value = '#ffffff';
  field('profile_position_x').value = '50';
  field('profile_position_y').value = '22';
  field('profile_zoom').value = '125';
  field('card_layout').value = 'classic';
  field('card_experience').value = 'classic';
  field('gradient_background').value = 'linear-gradient(135deg,#0b1438,#d4a84f)';
  field('color_mode').value = 'light';
  field('status').value = 'draft';
  field('cover_position').value = 'center';
  field('cover_overlay').value = '24';
  field('branding_mode').value = 'liw';
  field('show_branding').checked = true;
  coverUrl = '';
  field('services_enabled').checked = false;
  field('products_enabled').checked = false;
  field('booking_enabled').checked = false;
  field('lead_form_enabled').checked = false;
  field('payment_sharing_enabled').checked = false;
  field('social_button_style').value = 'brand';
  field('social_button_size').value = 'small';
  socialLinks = [];
  services = [];
  products = [];
  updatePhoto();
}

async function loadCard() {
  const { data, error } = await supabaseClient.from('digital_cards').select('*').eq('id', currentId).single();
  if (error) {
    toast(error.message);
    return;
  }

  currentCardOwnerId = data.user_id;
  lastServerUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
  if (data.user_id !== user.id && !isAdmin) {
    const { data: membership } = await supabaseClient.from('workspace_members')
      .select('role,status')
      .eq('owner_user_id', data.user_id)
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    currentTeamRole = membership?.role || null;
    if (!currentTeamRole) {
      toast('This card belongs to another account and is not shared with you.');
      setTimeout(() => location.replace('dashboard.html'), 350);
      return;
    }
    canEditCurrentCard = currentTeamRole === 'editor';
  } else {
    currentTeamRole = data.user_id === user.id ? 'owner' : 'admin';
    canEditCurrentCard = true;
  }

  fieldNames.forEach(name => {
    const element = field(name);
    if (!element || data[name] === null || data[name] === undefined) return;
    // Keep the draft placeholder out of the editable display-name field.
    if (name === 'full_name' && String(data[name]).trim().toLowerCase() === 'untitled card') {
      element.value = '';
      return;
    }
    if (element.type === 'checkbox') element.checked = Boolean(data[name]);
    else element.value = data[name];
  });
  field('branding_mode').value = data.branding_mode || (data.show_branding === false ? 'hidden' : 'liw');
  field('show_branding').checked = field('branding_mode').value !== 'hidden';
  field('status').value = data.status;
  profileUrl = data.profile_image_url || '';
  coverUrl = data.cover_image_url || '';
  field('cover_image_url').value = coverUrl;
  updatePhoto();
  updateCoverPreview();

  const [linksResult, servicesResult, productsResult] = await Promise.all([
    supabaseClient.from('social_links').select('*').eq('card_id', currentId).order('sort_order'),
    supabaseClient.from('card_services').select('*').eq('card_id', currentId).order('sort_order'),
    supabaseClient.from('card_products').select('*').eq('card_id', currentId).order('sort_order')
  ]);
  socialLinks = linksResult.data || [];
  services = servicesResult.data || [];
  products = productsResult.data || [];

  document.querySelectorAll('.template-card').forEach(item => item.classList.toggle('active', item.dataset.template === String(data.template_id || '')));
  updatePublicControls();
}

function applyEditorPermissionMode() {
  if (canEditCurrentCard) return;

  const message = currentTeamRole === 'viewer'
    ? 'View only — the workspace owner did not grant editing access.'
    : 'No edit access — this card is not shared with your account.';
  setSaveState('saved', 'View only');

  const notice = document.createElement('div');
  notice.className = 'editor-access-notice';
  notice.setAttribute('role', 'status');
  notice.innerHTML = `<strong>${escapeHtml(message)}</strong><span>You may preview this card, but only its owner or an invited editor can save, publish, or delete it.</span>`;
  document.querySelector('.editor-workspace')?.prepend(notice);

  document.querySelectorAll('.editor-panel input, .editor-panel textarea, .editor-panel select, .editor-panel button, .upload-actions button, .upload-actions input').forEach(element => {
    element.disabled = true;
  });
  ['save-now-button', 'publish-button', 'panel-publish-button'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = true;
  });
}

function wireEvents() {
  if (editorEventsWired) return;
  editorEventsWired = true;
  document.querySelectorAll('.editor-tab').forEach(tab => tab.addEventListener('click', () => {
    openTab(tab.dataset.tab);
    requestImmediateAutosave();
  }));
  ['open-advanced-tools-publish'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      openTab('tools');
      requestImmediateAutosave();
    });
  });
  document.getElementById('editor-step-back')?.addEventListener('click', () => {
    moveEditorStep(-1);
    requestImmediateAutosave();
  });
  document.getElementById('editor-step-next')?.addEventListener('click', () => {
    moveEditorStep(1);
    requestImmediateAutosave();
  });
  document.querySelectorAll('input,textarea,select').forEach(element => {
    if (['profile-file','cover-file','payment-qr-file','qr-logo-file'].includes(element.id) || element.closest('.builder-list')) return;
    element.addEventListener('input', () => {
      enforceEntitlementToggle(element);
      render();
      updateCompletion();
      scheduleSave();
    });
    element.addEventListener('change', () => {
      enforceEntitlementToggle(element);
      render();
      scheduleSave();
    });
  });

  document.getElementById('bio').addEventListener('input', () => document.getElementById('bio-count').textContent = value('biography').length);
  document.getElementById('profile-file').addEventListener('change', uploadPhoto);
  wireProfilePositionControls();
  document.getElementById('cover-file')?.addEventListener('change', uploadCover);
  document.getElementById('payment-qr-file')?.addEventListener('change', uploadPaymentQr);
  document.getElementById('qr-logo-file')?.addEventListener('change', uploadQrLogo);
  document.getElementById('remove-photo').addEventListener('click', () => {
    profileUrl = '';
    field('profile_image_url').value = '';
    resetProfilePosition(false);
    updatePhoto();
    render();
    scheduleSave();
  });
  document.getElementById('remove-qr-logo')?.addEventListener('click', () => {
    if (!hasEntitlement('custom_qr')) return toast('Custom QR logos are included with Pro.');
    if (field('qr_logo_url')) field('qr_logo_url').value = '';
    renderQrPreview();
    scheduleSave();
  });

  document.getElementById('remove-cover')?.addEventListener('click', () => {
    coverUrl = '';
    field('cover_image_url').value = '';
    updateCoverPreview();
    render();
    scheduleSave();
  });
  field('branding_mode')?.addEventListener('change', () => {
    updateBrandingControls();
    render();
    scheduleSave();
  });
  field('cover_overlay')?.addEventListener('input', () => {
    const valueElement = document.getElementById('cover-overlay-value');
    if (valueElement) valueElement.textContent = value('cover_overlay') || '24';
    updateCoverPreview();
  });
  document.getElementById('add-social').addEventListener('click', () => addSocialRow());
  document.querySelectorAll('[data-quick-social]').forEach(button => button.addEventListener('click', () => {
    const platform = socialKey(button.dataset.quickSocial);
    const existingIndex = socialLinks.findIndex(link => socialKey(link.platform) === platform);
    if (existingIndex >= 0) {
      document.querySelector(`[data-social-index="${existingIndex}"] input`)?.focus();
      return;
    }
    addSocialRow({ platform, url: '' });
    setTimeout(() => document.querySelector(`[data-social-index="${socialLinks.length - 1}"] input`)?.focus(), 0);
  }));
  document.getElementById('show-business-tools')?.addEventListener('click', () => {
    const content = document.getElementById('business-tools-content');
    const button = document.getElementById('show-business-tools');
    if (!content || !button) return;
    content.hidden = !content.hidden;
    button.innerHTML = content.hidden
      ? '<i data-lucide="plus" size="16"></i> Add business tools'
      : '<i data-lucide="chevron-up" size="16"></i> Hide business tools';
    if (!content.hidden) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.lucide) lucide.createIcons();
  });
  ['open-business-tools', 'publish-add-tools'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      const content = document.getElementById('business-tools-content');
      if (content) content.hidden = false;
      openTab('tools');
    });
  });
  document.getElementById('business-tools-back')?.addEventListener('click', () => openTab('share'));
  document.getElementById('add-service').addEventListener('click', () => addServiceRow());
  document.getElementById('add-product').addEventListener('click', () => addProductRow());
  document.getElementById('save-now-button')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await flushSave({ force: true, silent: false });
    } catch (_) {
      // performSave already shows the useful error.
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('publish-button').addEventListener('click', togglePublish);
  document.getElementById('panel-publish-button').addEventListener('click', togglePublish);
  document.getElementById('copy-card-link').addEventListener('click', copyCardLink);
  document.getElementById('download-qr').addEventListener('click', openQrImage);
  document.getElementById('test-qr-safety')?.addEventListener('click', () => runQrSafetyCheck({ manual: true }));
  document.getElementById('preview-link')?.addEventListener('click', openFullPreview);
  document.getElementById('mobile-preview-button')?.addEventListener('click', openFullPreview);
  document.getElementById('slug').addEventListener('input', () => {
    field('slug').value = slugify(field('slug').value);
    const slugStatus = document.getElementById('slug-status');
    if (slugStatus) {
      slugStatus.textContent = 'This address will be checked when the card saves. A taken address will not block your other changes.';
      slugStatus.className = 'input-help slug-status';
    }
    render();
  });
  document.querySelectorAll('.color-preset').forEach(button => button.addEventListener('click', () => {
    const [primary, secondary, background, text] = button.dataset.colors.split(',');
    field('primary_color').value = primary;
    field('secondary_color').value = secondary;
    field('background_color').value = background;
    field('text_color').value = text;
    field('button_color').value = primary;
    field('gradient_background').value = `linear-gradient(135deg,${primary},${secondary})`;
    document.querySelectorAll('.color-preset').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('template-selected-summary').textContent = 'Customized';
    render();
    scheduleSave();
  }));
  ['primary_color', 'secondary_color'].forEach(name => field(name)?.addEventListener('input', () => {
    field('gradient_background').value = `linear-gradient(135deg,${value('primary_color')},${value('secondary_color')})`;
    if (name === 'primary_color') field('button_color').value = value('primary_color');
    document.getElementById('template-selected-summary').textContent = 'Customized';
  }));
  document.querySelector('[data-close-dialog]').addEventListener('click', () => document.getElementById('upgrade-dialog').close());

  // Autosave must survive step changes, brief connection drops, and mobile tab switching.
  window.addEventListener('online', () => {
    if (dirtyRevision > savedRevision) {
      setSaveState('saving', 'Back online · saving…');
      requestImmediateAutosave();
    }
  });
  window.addEventListener('offline', () => {
    if (dirtyRevision > savedRevision) {
      persistLocalDraft();
      setSaveState('error', 'Offline · recovery copy stored');
    }
  });
  document.querySelector('.editor-workspace')?.addEventListener('focusout', () => {
    if (dirtyRevision > savedRevision && navigator.onLine) requestImmediateAutosave();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dirtyRevision > savedRevision) persistLocalDraft();
    if (document.visibilityState === 'visible' && dirtyRevision > savedRevision && navigator.onLine) requestImmediateAutosave();
  });
  window.addEventListener('pagehide', () => {
    if (dirtyRevision > savedRevision) persistLocalDraft();
  });
  clearInterval(autosaveWatchdog);
  autosaveWatchdog = setInterval(() => {
    if (dirtyRevision > savedRevision && navigator.onLine && !saveTimer) runAutosave();
  }, 5000);
}

function syncBusinessToolsVisibility() {
  const content = document.getElementById('business-tools-content');
  const button = document.getElementById('show-business-tools');
  if (!content) return;
  const hasBusinessContent = services.some(item => item.name?.trim())
    || products.some(item => item.name?.trim())
    || ['services_enabled','products_enabled','booking_enabled','lead_form_enabled','payment_sharing_enabled'].some(name => Boolean(value(name)))
    || ['booking_url','payment_url','cash_app_cashtag','venmo_username','paypal_url','zelle_contact'].some(name => Boolean(value(name).trim()));
  content.hidden = !hasBusinessContent;
  if (button) button.innerHTML = content.hidden
    ? '<i data-lucide="plus" size="16"></i> Add business tools'
    : '<i data-lucide="chevron-up" size="16"></i> Hide business tools';
  if (window.lucide) lucide.createIcons();
}

function openTab(name, { scroll = true } = {}) {
  const safeName = editorPanelNames.includes(name) ? name : 'content';
  document.querySelectorAll('.editor-tab').forEach(item => {
    const active = item.dataset.tab === safeName;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'step' : 'false');
  });
  document.querySelectorAll('.editor-panel').forEach(item => item.classList.toggle('active', item.dataset.panel === safeName));
  updateEditorFlowState(safeName);
  if (scroll) document.querySelector('.editor-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function moveEditorStep(direction) {
  const activePanel = document.querySelector('.editor-panel.active')?.dataset.panel || 'content';
  const active = editorStepOrder.includes(activePanel) ? activePanel : activePanel;
  if (active === 'tools') {
    openTab('share');
    return;
  }
  if (direction > 0 && active === 'content' && !value('full_name').trim()) {
    toast('Add the name that should appear on the card.');
    field('full_name')?.focus();
    return;
  }
  const index = editorStepOrder.indexOf(active);
  const nextIndex = Math.max(0, Math.min(editorStepOrder.length - 1, index + direction));
  if (nextIndex === index) return;
  openTab(editorStepOrder[nextIndex]);
}

function updateEditorFlowState(activeName = document.querySelector('.editor-panel.active')?.dataset.panel || 'content') {
  const isAdvancedTools = activeName === 'tools';
  const index = isAdvancedTools ? editorStepOrder.length - 1 : Math.max(0, editorStepOrder.indexOf(activeName));
  const detail = editorStepDetails[activeName] || editorStepDetails.content;
  const stepNumber = index + 1;
  const kicker = document.getElementById('editor-flow-kicker');
  const title = document.getElementById('editor-flow-title');
  const help = document.getElementById('editor-flow-help');
  const status = document.getElementById('editor-step-status');
  const nextCopy = document.getElementById('editor-step-next-copy');
  const back = document.getElementById('editor-step-back');
  const next = document.getElementById('editor-step-next');
  if (kicker) kicker.textContent = isAdvancedTools ? 'Advanced tools · Optional' : `Step ${stepNumber} of ${editorStepOrder.length} · About 2 minutes`;
  if (title) title.textContent = detail.title;
  if (help) help.textContent = detail.help;
  if (status) status.textContent = isAdvancedTools ? 'Advanced tools' : `Step ${stepNumber} of ${editorStepOrder.length}`;
  if (back) back.disabled = !isAdvancedTools && index === 0;
  if (next) {
    next.disabled = !isAdvancedTools && index === editorStepOrder.length - 1;
    next.innerHTML = isAdvancedTools
      ? '<i data-lucide="arrow-left" size="16"></i> Back to publish'
      : index === editorStepOrder.length - 1
        ? '<i data-lucide="circle-check" size="16"></i> Ready to publish'
        : `Continue <i data-lucide="arrow-right" size="16"></i>`;
  }
  if (nextCopy) nextCopy.textContent = isAdvancedTools
    ? 'These extras are optional and can be changed anytime.'
    : index === editorStepOrder.length - 1
      ? 'Check your card link, then publish when ready.'
      : `Next: ${editorStepDetails[editorStepOrder[index + 1]].title}`;
  document.querySelectorAll('.fast-track-item').forEach((item, itemIndex) => {
    item.classList.toggle('active', !isAdvancedTools && itemIndex === index);
    item.classList.toggle('complete', !isAdvancedTools && itemIndex < index);
  });
  if (window.lucide) lucide.createIcons();
}

function handleEditorDeepLink(params) {
  const tab = params.get('tab');
  const feature = params.get('feature');
  const themeKey = params.get('theme');
  if (tab) openTab(tab);
  if (themeKey) {
    openTab('design');
    const theme = templates.find(item => item.template_key === themeKey);
    if (theme && hasTemplateAccess(theme)) {
      applyTemplate(theme);
      document.querySelector(`[data-template="${theme.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (theme) {
      toast('This theme is not available for this account.');
    }
  }
  if (!feature) return;

  if (feature === 'premium_templates') {
    openTab('design');
    document.getElementById('template-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (feature === 'custom_qr') {
    openTab('share');
    const details = document.getElementById('share-qr-settings');
    if (details) details.open = true;
    document.getElementById('qr-design-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  openTab('tools');
  const toolsContent = document.getElementById('business-tools-content');
  if (toolsContent) toolsContent.hidden = false;
  const card = document.querySelector(`[data-entitlement-card="${feature}"]`);
  if (card) {
    card.classList.add('feature-focus');
    setTimeout(() => card.classList.remove('feature-focus'), 2600);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const fieldName = feature === 'appointment_booking' ? 'booking_enabled' : feature === 'lead_capture' ? 'lead_form_enabled' : feature === 'product_showcase' ? 'products_enabled' : null;
  const toggle = fieldName && field(fieldName);
  if (toggle && hasEntitlement(feature)) {
    toggle.checked = true;
    render();
    scheduleSave();
  }
  if (feature === 'appointment_booking') field('booking_url')?.focus();
}

function render() {
  renderQrPreview();
  const fullName = value('full_name') || 'Your Name';
  const initials = fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'YN';
  document.getElementById('p-name').textContent = fullName;
  document.getElementById('p-title').textContent = value('job_title') || 'Your position';
  document.getElementById('p-company').textContent = value('company_name') || 'Your company';
  document.getElementById('p-headline').textContent = value('headline');
  document.getElementById('p-bio').textContent = value('biography') || 'A short introduction about your business will appear here.';
  const previewInitials = document.getElementById('preview-initials');
  if (previewInitials) previewInitials.textContent = initials;

  const primary = value('primary_color') || '#0b1438';
  const secondary = value('secondary_color') || '#d4a84f';
  const background = value('background_color') || '#ffffff';
  const text = value('text_color') || '#111827';
  const buttonColor = value('button_color') || primary;
  const buttonTextColor = value('button_text_color') || '#ffffff';
  const layout = safeLayout(value('card_layout') || 'classic');
  const gradient = value('gradient_background') || `linear-gradient(135deg,${primary},${secondary})`;
  applyCoverStyle(document.getElementById('preview-cover'), coverUrl, gradient, value('cover_position'), value('cover_overlay'));
  const phone = document.getElementById('phone-preview');
  phone.className = `phone preview-layout-${layout} preview-mode-${value('color_mode') || 'light'}`;
  phone.style.background = background;
  phone.style.color = text;
  phone.style.fontFamily = value('font_family') || 'DM Sans';
  phone.style.setProperty('--preview-primary', primary);
  phone.style.setProperty('--preview-secondary', secondary);
  phone.style.setProperty('--preview-button', buttonColor);
  phone.style.setProperty('--preview-button-text', buttonTextColor);
  phone.style.setProperty('--preview-radius', `${value('border_radius') || 16}px`);

  const avatar = document.getElementById('preview-avatar');
  avatar.style.borderRadius = value('profile_image_shape') === 'square' ? '8px' : value('profile_image_shape') === 'rounded' ? '25px' : '50%';
  const customProfileBorder = String(value('profile_border_color') || '').trim().toLowerCase();
  const profileBorderAllowed = Boolean((isAdmin && !isPlanPreview) || editorAccess?.has?.('profile_border_color'));
  avatar.style.borderColor = profileBorderAllowed && /^#[0-9a-f]{6}$/.test(customProfileBorder) ? customProfileBorder : primary;
  window.LIWProfileBorder?.refresh?.();
  applyProfileImagePosition();
  renderPreviewBranding();
  const slug = value('slug') || slugify(fullName) || 'your-name';
  document.getElementById('slug-value').textContent = slug;
  document.getElementById('preview-status').textContent = value('status') === 'published' ? 'Published' : 'Draft';
  renderPreviewContactActions();
  renderPreviewBusinessActions();
  renderPreviewTools();
  renderPreviewSocials();
  renderPreviewServices();
  renderPreviewProducts();
  renderPreviewLead();
  applyPreviewButtonStyles();
  renderSocialStylePreview();
  updatePublicControls();
  if (window.lucide) lucide.createIcons();
}


function applyCoverStyle(element, imageUrl, gradient, position = 'center', overlay = 24) {
  if (!element) return;
  const safeOverlay = Math.max(0, Math.min(70, Number(overlay || 0)));
  const alpha = safeOverlay / 100;
  element.style.backgroundPosition = position || 'center';
  element.style.backgroundSize = 'cover';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundImage = imageUrl
    ? `linear-gradient(rgba(0,0,0,${alpha}),rgba(0,0,0,${alpha})),url("${String(imageUrl).replace(/"/g, '%22')}")`
    : gradient;
}

function updateCoverPreview() {
  field('cover_image_url').value = coverUrl;
  const preview = document.getElementById('cover-preview');
  const primary = value('primary_color') || '#0b1438';
  const secondary = value('secondary_color') || '#d4a84f';
  const gradient = value('gradient_background') || `linear-gradient(135deg,${primary},${secondary})`;
  applyCoverStyle(preview, coverUrl, gradient, value('cover_position'), value('cover_overlay'));
  if (preview) preview.innerHTML = coverUrl ? '<span><i data-lucide="image-check" size="19"></i> Cover image ready</span>' : '<span><i data-lucide="image" size="19"></i> Gradient cover</span>';
  const overlayValue = document.getElementById('cover-overlay-value');
  if (overlayValue) overlayValue.textContent = value('cover_overlay') || '24';
  if (window.lucide) lucide.createIcons();
}

function updateBrandingControls() {
  const mode = value('branding_mode') || 'liw';
  field('show_branding').checked = mode !== 'hidden';
  const customFields = document.getElementById('custom-branding-fields');
  if (customFields) customFields.hidden = mode !== 'custom';
}

function renderPreviewBranding() {
  const element = document.getElementById('preview-branding');
  if (!element) return;
  const mode = value('branding_mode') || 'liw';
  updateBrandingControls();
  element.classList.toggle('custom-branding', mode === 'custom');
  element.hidden = mode === 'hidden';
  if (mode === 'custom') {
    const text = value('custom_branding_text') || value('company_name') || 'Visit our website';
    element.href = normalizeEditorUrl(value('custom_branding_url') || value('website') || '#');
    element.innerHTML = `<span>${escapeHtml(text)}</span><i data-lucide="external-link" size="13"></i>`;
  } else {
    element.href = 'https://cards.liwworgs.com';
    element.innerHTML = '<span>Powered by</span><img src="assets/liw-worgs-logo.png" alt="LIW Worgs Inc">';
  }
  if (window.lucide) lucide.createIcons();
}

function normalizeEditorUrl(url) {
  if (!url || url === '#') return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function renderPreviewContactActions() {
  const area = document.querySelector('.preview-actions');
  if (!area) return;
  const actions = [];
  const callNumber = String(value('phone') || '').trim();
  const textNumber = String(value('sms_phone') || '').trim() || callNumber;
  if (callNumber) actions.push({ icon: 'phone', label: 'Call' });
  if (textNumber) actions.push({ icon: 'message-square-text', label: 'Text' });
  if (value('email')) actions.push({ icon: 'mail', label: 'Email' });
  if (value('website')) actions.push({ icon: 'globe', label: 'Website' });
  if (value('business_address')) actions.push({ icon: 'map-pin', label: 'Directions' });
  if (!actions.length) actions.push({ icon: 'phone', label: 'Call' }, { icon: 'mail', label: 'Email' }, { icon: 'globe', label: 'Website' });
  const visibleActions = actions.slice(0, 5);
  area.dataset.actionCount = String(visibleActions.length);
  area.style.gridTemplateColumns = `repeat(${Math.max(visibleActions.length, 1)}, minmax(0, 1fr))`;
  area.innerHTML = visibleActions.map(action => `<span class="preview-action"><i data-lucide="${action.icon}" size="15"></i><span>${action.label}</span></span>`).join('');
}

function renderPreviewTools() {
  const tools = [];
  if (value('booking_enabled') && value('booking_url')) tools.push('<span><i data-lucide="calendar-check-2" size="14"></i> Book</span>');
  if (value('payment_url')) tools.push('<span class="preview-payment-action"><i data-lucide="badge-dollar-sign" size="14"></i> Pay</span>');
  const sharedPayments = [value('cash_app_cashtag'), value('venmo_username'), value('paypal_url'), value('zelle_contact')].filter(Boolean).length;
  if (value('payment_sharing_enabled') && sharedPayments) tools.push(`<span class="preview-payment-action"><i data-lucide="hand-coins" size="14"></i> ${sharedPayments} pay option${sharedPayments === 1 ? '' : 's'}</span>`);
  if (value('lead_form_enabled')) tools.push('<span><i data-lucide="inbox" size="14"></i> Inquire</span>');
  if (value('products_enabled') && products.length) tools.push(`<span><i data-lucide="shopping-bag" size="14"></i> ${products.length} product${products.length === 1 ? '' : 's'}</span>`);
  document.getElementById('preview-tools').innerHTML = tools.join('');
  if (window.lucide) lucide.createIcons();
}

function renderPreviewBusinessActions() {
  const area = document.getElementById('preview-business-actions');
  if (!area) return;
  const actions = [];
  if (value('booking_enabled') && value('booking_url')) actions.push({ icon: 'calendar-check-2', label: 'Book an appointment' });
  if (value('payment_url')) actions.push({ icon: 'badge-dollar-sign', label: 'Make a payment' });
  if (value('lead_form_enabled')) actions.push({ icon: 'inbox', label: 'Send an inquiry' });
  area.hidden = !actions.length;
  area.innerHTML = actions.map((action, index) => `<span class="preview-business-action ${index === 0 ? 'primary' : ''}"><i data-lucide="${action.icon}" size="15"></i><span>${escapeHtml(action.label)}</span><i data-lucide="arrow-up-right" size="14"></i></span>`).join('');
}

function renderPreviewServices() {
  const section = document.getElementById('preview-services-section');
  const area = document.getElementById('preview-services');
  if (!section || !area) return;
  const visible = value('services_enabled') ? services.filter(service => service.name?.trim()).slice(0, 3) : [];
  section.hidden = !visible.length;
  area.innerHTML = visible.map(service => `<article class="preview-service-card"><span><strong>${escapeHtml(service.name)}</strong>${service.description ? `<small>${escapeHtml(service.description)}</small>` : ''}</span>${service.price_cents != null ? `<em>${formatMoney(service.price_cents)}</em>` : '<i data-lucide="arrow-right" size="14"></i>'}</article>`).join('');
}

function renderPreviewProducts() {
  const section = document.getElementById('preview-products-section');
  const area = document.getElementById('preview-products');
  if (!section || !area) return;
  const visible = value('products_enabled') ? products.filter(product => product.name?.trim()).slice(0, 2) : [];
  section.hidden = !visible.length;
  area.innerHTML = visible.map(product => {
    const image = Array.isArray(product.image_urls) ? product.image_urls[0] : '';
    return `<article class="preview-product-card">${image ? `<img src="${escapeHtml(image)}" alt="">` : '<span class="preview-product-placeholder"><i data-lucide="package" size="17"></i></span>'}<div><strong>${escapeHtml(product.name)}</strong>${product.price_cents != null ? `<small>${formatMoney(product.price_cents)}</small>` : '<small>View product</small>'}</div></article>`;
  }).join('');
}

function renderPreviewLead() {
  const section = document.getElementById('preview-lead-section');
  if (section) section.hidden = !value('lead_form_enabled');
}

function applyPreviewButtonStyles() {
  const buttonColor = value('button_color') || value('primary_color') || '#0b1438';
  const buttonTextColor = value('button_text_color') || '#ffffff';
  const radius = `${value('border_radius') || 16}px`;
  const style = value('button_style') || 'filled';
  document.querySelectorAll('.preview-action').forEach(button => {
    // Contact tiles use the same compact, lightly tinted treatment as the public card.
    // They are intentionally independent from the main CTA button style.
    button.style.borderRadius = '15px';
    button.style.background = `color-mix(in srgb, ${value('primary_color') || '#0b1438'} 9%, transparent)`;
    button.style.border = '0';
    button.style.color = value('primary_color') || '#0b1438';
  });
  const saveButton = document.querySelector('.preview-save-contact');
  if (saveButton) {
    saveButton.style.borderRadius = radius;
    if (style === 'outline') {
      saveButton.style.background = 'transparent';
      saveButton.style.border = `1px solid ${buttonColor}`;
      saveButton.style.color = buttonColor;
    } else if (style === 'soft') {
      saveButton.style.background = `color-mix(in srgb, ${buttonColor} 14%, transparent)`;
      saveButton.style.border = '0';
      saveButton.style.color = buttonColor;
    } else {
      saveButton.style.background = buttonColor;
      saveButton.style.border = '0';
      saveButton.style.color = buttonTextColor;
    }
  }
}

function normalizedProfilePosition(name, fallback) {
  const number = Number(value(name));
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
}

function normalizedProfileZoom(fallback = 125) {
  const number = Number(value('profile_zoom'));
  return Number.isFinite(number) ? Math.max(110, Math.min(200, number)) : fallback;
}

function updateProfilePositionLabels() {
  const x = Math.round(normalizedProfilePosition('profile_position_x', 50));
  const y = Math.round(normalizedProfilePosition('profile_position_y', 22));
  const zoom = Math.round(normalizedProfileZoom(125));
  const xOutput = document.getElementById('profile-position-x-value');
  const yOutput = document.getElementById('profile-position-y-value');
  const zoomOutput = document.getElementById('profile-zoom-value');
  if (xOutput) xOutput.textContent = `${x}%`;
  if (yOutput) yOutput.textContent = `${y}%`;
  if (zoomOutput) zoomOutput.textContent = `${zoom}%`;
}

function profileCropTransform(x, y, zoomPercent) {
  const zoom = Math.max(1.1, Math.min(2, Number(zoomPercent || 125) / 100));
  // The allowed translation is derived from the extra image area created by zoom.
  // This prevents blank edges while making positioning work even for square photos.
  const maxTranslate = ((zoom - 1) / (2 * zoom)) * 100;
  const translateX = ((x - 50) / 50) * maxTranslate;
  const translateY = ((y - 50) / 50) * maxTranslate;
  return `scale(${zoom}) translate(${translateX}%, ${translateY}%)`;
}

function applyProfileImagePosition() {
  const x = normalizedProfilePosition('profile_position_x', 50);
  const y = normalizedProfilePosition('profile_position_y', 22);
  const zoom = normalizedProfileZoom(125);
  const transform = profileCropTransform(x, y, zoom);
  document.querySelectorAll('#photo-preview img, #preview-avatar img').forEach(image => {
    image.style.objectPosition = '50% 50%';
    image.style.transformOrigin = 'center center';
    image.style.transform = transform;
  });
  updateProfilePositionLabels();
}

function resetProfilePosition(shouldSave = true) {
  if (field('profile_position_x')) field('profile_position_x').value = '50';
  if (field('profile_position_y')) field('profile_position_y').value = '22';
  if (field('profile_zoom')) field('profile_zoom').value = '125';
  applyProfileImagePosition();
  if (shouldSave) scheduleSave();
}

function wireProfilePositionControls() {
  const resetButton = document.getElementById('reset-profile-position');
  resetButton?.addEventListener('click', () => {
    resetProfilePosition(true);
    toast('Profile photo position reset');
  });

  [document.getElementById('photo-preview'), document.getElementById('preview-avatar')].filter(Boolean).forEach(container => {
    let dragState = null;
    container.addEventListener('pointerdown', event => {
      if (!profileUrl || !canEditCurrentCard) return;
      event.preventDefault();
      container.setPointerCapture?.(event.pointerId);
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        positionX: normalizedProfilePosition('profile_position_x', 50),
        positionY: normalizedProfilePosition('profile_position_y', 22),
        zoom: normalizedProfileZoom(125)
      };
      container.classList.add('is-dragging');
    });
    container.addEventListener('pointermove', event => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const nextX = Math.max(0, Math.min(100, dragState.positionX + ((event.clientX - dragState.startX) / width) * 100));
      const nextY = Math.max(0, Math.min(100, dragState.positionY + ((event.clientY - dragState.startY) / height) * 100));
      field('profile_position_x').value = String(Math.round(nextX));
      field('profile_position_y').value = String(Math.round(nextY));
      applyProfileImagePosition();
      setSaveState('saving', 'Unsaved changes');
    });
    const endDrag = event => {
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;
      dragState = null;
      container.classList.remove('is-dragging');
      scheduleSave();
    };
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    container.addEventListener('lostpointercapture', endDrag);
  });
}

function updatePhoto() {
  field('profile_image_url').value = profileUrl;
  const containers = [document.getElementById('photo-preview'), document.getElementById('preview-avatar')];
  containers.forEach((element, index) => {
    const initials = (value('full_name') || 'YN').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    element.innerHTML = profileUrl
      ? `<img src="${escapeHtml(profileUrl)}" alt="Profile preview" draggable="false">`
      : index ? `<span id="preview-initials">${initials}</span>` : '<i data-lucide="user-round" size="28"></i>';
    element.classList.toggle('has-photo', Boolean(profileUrl));
  });
  const controls = document.getElementById('profile-position-controls');
  if (controls) controls.classList.toggle('is-disabled', !profileUrl);
  applyProfileImagePosition();
  if (window.lucide) lucide.createIcons();
}

async function uploadPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('Photo must be smaller than 5 MB');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${user.id}/${Date.now()}-${safeName}`;
  setSaveState('saving', 'Uploading photo…');
  const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) {
    setSaveState('saved', 'Saved');
    return toast(error.message);
  }
  const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
  profileUrl = data.publicUrl;
  field('profile_image_url').value = profileUrl;
  updatePhoto();
  render();
  await save({ silent: true });
  toast('Photo uploaded');
}


async function uploadCover(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!hasEntitlement('cover_image')) {
    event.target.value = '';
    return toast('Cover images are included with Plus, Pro, Starter Reseller, and Pro Reseller.');
  }
  if (file.size > 5 * 1024 * 1024) return toast('Cover image must be smaller than 5 MB');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${user.id}/covers/${Date.now()}-${safeName}`;
  setSaveState('saving', 'Uploading cover…');
  const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) {
    setSaveState('saved', 'Saved');
    return toast(error.message);
  }
  const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
  coverUrl = data.publicUrl;
  field('cover_image_url').value = coverUrl;
  updateCoverPreview();
  render();
  await save({ silent: true });
  toast('Cover image uploaded');
}


async function uploadQrLogo(event) {
  const originalFile = event.target.files?.[0];
  if (!originalFile) return;
  if (!hasEntitlement('custom_qr')) {
    event.target.value = '';
    return toast('Custom QR colors and logos are included with Pro.');
  }
  if (originalFile.size > 2 * 1024 * 1024) return toast('QR logo must be smaller than 2 MB');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(originalFile.type)) return toast('Upload a PNG, JPG, or WebP logo.');
  try {
    setSaveState('saving', 'Optimizing QR logo…');
    const file = window.LIWQr?.cropLogoFile ? await window.LIWQr.cropLogoFile(originalFile) : originalFile;
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `${user.id}/qr-logos/${Date.now()}-${safeName}`;
    setSaveState('saving', 'Uploading scan-safe QR logo…');
    const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/png' });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
    field('qr_logo_url').value = data.publicUrl;
    renderQrPreview();
    await save({ silent: true });
    await runQrSafetyCheck({ manual: false });
    toast('Logo cropped, resized, and optimized for QR scanning');
  } catch (error) {
    setSaveState('saved', 'Saved');
    toast(error?.message || 'Unable to optimize the QR logo.');
  } finally {
    event.target.value = '';
  }
}

function currentQrOptions(size = 420) {
  const custom = hasEntitlement('custom_qr');
  return {
    size,
    foreground: custom ? value('qr_foreground_color') : '#000000',
    background: custom ? value('qr_background_color') : '#FFFFFF',
    logoUrl: custom ? value('qr_logo_url') : ''
  };
}

function buildQrImageUrl(url, size = 420) {
  if (window.LIWQr?.buildImageUrl) return window.LIWQr.buildImageUrl(url, currentQrOptions(size)).url;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=000000&bgcolor=FFFFFF&ecc=H&qzone=4&margin=0&data=${encodeURIComponent(url)}`;
}

function applyQrLogo(image, logoUrl) {
  if (window.LIWQr?.applyLogo) return window.LIWQr.applyLogo(image, logoUrl, hasEntitlement('custom_qr'));
  if (!image) return;
  const allowed = hasEntitlement('custom_qr') && Boolean(logoUrl);
  image.hidden = !allowed;
  if (allowed) image.src = logoUrl;
  else image.removeAttribute('src');
}

function setQrSafetyStatus(state, message) {
  const status = document.getElementById('qr-safety-status');
  const panel = document.getElementById('qr-safety-panel');
  if (status) status.textContent = message;
  if (panel) panel.dataset.state = state;
}

function renderQrPreview() {
  const preview = document.getElementById('qr-editor-preview');
  const targetUrl = value('slug') ? cardUrl() : 'https://cards.liwworgs.com/card.html?slug=your-card';
  if (preview) {
    preview.crossOrigin = 'anonymous';
    preview.src = buildQrImageUrl(targetUrl, 380);
  }
  applyQrLogo(document.getElementById('qr-editor-logo-preview'), value('qr_logo_url'));
  const note = document.getElementById('qr-plan-note');
  if (note) note.textContent = hasEntitlement('custom_qr')
    ? 'Pro includes scan-safe custom colors and an automatically optimized center logo.'
    : 'Free includes a classic black-and-white QR code with a full quiet zone.';

  if (window.LIWQr?.safePalette) {
    const palette = window.LIWQr.safePalette(currentQrOptions().foreground, currentQrOptions().background);
    setQrSafetyStatus(palette.adjusted ? 'warning' : 'ready', palette.message);
  }
}

async function runQrSafetyCheck({ manual = false } = {}) {
  const targetUrl = value('slug') ? cardUrl() : 'https://cards.liwworgs.com/card.html?slug=your-card';
  if (!window.LIWQr?.testScan) {
    setQrSafetyStatus('ready', 'Scan-safe QR sizing and Level H correction are enabled.');
    return true;
  }
  setQrSafetyStatus('checking', 'Testing the QR with its current colors and logo…');
  const result = await window.LIWQr.testScan(targetUrl, currentQrOptions(640));
  setQrSafetyStatus(result.ok ? (result.verified ? 'passed' : 'ready') : 'failed', result.message);
  if (manual) toast(result.message);
  return result.ok;
}

async function openQrImage() {
  const targetUrl = cardUrl();
  const previewWindow = window.open('about:blank', '_blank');
  if (previewWindow) previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Preparing your scan-safe QR code…</p>';
  try {
    if (!window.LIWQr?.composeCanvas) {
      if (previewWindow) previewWindow.location.replace(buildQrImageUrl(targetUrl, 900));
      return;
    }
    const { canvas } = await window.LIWQr.composeCanvas(targetUrl, currentQrOptions(900));
    const imageUrl = canvas.toDataURL('image/png');
    if (previewWindow) previewWindow.location.replace(imageUrl);
  } catch (error) {
    if (previewWindow && !previewWindow.closed) previewWindow.location.replace(buildQrImageUrl(targetUrl, 900));
    toast(error?.message || 'Opened the QR without the logo because the logo image was unavailable.');
  }
}

async function uploadPaymentQr(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('Payment QR image must be smaller than 5 MB');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast('Upload a PNG, JPG, or WebP image.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${user.id}/payment-qr/${Date.now()}-${safeName}`;
  setSaveState('saving', 'Uploading payment QR…');
  const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) { setSaveState('saved', 'Saved'); return toast(error.message); }
  const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
  field('payment_qr_url').value = data.publicUrl;
  render();
  await save({ silent: true });
  toast('Payment QR uploaded');
}

function templateTier(template) {
  return template.access_tier || (template.is_premium ? 'premium' : 'standard');
}

function hasTemplateAccess(template) {
  const tier = templateTier(template);
  if (tier === 'standard') return true;
  if (tier === 'premium') return hasEntitlement('premium_templates');
  return false;
}

function renderTemplates() {
  const grid = document.getElementById('template-grid');
  if (!templates.length) {
    grid.innerHTML = '<div class="builder-empty" style="grid-column:1/-1">No templates are available.</div>';
    return;
  }

  const selectedTemplate = templates.find(template => String(template.id) === String(value('template_id') || ''));
  document.getElementById('template-selected-summary').textContent = selectedTemplate?.name || 'Custom design';
  const groups = [
    ['standard', 'Standard themes', 'Clean themes included with every account.'],
    ['premium', 'Premium library', 'Included with Premium Templates, Plus, Pro and reseller plans.']
  ];

  grid.innerHTML = groups.map(([tier, title, copy]) => {
    const rows = templates.filter(template => templateTier(template) === tier);
    if (!rows.length) return '';
    return `<section class="template-tier-group" data-template-tier="${tier}">
      <div class="template-tier-heading"><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(copy)}</p></div></div>
      <div class="template-tier-grid">${rows.map(template => {
        const config = template.configuration || {};
        const layout = safeLayout(config.layout || 'classic');
        const gradient = config.gradient_background || `linear-gradient(135deg,${config.primary_color || '#0b1438'},${config.secondary_color || '#d4a84f'})`;
        const active = String(value('template_id') || '') === String(template.id);
        const locked = !hasTemplateAccess(template);
        const tierName = templateTier(template);
        const badge = tierName === 'premium' ? (locked ? 'Premium' : 'Included') : 'Free';
        return `<button type="button" class="template-card ${active ? 'active' : ''} ${locked ? 'locked' : ''} tier-${tierName}" data-template="${template.id}" data-tier="${tierName}">
          <div class="template-mini mini-layout-${layout}" style="--mini-gradient:${escapeHtml(gradient)};--mini-bg:${escapeHtml(config.background_color || '#ffffff')};--mini-text:${escapeHtml(config.text_color || '#111827')};--mini-accent:${escapeHtml(config.button_color || config.primary_color || '#0b1438')}">
            <div class="template-mini-cover"></div><span class="template-mini-avatar"></span><div class="template-mini-copy"><span></span><span></span><span></span></div><div class="template-mini-actions"><span></span><span></span><span></span></div>
          </div>
          <div class="template-card-label"><span><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(titleCase(template.category || 'design'))}</small></span><em class="${tierName === 'standard' ? 'free' : ''}">${escapeHtml(badge)}</em></div>
          ${locked ? '<span class="template-lock"><i data-lucide="lock" size="14"></i></span>' : ''}
        </button>`;
      }).join('')}</div></section>`;
  }).join('');

  grid.querySelectorAll('.template-card').forEach(button => button.addEventListener('click', () => {
    const template = templates.find(item => String(item.id) === button.dataset.template);
    if (!template) return;
    if (!hasTemplateAccess(template)) {
      toast('Premium Templates is available from Features & Add-ons.');
      location.href = liwUrl('addons.html?feature=premium_templates');
      return;
    }
    applyTemplate(template);
  }));
  if (window.lucide) lucide.createIcons();
}

function applyTemplate(template) {
  const config = template.configuration || {};
  const keys = ['primary_color', 'secondary_color', 'background_color', 'text_color', 'button_color', 'button_text_color', 'font_family', 'button_style', 'profile_image_shape', 'border_radius', 'color_mode', 'gradient_background'];
  keys.forEach(key => {
    if (config[key] === undefined || config[key] === null || !field(key)) return;
    field(key).value = String(config[key]);
  });
  field('card_layout').value = safeLayout(config.layout || 'classic');
  field('template_id').value = template.id;
  document.querySelectorAll('.template-card').forEach(item => item.classList.toggle('active', item.dataset.template === String(template.id)));
  document.querySelectorAll('.color-preset').forEach(item => item.classList.remove('active'));
  document.getElementById('template-selected-summary').textContent = template.name;
  updateCoverPreview();
  render();
  scheduleSave();
  toast(`${template.name} design applied`);
}

function safeLayout(value) {
  const layout = String(value || 'classic').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return ['classic', 'swipe', 'executive', 'minimal', 'spotlight', 'luxe', 'split', 'bold', 'soft', 'playful', 'editorial', 'diamond', 'property', 'beauty', 'automotive', 'artist', 'dining'].includes(layout) ? layout : 'classic';
}

function addSocialRow(link = { platform: 'instagram', url: '' }) {
  if (socialLinks.length >= 12) return toast('You can add up to 12 social links');
  socialLinks.push(link);
  renderSocialRows();
}

function renderSocialRows() {
  const list = document.getElementById('social-list');
  if (!list) return;
  const platformOptions = (window.DOTCO_SOCIALS || []).map(item => `<option value="${item.key}">${item.label}</option>`).join('');
  if (!socialLinks.length) {
    list.innerHTML = '<div class="social-empty-state"><i data-lucide="share-2" size="18"></i><span>No social links added yet. This section is optional.</span></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  list.innerHTML = socialLinks.map((link, index) => {
    const meta = socialMeta(link.platform);
    return `<div class="social-row" data-social-index="${index}"><div class="social-row-icon">${socialIconHtml(meta.key, { size: 18 })}</div><select class="input" aria-label="Social platform">${platformOptions}</select><input class="input" type="url" placeholder="${escapeHtml(meta.placeholder)}" value="${escapeHtml(link.url || '')}"><button type="button" class="icon-btn" aria-label="Remove link"><i data-lucide="trash-2" size="17"></i></button></div>`;
  }).join('');
  list.querySelectorAll('.social-row').forEach(row => {
    const index = Number(row.dataset.socialIndex);
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    const button = row.querySelector('button');
    select.value = socialKey(socialLinks[index].platform);
    select.addEventListener('change', () => {
      socialLinks[index].platform = select.value;
      const meta = socialMeta(select.value);
      input.placeholder = meta.placeholder;
      row.querySelector('.social-row-icon').innerHTML = socialIconHtml(select.value, { size: 18 });
      render();
      scheduleSave();
    });
    input.addEventListener('input', () => {
      socialLinks[index].url = input.value;
      render();
      scheduleSave();
    });
    button.addEventListener('click', () => {
      socialLinks.splice(index, 1);
      renderSocialRows();
      render();
      scheduleSave();
    });
  });
  if (window.lucide) lucide.createIcons();
}

function normalizedSocialButtonStyle() {
  return ['brand', 'circle', 'outline', 'solid'].includes(value('social_button_style')) ? value('social_button_style') : 'brand';
}

function normalizedSocialButtonSize() {
  return ['small', 'large'].includes(value('social_button_size')) ? value('social_button_size') : 'small';
}

function socialPreviewMarkup(link, size = 15) {
  const meta = socialMeta(link.platform);
  return `<span class="social-preview-chip">${socialIconHtml(meta.key, { size })}<span class="social-preview-label">${escapeHtml(meta.label)}</span></span>`;
}

function renderPreviewSocials() {
  const area = document.getElementById('preview-socials');
  const section = document.getElementById('preview-social-section');
  if (!area) return;
  const visible = socialLinks.filter(link => link.url).slice(0, 6);
  if (section) section.hidden = !visible.length;
  area.dataset.socialStyle = normalizedSocialButtonStyle();
  area.dataset.socialSize = normalizedSocialButtonSize();
  const iconSize = normalizedSocialButtonSize() === 'small' ? 12 : 14;
  area.innerHTML = visible.map(link => socialPreviewMarkup(link, iconSize)).join('');
}

function renderSocialStylePreview() {
  const area = document.getElementById('social-style-preview');
  if (!area) return;
  const style = normalizedSocialButtonStyle();
  area.dataset.socialStyle = style;
  area.dataset.socialSize = normalizedSocialButtonSize();
  const examples = [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'whatsapp' }];
  const iconSize = normalizedSocialButtonSize() === 'small' ? 12 : 14;
  area.innerHTML = examples.map(link => socialPreviewMarkup(link, iconSize)).join('');
}

function addServiceRow(service = { name: '', description: '', price_cents: null, booking_url: '', payment_url: '', cta_label: 'Learn more', image_url: '' }) {
  const limit = contentLimit('services');
  if (services.length >= limit) return toast(`Your plan supports up to ${limit} services per card`);
  services.push(service);
  renderServiceRows();
  render();
  scheduleSave();
}

function renderServiceRows() {
  const list = document.getElementById('service-list');
  if (!services.length) {
    list.innerHTML = '<div class="builder-empty"><i data-lucide="list-plus" size="20"></i><span>Add services customers can browse from your card.</span></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  list.innerHTML = services.map((service, index) => `<div class="builder-row" data-service-index="${index}"><div class="builder-row-head"><strong>Service ${index + 1}</strong><button class="icon-btn" type="button" data-remove-service="${index}"><i data-lucide="trash-2" size="16"></i></button></div><div class="form-row"><input class="input" data-service-field="name" placeholder="Service name" value="${escapeHtml(service.name || '')}"><input class="input" data-service-field="price" inputmode="decimal" placeholder="Price, e.g. 49.00" value="${service.price_cents == null ? '' : (service.price_cents / 100).toFixed(2)}"></div><textarea class="input" data-service-field="description" placeholder="Short service description">${escapeHtml(service.description || '')}</textarea><div class="form-row"><input class="input" data-service-field="booking_url" type="url" placeholder="Booking link (optional)" value="${escapeHtml(service.booking_url || '')}"><input class="input" data-service-field="payment_url" type="url" placeholder="Payment link (optional)" value="${escapeHtml(service.payment_url || '')}"></div></div>`).join('');
  list.querySelectorAll('[data-service-index]').forEach(row => {
    const index = Number(row.dataset.serviceIndex);
    row.querySelectorAll('[data-service-field]').forEach(input => input.addEventListener('input', () => {
      const key = input.dataset.serviceField;
      if (key === 'price') services[index].price_cents = priceToCents(input.value);
      else services[index][key] = input.value;
      render();
      scheduleSave();
    }));
    row.querySelector('[data-remove-service]').addEventListener('click', () => {
      services.splice(index, 1);
      renderServiceRows();
      render();
      scheduleSave();
    });
  });
  if (window.lucide) lucide.createIcons();
}

function addProductRow(product = { name: '', description: '', price_cents: null, image_urls: [], purchase_url: '' }) {
  if (!hasEntitlement('product_showcase')) return toast('Product Showcase is included with Plus, Pro, Starter Reseller, and Pro Reseller.');
  const limit = contentLimit('products');
  if (products.length >= limit) return toast(`Your plan supports up to ${limit} products per card`);
  products.push(product);
  renderProductRows();
  render();
  scheduleSave();
}

function renderProductRows() {
  const list = document.getElementById('product-list');
  if (!products.length) {
    list.innerHTML = '<div class="builder-empty"><i data-lucide="package-plus" size="20"></i><span>Add products, photos, prices, and purchase links.</span></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  list.innerHTML = products.map((product, index) => `<div class="builder-row" data-product-index="${index}"><div class="builder-row-head"><strong>Product ${index + 1}</strong><button class="icon-btn" type="button" data-remove-product="${index}"><i data-lucide="trash-2" size="16"></i></button></div><div class="form-row"><input class="input" data-product-field="name" placeholder="Product name" value="${escapeHtml(product.name || '')}"><input class="input" data-product-field="price" inputmode="decimal" placeholder="Price, e.g. 29.99" value="${product.price_cents == null ? '' : (product.price_cents / 100).toFixed(2)}"></div><textarea class="input" data-product-field="description" placeholder="Short product description">${escapeHtml(product.description || '')}</textarea><div class="form-row"><input class="input" data-product-field="image_url" type="url" placeholder="Image URL" value="${escapeHtml(product.image_urls?.[0] || '')}"><input class="input" data-product-field="purchase_url" type="url" placeholder="Buy link" value="${escapeHtml(product.purchase_url || '')}"></div></div>`).join('');
  list.querySelectorAll('[data-product-index]').forEach(row => {
    const index = Number(row.dataset.productIndex);
    row.querySelectorAll('[data-product-field]').forEach(input => input.addEventListener('input', () => {
      const key = input.dataset.productField;
      if (key === 'price') products[index].price_cents = priceToCents(input.value);
      else if (key === 'image_url') products[index].image_urls = input.value ? [input.value] : [];
      else products[index][key] = input.value;
      render();
      scheduleSave();
    }));
    row.querySelector('[data-remove-product]').addEventListener('click', () => {
      products.splice(index, 1);
      renderProductRows();
      render();
      scheduleSave();
    });
  });
  if (window.lucide) lucide.createIcons();
}


function contentLimit(type) {
  if (isAdmin && !isPlanPreview) return 30;
  if (currentPlan === 'white_label' || currentPlan === 'agency') return 24;
  if (currentPlan === 'pro') return type === 'products' ? 12 : 16;
  if (currentPlan === 'plus') return type === 'products' ? 4 : 8;
  return type === 'products' ? 0 : 8;
}

function sanitizeLockedEntitlementValues({ notify = false } = {}) {
  const adjusted = [];
  const note = label => { if (!adjusted.includes(label)) adjusted.push(label); };

  const selectedTemplate = templates.find(template => String(template.id) === String(value('template_id') || ''));
  if (selectedTemplate && !hasTemplateAccess(selectedTemplate)) {
    field('template_id').value = '';
    document.querySelectorAll('.template-card').forEach(item => item.classList.remove('active'));
    const summary = document.getElementById('template-selected-summary');
    if (summary) summary.textContent = 'Custom design';
    note('premium template');
  }

  const fontSelect = field('font_family');
  if (!hasEntitlement('expanded_fonts') && fontSelect?.selectedOptions?.[0]?.dataset?.premiumFont === 'true') {
    fontSelect.value = 'DM Sans';
    note('premium font');
  }

  if (!hasEntitlement('cover_image') && (coverUrl || value('cover_image_url'))) {
    coverUrl = '';
    if (field('cover_image_url')) field('cover_image_url').value = '';
    note('cover image');
  }

  if (!hasEntitlement('custom_seo')) {
    ['seo_title', 'seo_description'].forEach(name => {
      if (field(name) && value(name)) {
        field(name).value = '';
        note('custom SEO');
      }
    });
  }

  if (!hasEntitlement('client_management')) {
    ['internal_label', 'client_name', 'campaign_tag'].forEach(name => {
      if (field(name) && value(name)) {
        field(name).value = '';
        note('client-management fields');
      }
    });
  }

  if (!hasEntitlement('custom_qr')) {
    const qrForeground = field('qr_foreground_color');
    const qrBackground = field('qr_background_color');
    const qrLogo = field('qr_logo_url');
    if (qrForeground && value('qr_foreground_color') !== '#000000') { qrForeground.value = '#000000'; note('custom QR styling'); }
    if (qrBackground && String(value('qr_background_color')).toUpperCase() !== '#FFFFFF') { qrBackground.value = '#FFFFFF'; note('custom QR styling'); }
    if (qrLogo && value('qr_logo_url')) { qrLogo.value = ''; note('custom QR styling'); }
  }

  const lockedToggles = {
    appointment_booking: 'booking_enabled',
    lead_capture: 'lead_form_enabled',
    product_showcase: 'products_enabled',
  };
  Object.entries(lockedToggles).forEach(([entitlement, fieldName]) => {
    const toggle = field(fieldName);
    if (!hasEntitlement(entitlement) && toggle?.checked) {
      toggle.checked = false;
      note(entitlement === 'appointment_booking' ? 'booking' : entitlement === 'lead_capture' ? 'lead capture' : 'product showcase');
    }
  });
  if (!hasEntitlement('product_showcase') && products.length) {
    products = [];
    note('product showcase');
  }

  const brandingMode = value('branding_mode') || 'liw';
  if ((brandingMode === 'hidden' && !hasEntitlement('remove_branding')) ||
      (brandingMode === 'custom' && !hasEntitlement('custom_branding_link'))) {
    field('branding_mode').value = 'liw';
    if (field('show_branding')) field('show_branding').checked = true;
    note('branding option');
  }
  if (value('branding_mode') !== 'custom') {
    if (field('custom_branding_text')) field('custom_branding_text').value = '';
    if (field('custom_branding_url')) field('custom_branding_url').value = '';
  }

  if (notify && adjusted.length) {
    toast(`Recovered draft adjusted for your plan: ${adjusted.join(', ')}.`);
  }
  return adjusted;
}

function applyEntitlements() {
  // Build the feature summary before rendering entitlement controls.
  // A missing declaration here previously stopped editor initialization for every account.
  const enabledTools = addonDefinitions.filter(item => {
    const entitlementKey = item.entitlement_key || item.addon_key;
    return item.is_active !== false && entitlementKey && hasEntitlement(entitlementKey);
  });

  const canRemoveBranding = hasEntitlement('remove_branding');
  const canCustomBranding = hasEntitlement('custom_branding_link');
  const canCover = hasEntitlement('cover_image');
  const canExpandedFonts = hasEntitlement('expanded_fonts');
  const canSeo = hasEntitlement('custom_seo');

  const brandingSelect = field('branding_mode');
  brandingSelect?.querySelectorAll('option').forEach(option => {
    if (option.value === 'custom') option.disabled = !canCustomBranding;
    if (option.value === 'hidden') option.disabled = !canRemoveBranding;
  });
  if ((!canCustomBranding && value('branding_mode') === 'custom') || (!canRemoveBranding && value('branding_mode') === 'hidden')) {
    brandingSelect.value = 'liw';
  }
  updateBrandingControls();

  const coverCard = document.querySelector('[data-entitlement-card="cover_image"]');
  const coverBadge = document.querySelector('[data-entitlement-badge="cover_image"]');
  coverCard?.classList.toggle('locked', !canCover);
  if (coverBadge) {
    coverBadge.className = `entitlement-badge ${canCover ? 'included' : 'locked'}`;
    coverBadge.innerHTML = canCover ? '<i data-lucide="circle-check" size="14"></i> Included' : '<i data-lucide="lock" size="14"></i> Pro feature';
  }
  document.getElementById('cover-file').disabled = !canCover;
  document.querySelector('label[for="cover-file"]')?.classList.toggle('disabled-control', !canCover);
  field('cover_position').disabled = !canCover;
  field('cover_overlay').disabled = !canCover;
  document.getElementById('remove-cover').disabled = !canCover;
  if (!canCover && coverUrl) {
    coverUrl = '';
    field('cover_image_url').value = '';
  }

  field('font_family')?.querySelectorAll('[data-premium-font="true"]').forEach(option => {
    option.disabled = !canExpandedFonts;
  });
  if (!canExpandedFonts && field('font_family')?.selectedOptions?.[0]?.dataset?.premiumFont === 'true') {
    field('font_family').value = 'DM Sans';
  }

  const seoCard = document.querySelector('[data-entitlement-card="custom_seo"]');
  const seoBadge = document.querySelector('[data-entitlement-badge="custom_seo"]');
  seoCard?.classList.toggle('locked', !canSeo);
  if (seoBadge) {
    seoBadge.className = `entitlement-badge ${canSeo ? 'included' : 'locked'}`;
    seoBadge.innerHTML = canSeo ? '<i data-lucide="circle-check" size="14"></i> Included' : '<i data-lucide="lock" size="14"></i> Pro feature';
  }
  ['seo_title','seo_description'].forEach(name => { if (field(name)) field(name).disabled = !canSeo; });

  const canCustomQr = hasEntitlement('custom_qr');
  const qrCard = document.querySelector('[data-entitlement-card="custom_qr"]');
  const qrBadge = document.querySelector('[data-entitlement-badge="custom_qr"]');
  qrCard?.classList.toggle('locked', !canCustomQr);
  if (qrBadge) {
    qrBadge.className = `entitlement-badge ${canCustomQr ? 'included' : 'locked'}`;
    qrBadge.innerHTML = canCustomQr ? '<i data-lucide="circle-check" size="14"></i> Custom QR included' : '<i data-lucide="qr-code" size="14"></i> Basic QR included';
  }
  ['qr_foreground_color','qr_background_color'].forEach(name => { if (field(name)) field(name).disabled = !canCustomQr; });
  const qrFile = document.getElementById('qr-logo-file');
  const qrRemove = document.getElementById('remove-qr-logo');
  if (qrFile) qrFile.disabled = !canCustomQr;
  if (qrRemove) qrRemove.disabled = !canCustomQr;
  document.querySelector('label[for="qr-logo-file"]')?.classList.toggle('disabled-control', !canCustomQr);
  if (!canCustomQr) {
    if (field('qr_foreground_color')) field('qr_foreground_color').value = '#000000';
    if (field('qr_background_color')) field('qr_background_color').value = '#FFFFFF';
    if (field('qr_logo_url')) field('qr_logo_url').value = '';
  }
  renderQrPreview();

  const brandingCard = document.querySelector('[data-entitlement-card="custom_branding_link"]');
  const brandingBadge = document.querySelector('[data-entitlement-badge="custom_branding_link"]');
  brandingCard?.classList.toggle('locked', !(canCustomBranding || canRemoveBranding));
  if (brandingBadge) {
    brandingBadge.className = `entitlement-badge ${(canCustomBranding || canRemoveBranding) ? 'included' : 'locked'}`;
    brandingBadge.innerHTML = (canCustomBranding || canRemoveBranding) ? '<i data-lucide="circle-check" size="14"></i> Included' : '<i data-lucide="lock" size="14"></i> Pro feature';
  }
  ['custom_branding_text','custom_branding_url'].forEach(name => { if (field(name)) field(name).disabled = !canCustomBranding; });

  const canClientManagement = hasEntitlement('client_management');
  const clientCard = document.querySelector('[data-entitlement-card="client_management"]');
  const clientBadge = document.querySelector('[data-entitlement-badge="client_management"]');
  clientCard?.classList.toggle('locked', !canClientManagement);
  if (clientBadge) {
    clientBadge.className = `entitlement-badge ${canClientManagement ? 'included' : 'locked'}`;
    clientBadge.innerHTML = canClientManagement ? '<i data-lucide="circle-check" size="14"></i> Agency included' : '<i data-lucide="lock" size="14"></i> Agency feature';
  }
  ['internal_label','client_name','campaign_tag'].forEach(name => { if (field(name)) field(name).disabled = !canClientManagement; });

  ['appointment_booking', 'lead_capture', 'product_showcase'].forEach(key => {
    const enabled = hasEntitlement(key);
    const card = document.querySelector(`[data-entitlement-card="${key}"]`);
    const badge = document.querySelector(`[data-entitlement-badge="${key}"]`);
    if (card) card.classList.toggle('locked', !enabled);
    if (badge) {
      badge.className = `entitlement-badge ${enabled ? 'included' : 'locked'}`;
      badge.innerHTML = enabled ? '<i data-lucide="circle-check" size="14"></i> Enabled' : '<i data-lucide="lock" size="14"></i> Pro feature';
    }
    const fieldName = key === 'appointment_booking' ? 'booking_enabled' : key === 'lead_capture' ? 'lead_form_enabled' : 'products_enabled';
    const toggle = field(fieldName);
    if (toggle) {
      toggle.disabled = !enabled;
      if (!enabled) toggle.checked = false;
    }
  });
  document.getElementById('add-product').disabled = !hasEntitlement('product_showcase');

  const summary = document.getElementById('editor-entitlement-summary');
  if (summary) {
    if (isAdmin && !isPlanPreview) {
      summary.innerHTML = '<div><strong>LIW Admin workspace</strong><span>100 cards, every software feature, 30 services, and 30 products per card are unlocked. No subscription purchase is required.</span></div><a class="btn btn-light btn-sm" href="admin.html">Admin overview</a>';
    } else if (isPlanPreview) {
      const previewFeatures = enabledTools.length
        ? enabledTools.map(item => escapeHtml(item.name)).join(' · ')
        : 'Core card tools only. Locked features show the same upgrade experience a customer sees.';
      summary.innerHTML = `<div><strong>${escapeHtml(editorAccess.planName)} customer preview</strong><span>${previewFeatures}<br>Card edits save to your LIW Admin workspace. Billing and subscriptions remain unchanged.</span></div><a class="btn btn-light btn-sm" href="pricing.html">View plan page</a>`;
    } else summary.innerHTML = enabledTools.length
      ? `<div><strong>Your active features</strong><span>${enabledTools.map(item => escapeHtml(item.name)).join(' · ')}</span></div><a class="btn btn-light btn-sm" href="addons.html">View features</a>`
      : '<div><strong>Starter tools</strong><span>Upgrade to add cover images, custom branding, expanded fonts, SEO, booking, leads, products, and analytics.</span></div><a class="btn btn-primary btn-sm" href="pricing.html">See Pro features</a>';
  }
  updateCoverPreview();
  if (window.lucide) lucide.createIcons();
}

function enforceEntitlementToggle(element) {
  const mapping = { booking_enabled: 'appointment_booking', lead_form_enabled: 'lead_capture', products_enabled: 'product_showcase' };
  const entitlement = mapping[element.name];
  if (entitlement && element.checked && !hasEntitlement(entitlement) && !isAdmin) {
    element.checked = false;
    toast('Activate this feature from the Add-ons marketplace');
  }
}

function hasEntitlement(key) {
  // LIW 2026 plan split: Plus keeps core business tools, while custom QR and custom SEO are Pro-only.
  if (!isAdmin || isPlanPreview) {
    if (currentPlan === 'plus' && ['custom_qr', 'custom_seo'].includes(key)) return false;
  }
  if (editorAccess) return editorAccess.has(key);
  if (isAdmin && !isPlanPreview) return true;
  const definition = addonDefinitions.find(item => item.entitlement_key === key || item.addon_key === key);
  if (!definition) return false;
  return definition.included_plans?.includes(currentPlan) || activeAddons.some(row => row.addon_key === definition.addon_key);
}

function draftStorageKey(cardId = currentId) {
  return `liw_editor_draft_${user?.id || 'guest'}_${cardId || 'new'}`;
}

function collectRawDraftCard() {
  const card = {};
  fieldNames.forEach(name => {
    const element = field(name);
    if (!element) return;
    card[name] = element.type === 'checkbox' ? element.checked : element.value;
  });
  card.status = value('status') || 'draft';
  card.show_branding = value('branding_mode') !== 'hidden';
  return card;
}

function persistLocalDraft() {
  if (!canEditCurrentCard || !user) return;
  try {
    localStorage.setItem(draftStorageKey(), JSON.stringify({
      version: 1,
      cardId: currentId,
      savedAt: Date.now(),
      card: collectRawDraftCard(),
      profileUrl,
      coverUrl,
      socialLinks,
      services,
      products,
    }));
  } catch (_) {}
}

function clearLocalDraft(...keys) {
  try {
    const all = new Set([draftStorageKey(), ...keys.filter(Boolean)]);
    all.forEach(key => localStorage.removeItem(key));
  } catch (_) {}
}

function restoreLocalDraftIfNewer() {
  if (!canEditCurrentCard || !user) return;
  try {
    const raw = localStorage.getItem(draftStorageKey());
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || Number(draft.savedAt || 0) <= Number(lastServerUpdatedAt || 0) + 1000) return;
    if (draft.cardId && currentId && String(draft.cardId) !== String(currentId)) return;
    Object.entries(draft.card || {}).forEach(([name, rawValue]) => {
      const element = field(name);
      if (!element) return;
      if (element.type === 'checkbox') element.checked = Boolean(rawValue);
      else element.value = rawValue == null ? '' : String(rawValue);
    });
    profileUrl = draft.profileUrl || '';
    coverUrl = draft.coverUrl || '';
    socialLinks = Array.isArray(draft.socialLinks) ? draft.socialLinks : socialLinks;
    services = Array.isArray(draft.services) ? draft.services : services;
    products = Array.isArray(draft.products) ? draft.products : products;
    sanitizeLockedEntitlementValues({ notify: true });
    applyEntitlements();
    renderTemplates();
    updatePhoto();
    updateCoverPreview();
    dirtyRevision = Math.max(dirtyRevision, 1);
    setTimeout(() => {
      renderSocialRows();
      renderServiceRows();
      renderProductRows();
      render();
      updateCompletion();
      setSaveState('saving', 'Recovered changes · saving…');
      requestImmediateAutosave();
      toast('Recovered unsaved editor changes from this browser');
    }, 0);
  } catch (_) {}
}

function collectCardPayload() {
  const brandingMode = value('branding_mode') || 'liw';
  if (field('show_branding')) field('show_branding').checked = brandingMode !== 'hidden';
  const payload = { show_branding: brandingMode !== 'hidden', branding_mode: brandingMode, status: value('status') || 'draft' };
  fieldNames.forEach(name => {
    const raw = value(name);
    if (typeof raw === 'boolean') payload[name] = raw;
    else payload[name] = raw === '' ? null : raw;
  });
  payload.profile_image_url = profileUrl || null;
  payload.cover_image_url = coverUrl || null;
  if (brandingMode !== 'custom') {
    payload.custom_branding_text = null;
    payload.custom_branding_url = null;
  }
  if (!payload.full_name) {
    if (payload.status === 'published') {
      payload.status = 'draft';
      field('status').value = 'draft';
    }
    payload.full_name = 'Untitled Card';
  }
  if (!payload.slug) {
    const slugBase = payload.full_name === 'Untitled Card' ? 'card' : payload.full_name;
    payload.slug = `${slugify(slugBase || 'card')}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // HTML color inputs serialize six-digit hex colors in lowercase. Always send
  // canonical QR values so Free's basic black-and-white QR can never be
  // mistaken for a paid custom QR by an entitlement check.
  if (!hasEntitlement('custom_qr')) {
    payload.qr_foreground_color = '#000000';
    payload.qr_background_color = '#FFFFFF';
    payload.qr_logo_url = null;
  } else if (window.LIWQr?.normalizeHex) {
    payload.qr_foreground_color = window.LIWQr.normalizeHex(payload.qr_foreground_color, '#000000');
    payload.qr_background_color = window.LIWQr.normalizeHex(payload.qr_background_color, '#FFFFFF');
  } else {
    payload.qr_foreground_color = String(payload.qr_foreground_color || '#000000').toUpperCase();
    payload.qr_background_color = String(payload.qr_background_color || '#FFFFFF').toUpperCase();
  }
  return payload;
}

function collectSaveChildren() {
  const socials = socialLinks.filter(link => link.url?.trim()).map((link, index) => {
    const meta = socialMeta(link.platform);
    return { platform: meta.key, label: meta.label, url: link.url.trim(), is_enabled: true, sort_order: index };
  });
  const cleanServices = services.filter(service => service.name?.trim()).map((service, index) => ({
    name: service.name.trim(), description: service.description?.trim() || null,
    price_cents: service.price_cents == null ? null : Number(service.price_cents), currency: 'usd',
    image_url: service.image_url?.trim() || null, booking_url: service.booking_url?.trim() || null,
    payment_url: service.payment_url?.trim() || null, cta_label: service.cta_label?.trim() || 'Learn more',
    is_enabled: true, sort_order: index
  }));
  const cleanProducts = products.filter(product => product.name?.trim()).map((product, index) => ({
    name: product.name.trim(), description: product.description?.trim() || null,
    price_cents: product.price_cents == null ? null : Number(product.price_cents), currency: 'usd',
    image_urls: Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [],
    purchase_url: product.purchase_url?.trim() || null, is_enabled: true, sort_order: index
  }));
  return { socials, services: cleanServices, products: cleanProducts };
}

async function saveEditorStateToServer(payload) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Your login expired. Sign in again so your changes can be saved.');
  const children = collectSaveChildren();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/save-card-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': LIW_CONFIG.supabaseKey },
      body: JSON.stringify({ cardId: currentId, card: payload, ...children }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Saving took too long. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { error: raw.slice(0, 300) }; }
  if (!response.ok) throw new Error(data.error || 'The server could not save this card');
  if (!data.card?.id) throw new Error('The server did not confirm the card save');
  return data;
}

function setSaveState(state, text) {
  const element = document.getElementById('save-state');
  if (!element) return;
  element.className = `save-state ${state}`;
  element.innerHTML = `<i data-lucide="${state === 'saving' ? 'loader-circle' : state === 'error' ? 'circle-alert' : 'check-circle-2'}" size="16"></i> ${text}`;
  if (window.lucide) lucide.createIcons();
}

function savedStateText() {
  if (!lastSavedAt) return 'Saved';
  return `Saved to server ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function markDirty() {
  dirtyRevision += 1;
  autosaveRetryCount = 0;
  clearTimeout(autosaveRetryTimer);
  autosaveRetryTimer = null;
  return dirtyRevision;
}

function requestImmediateAutosave() {
  if (dirtyRevision <= savedRevision || !canEditCurrentCard) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    runAutosave();
  }, 80);
}

function scheduleAutosaveRetry() {
  if (dirtyRevision <= savedRevision || !navigator.onLine || autosaveRetryCount >= 3) return;
  clearTimeout(autosaveRetryTimer);
  autosaveRetryCount += 1;
  const delay = Math.min(8000, 1200 * (2 ** (autosaveRetryCount - 1)));
  setSaveState('saving', `Save interrupted · retrying (${autosaveRetryCount}/3)…`);
  autosaveRetryTimer = setTimeout(() => {
    autosaveRetryTimer = null;
    runAutosave();
  }, delay);
}

function scheduleSave() {
  if (isPlanPreview && !isAdmin) { setSaveState('saved', 'Preview only · not saved'); return; }
  if (!canEditCurrentCard) return;
  markDirty();
  persistLocalDraft();
  clearTimeout(saveTimer);
  setSaveState(navigator.onLine ? 'saving' : 'error', navigator.onLine ? 'Unsaved changes' : 'Offline · changes waiting');
  if (!navigator.onLine) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    runAutosave();
  }, 500);
}

function isRetryableSaveError(error) {
  const message = String(error?.message || '');
  return !navigator.onLine || /failed to fetch|network|load failed|timeout|connection/i.test(message);
}

function runAutosave() {
  if (dirtyRevision <= savedRevision || !canEditCurrentCard) return Promise.resolve();
  return save({ silent: true }).catch(error => {
    if (isRetryableSaveError(error)) scheduleAutosaveRetry();
  });
}

function save(options = {}) {
  if (isPlanPreview && !isAdmin) { setSaveState('saved', 'Preview only · not saved'); return Promise.resolve(); }

  // Coalesce every autosave/manual-save request into one active request. The
  // previous queue allowed focus, preview, and watchdog events to stack dozens
  // of saves behind each other, leaving the Preview tab stuck on "Preparing".
  if (saveInFlightPromise) return saveInFlightPromise;

  const revision = options.revision ?? dirtyRevision;
  const activeSave = performSave({ ...options, revision });
  saveInFlightPromise = activeSave;
  saveChain = activeSave;
  activeSave.then(
    () => {
      if (saveInFlightPromise === activeSave) {
        saveInFlightPromise = null;
        saveChain = Promise.resolve();
      }
    },
    () => {
      if (saveInFlightPromise === activeSave) {
        saveInFlightPromise = null;
        saveChain = Promise.resolve();
      }
    }
  );
  return activeSave;
}

async function performSave({ silent = false, revision = dirtyRevision } = {}) {
  if (!canEditCurrentCard) throw new Error('This shared card is view-only. Ask the workspace owner to change your role to Editor.');
  setSaveState('saving', 'Saving to server…');
  const previousDraftKey = draftStorageKey();
  let returnedToDraftForMissingName = false;
  try {
    sanitizeLockedEntitlementValues();
    applyEntitlements();
    const wasPublished = value('status') === 'published';
    const payload = collectCardPayload();
    returnedToDraftForMissingName = wasPublished && payload.status === 'draft';
    const result = await saveEditorStateToServer(payload);
    const savedCard = result.card;
    const slugWasAdjusted = Boolean(result.slugAdjusted);
    currentId = savedCard.id;
    currentCardOwnerId = savedCard.user_id || currentCardOwnerId || user.id;
    history.replaceState({}, '', `editor.html?id=${currentId}`);
    field('slug').value = savedCard.slug || payload.slug || '';
    field('status').value = savedCard.status || payload.status || 'draft';
    savedRevision = Math.max(savedRevision, revision);
    autosaveRetryCount = 0;
    clearTimeout(autosaveRetryTimer);
    autosaveRetryTimer = null;
    lastServerUpdatedAt = new Date(result.savedAt || savedCard.updated_at || Date.now()).getTime();
    lastSavedAt = new Date(lastServerUpdatedAt);
    clearLocalDraft(previousDraftKey, draftStorageKey());
    if (dirtyRevision > savedRevision) {
      persistLocalDraft();
      setSaveState('saving', 'New changes waiting…');
      requestImmediateAutosave();
    } else {
      setSaveState('saved', isPlanPreview && isAdmin ? 'Saved · plan preview active' : savedStateText());
    }
    updatePublicControls();
    if (returnedToDraftForMissingName) {
      render();
      toast('Card returned to draft because the display name was removed');
    } else if (slugWasAdjusted) {
      const slugMessage = result.slugAction === 'kept_existing'
        ? `That card address is already taken. Your changes were saved and your current address (${savedCard.slug}) was kept.`
        : `That card address is already taken. Your card was saved with the available address ${savedCard.slug}.`;
      toast(slugMessage);
      const slugStatus = document.getElementById('slug-status');
      if (slugStatus) {
        slugStatus.textContent = slugMessage;
        slugStatus.className = 'input-help slug-status warning';
      }
    } else if (!silent) {
      toast(isPlanPreview && isAdmin ? 'Card saved to the LIW Admin workspace' : 'Card saved to the server');
      const slugStatus = document.getElementById('slug-status');
      if (slugStatus) {
        slugStatus.textContent = 'Card address available and saved.';
        slugStatus.className = 'input-help slug-status success';
      }
    }
  } catch (error) {
    persistLocalDraft();
    const rawMessage = error?.message || 'Unable to save card';
    const permissionFailure = /row-level security|permission denied|not have editor permission|view-only|grant Editor|403/i.test(rawMessage);
    const entitlementFailure = /entitlement required|active LIW plan is required|feature required/i.test(rawMessage);
    const message = permissionFailure
      ? 'This card is not editable by your account. Ask the workspace owner to grant Editor access.'
      : entitlementFailure
        ? `A locked plan feature blocked this save: ${rawMessage}. The editor kept a recovery copy and reset unsupported choices.`
        : rawMessage;
    const offlineFailure = !navigator.onLine || /failed to fetch|network|load failed|timeout|connection/i.test(rawMessage);
    setSaveState('error', permissionFailure ? 'No edit access' : offlineFailure ? 'Connection lost · recovery copy stored' : 'Save failed · recovery copy stored');
    if (!silent || permissionFailure || !offlineFailure) toast(message);
    throw error;
  }
}

async function saveSocialLinks() {
  if (!currentId) return;
  const clean = socialLinks.filter(link => link.url?.trim()).map((link, index) => {
    const meta = socialMeta(link.platform);
    return { card_id: currentId, platform: meta.key, label: meta.label, url: link.url.trim(), is_enabled: true, sort_order: index };
  });
  const { error: deleteError } = await supabaseClient.from('social_links').delete().eq('card_id', currentId);
  if (deleteError) throw deleteError;
  if (clean.length) {
    const { error } = await supabaseClient.from('social_links').insert(clean);
    if (error) throw error;
  }
}

async function saveServices() {
  if (!currentId) return;
  const clean = services.filter(service => service.name?.trim()).map((service, index) => ({
    card_id: currentId,
    name: service.name.trim(),
    description: service.description?.trim() || null,
    price_cents: service.price_cents == null ? null : Number(service.price_cents),
    currency: 'usd',
    image_url: service.image_url?.trim() || null,
    booking_url: service.booking_url?.trim() || null,
    payment_url: service.payment_url?.trim() || null,
    cta_label: service.cta_label?.trim() || 'Learn more',
    is_enabled: true,
    sort_order: index
  }));
  const { error: deleteError } = await supabaseClient.from('card_services').delete().eq('card_id', currentId);
  if (deleteError) throw deleteError;
  if (clean.length) {
    const { error } = await supabaseClient.from('card_services').insert(clean);
    if (error) throw error;
  }
}

async function saveProducts() {
  if (!currentId) return;
  const clean = products.filter(product => product.name?.trim()).map((product, index) => ({
    card_id: currentId,
    name: product.name.trim(),
    description: product.description?.trim() || null,
    price_cents: product.price_cents == null ? null : Number(product.price_cents),
    currency: 'usd',
    image_urls: Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [],
    purchase_url: product.purchase_url?.trim() || null,
    is_enabled: true,
    sort_order: index
  }));
  const { error: deleteError } = await supabaseClient.from('card_products').delete().eq('card_id', currentId);
  if (deleteError) throw deleteError;
  if (clean.length) {
    const { error } = await supabaseClient.from('card_products').insert(clean);
    if (error) throw error;
  }
}

async function flushSave({ force = false, silent = true } = {}) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  clearTimeout(autosaveRetryTimer);
  autosaveRetryTimer = null;
  await saveChain.catch(() => undefined);
  if (force || dirtyRevision > savedRevision || !currentId) {
    await save({ silent, revision: dirtyRevision });
  }
}

async function togglePublish(event) {
  if (isPlanPreview) {
    const next = value('status') === 'published' ? 'draft' : 'published';
    field('status').value = next;
    render();
    toast(next === 'published' ? 'Preview: this card would now be live. No data was changed.' : 'Preview: this card would return to draft. No data was changed.');
    return;
  }
  if (!canEditCurrentCard) {
    toast('This shared card is view-only. Ask the owner to grant Editor access.');
    return;
  }
  const previousStatus = value('status') || 'draft';
  const buttons = [document.getElementById('publish-button'), document.getElementById('panel-publish-button')].filter(Boolean);
  buttons.forEach(button => button.disabled = true);
  try {
    const isPublishing = previousStatus !== 'published';
    if (isPublishing && !value('full_name').trim()) {
      openTab('content');
      field('full_name')?.focus();
      throw new Error('Enter the name that should appear on this card before publishing.');
    }
    if (isPublishing && value('branding_mode') === 'custom' && (!value('custom_branding_text').trim() || !value('custom_branding_url').trim())) {
      openTab('design');
      field('custom_branding_text')?.focus();
      throw new Error('Enter both custom footer text and a custom footer link before publishing.');
    }
    if (isPublishing && hasEntitlement('custom_qr')) {
      const qrSafe = await runQrSafetyCheck({ manual: false });
      if (!qrSafe) {
        openTab('share');
        const qrDetails = document.getElementById('share-qr-settings');
        if (qrDetails) qrDetails.open = true;
        document.getElementById('qr-design-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        throw new Error('The QR scan test failed. Remove the center logo or choose darker QR colors before publishing.');
      }
    }
    await flushSave();
    if (!currentId) await save({ silent: true });
    if (!currentId) throw new Error('Your card could not be created. Add your name and try again.');
    const active = isPlanPreview || isAdmin || ['active', 'trialing'].includes(subscription?.status);
    if (!active) {
      document.getElementById('upgrade-dialog').showModal();
      return;
    }
    const next = previousStatus === 'published' ? 'draft' : 'published';
    field('status').value = next;
    await save({ silent: true });
    render();
    if (next === 'published') {
      openTab('share', { scroll: false });
      window.LIWPostPublishShare?.celebrate?.();
    }
    toast(next === 'published' ? 'Your card is live — your share message is ready' : 'Card returned to draft');
  } catch (error) {
    field('status').value = previousStatus;
    render();
    toast(error?.message || 'Unable to publish. Your changes are still in the editor.');
  } finally {
    buttons.forEach(button => button.disabled = false);
  }
}

async function openFullPreview() {
  if (previewOpening) {
    toast('Your preview is already opening.');
    return;
  }
  previewOpening = true;

  // Open synchronously so browsers do not block the new tab.
  const previewWindow = window.open('about:blank', '_blank');
  if (previewWindow) {
    try {
      previewWindow.document.title = 'Preparing LIW card preview…';
      previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Preparing your LIW card preview…</p>';
    } catch (_) {}
  }

  try {
    if (!previewWindow || previewWindow.closed) {
      throw new Error('Your browser blocked the preview tab. Allow pop-ups for LIW Cards and click Preview again.');
    }

    // Existing cards open immediately. Saving continues in the background so
    // Preview is never held hostage by autosave traffic.
    if (currentId) {
      previewWindow.location.replace(cardUrl());
      flushSave({ silent: true }).catch(error => {
        console.warn('Background preview save failed:', error);
        toast(error?.message || 'Preview opened, but the newest changes are still saving.');
      });
      return;
    }

    // A brand-new card needs exactly one confirmed server save to receive its
    // ID and slug. save() now coalesces any competing autosave request.
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await save({ silent: true, revision: dirtyRevision });
    if (!currentId) throw new Error('The draft could not be created yet. Add your name, then try Preview again.');
    previewWindow.location.replace(cardUrl());
  } catch (error) {
    if (previewWindow && !previewWindow.closed) previewWindow.close();
    toast(error?.message || 'Unable to open the preview. Your editor changes are still here.');
  } finally {
    previewOpening = false;
  }
}

function updatePublicControls() {
  const published = value('status') === 'published';
  const url = cardUrl();
  document.getElementById('publish-button').innerHTML = published ? '<i data-lucide="pause-circle" size="17"></i> Unpublish' : '<i data-lucide="rocket" size="17"></i> Publish';
  document.getElementById('panel-publish-button').textContent = published ? 'Unpublish card' : 'Publish card';
  document.getElementById('publish-title').textContent = published ? 'Your card is live' : 'Your card is a draft';
  document.getElementById('publish-copy').textContent = published ? 'Customers with your link can view it now.' : 'Only you can preview it until it is published.';
  document.getElementById('share-tools').hidden = !published;
  window.LIWPostPublishShare?.refresh?.({ published, url });
  const earnPanel = document.getElementById('post-publish-earn');
  if (earnPanel) earnPanel.hidden = !published;
  const preview = document.getElementById('preview-link');
  if (preview) {
    preview.hidden = false;
    preview.dataset.previewUrl = url;
    preview.title = currentId ? 'Open the full card preview' : 'Save this draft and open the full card preview';
  }
  if (published) {
    document.getElementById('editor-qr').src = buildQrImageUrl(url, 420);
    applyQrLogo(document.getElementById('editor-qr-logo'), value('qr_logo_url'));
  }
  if (window.lucide) lucide.createIcons();
}

function cardUrl() {
  return liwUrl(`card.html?slug=${encodeURIComponent(value('slug') || '')}`);
}

function getEditorShareContext() {
  return {
    fullName: value('full_name'),
    jobTitle: value('job_title'),
    companyName: value('company_name'),
    headline: value('headline'),
    url: cardUrl(),
    status: value('status'),
    socialPlatforms: socialLinks.filter(link => link?.url?.trim()).map(link => link.platform)
  };
}
window.LIWEditorShareContext = getEditorShareContext;

async function copyCardLink() {
  await flushSave();
  if (!currentId) await save({ silent: true });
  if (!currentId) return;
  await navigator.clipboard.writeText(cardUrl());
  toast('Card link copied');
}

function updateCompletion() {
  const checks = {
    name: Boolean(value('full_name').trim()),
    contact: Boolean(value('phone').trim() || value('sms_phone').trim() || value('email').trim() || value('website').trim()),
    professional: Boolean(value('company_name').trim() || value('job_title').trim()),
    design: Boolean(value('primary_color'))
  };
  const completeCount = Object.values(checks).filter(Boolean).length;
  const percent = Math.round((completeCount / Object.keys(checks).length) * 100);
  const label = document.getElementById('completion-label');
  if (label) label.textContent = checks.name ? 'Publish-ready' : `${percent}% ready`;
  const bioCount = document.getElementById('bio-count');
  if (bioCount) bioCount.textContent = value('biography').length;
  const mapping = {
    name: 'setup-check-name',
    contact: 'setup-check-contact',
    professional: 'setup-check-professional',
    design: 'setup-check-design'
  };
  Object.entries(mapping).forEach(([key,id]) => {
    const item = document.getElementById(id);
    if (!item) return;
    item.classList.toggle('complete', checks[key]);
    const icon = item.querySelector('i');
    if (icon) icon.setAttribute('data-lucide', checks[key] ? 'circle-check-big' : 'circle');
  });
  const ready = document.getElementById('quick-ready-label');
  if (ready) ready.textContent = checks.name ? 'Publish-ready' : `${completeCount} of 4 complete`;
  updateEditorFlowState();
}

function slugify(text) {
  return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function priceToCents(value) {
  const amount = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}
