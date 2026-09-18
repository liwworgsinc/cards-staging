(() => {
  const TABLE = 'staging_growth_ai_content_drafts';
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  let drafts = [];
  let current = null;
  let providerReady = false;

  function fmt(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }

  function showApp() {
    el('ai-auth').hidden = true;
    el('ai-app').hidden = false;
  }

  function setProvider(data) {
    providerReady = Boolean(data?.providerConfigured);
    const provider = el('ai-provider');
    provider.textContent = providerReady ? 'OpenAI connected' : 'OpenAI key needed';
    provider.className = 'ai-pill ' + (providerReady ? 'ok' : 'warn');
    el('ai-model').textContent = data?.model || 'Model unavailable';
    el('ai-draft-count').textContent = String(data?.draftCount || drafts.length || 0) + ' drafts';
    const note = el('ai-provider-note');
    note.className = 'ai-status-note' + (providerReady ? '' : ' warn');
    note.textContent = providerReady
      ? 'AI generation is ready. Every result is saved as a staging draft for review.'
      : 'The Content Engine UI and storage are ready, but OPENAI_API_KEY must be configured in Supabase before generation can run.';
    el('ai-generate').disabled = !providerReady;
  }

  async function status() {
    const { data, error } = await supabaseClient.functions.invoke('growth-ai-content-staging', { body: { action: 'status' } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    setProvider(data || {});
  }

  async function loadDrafts() {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    drafts = data || [];
    renderDrafts();
  }

  function renderDrafts() {
    const box = el('ai-drafts');
    if (!drafts.length) {
      box.innerHTML = '<div class="ai-empty">No AI content drafts yet.</div>';
      return;
    }
    box.innerHTML = drafts.map(d => `
      <button class="ai-draft" type="button" data-draft="${esc(d.id)}">
        <strong>${esc(d.article_title || d.topic)}</strong>
        <span>${esc(d.target_keyword || '')}</span>
        <span class="ai-draft-status ${esc(d.status)}">${esc(d.status)}</span>
        <small>${esc(d.industry)} · ${esc(fmt(d.created_at))}</small>
      </button>`).join('');
    box.querySelectorAll('[data-draft]').forEach(button => button.addEventListener('click', () => {
      const found = drafts.find(d => d.id === button.dataset.draft);
      if (found) selectDraft(found);
    }));
  }

  function selectDraft(draft) {
    current = structuredClone(draft);
    el('ai-empty').hidden = true;
    el('ai-result').hidden = false;
    el('ai-title').textContent = current.article_title || current.topic || 'Untitled';
    el('ai-current-status').textContent = current.status || 'draft';
    el('ai-current-status').className = 'ai-pill ' + (current.status === 'approved' ? 'ok' : '');
    el('ai-current-industry').textContent = current.industry || 'Small business';
    el('ai-article').value = current.article_markdown || '';
    el('ai-article-title').value = current.article_title || '';
    el('ai-slug').value = current.slug || '';
    el('ai-excerpt').value = current.excerpt || '';
    el('ai-seo-title').value = current.seo_title || '';
    el('ai-meta').value = current.meta_description || '';
    const social = current.social_posts || {};
    el('ai-instagram').value = social.instagram || '';
    el('ai-facebook').value = social.facebook || '';
    el('ai-linkedin').value = social.linkedin || '';
    el('ai-email-subject').value = current.email_subject || '';
    el('ai-email-body').value = current.email_body || '';
    el('ai-cta-label').value = current.cta_label || 'Build your LIW Card';
    el('ai-cta-url').value = current.cta_url || 'https://cards.liwworgs.com';
    renderLinksFaq(current);
  }

  function renderLinksFaq(draft) {
    const links = Array.isArray(draft.internal_links) ? draft.internal_links : [];
    el('ai-links').innerHTML = links.length ? links.map(link => `<article><strong>${esc(link.label || link.url || 'Internal link')}</strong><span>${esc(link.url || '')}</span><span>${esc(link.placement || '')}</span></article>`).join('') : '<div class="ai-empty">No links suggested.</div>';
    const faq = Array.isArray(draft.faq) ? draft.faq : [];
    el('ai-faq').innerHTML = faq.length ? faq.map(item => `<article><strong>${esc(item.question || '')}</strong><span>${esc(item.answer || '')}</span></article>`).join('') : '<div class="ai-empty">No FAQ generated.</div>';
  }

  function collectEdits() {
    const social = {
      ...(current?.social_posts || {}),
      instagram: el('ai-instagram').value.trim(),
      facebook: el('ai-facebook').value.trim(),
      linkedin: el('ai-linkedin').value.trim()
    };
    return {
      article_markdown: el('ai-article').value.trim(),
      article_title: el('ai-article-title').value.trim(),
      slug: el('ai-slug').value.trim(),
      excerpt: el('ai-excerpt').value.trim(),
      seo_title: el('ai-seo-title').value.trim(),
      meta_description: el('ai-meta').value.trim(),
      social_posts: social,
      email_subject: el('ai-email-subject').value.trim(),
      email_body: el('ai-email-body').value.trim(),
      cta_label: el('ai-cta-label').value.trim(),
      cta_url: el('ai-cta-url').value.trim(),
      updated_at: new Date().toISOString()
    };
  }

  async function saveEdits(statusOverride = null) {
    if (!current?.id) return;
    const payload = collectEdits();
    if (statusOverride) payload.status = statusOverride;
    if (!payload.article_title || !payload.article_markdown) return notify('Article title and article content are required.');
    const { data, error } = await supabaseClient
      .from(TABLE)
      .update(payload)
      .eq('id', current.id)
      .select('*')
      .single();
    if (error) throw error;
    const index = drafts.findIndex(d => d.id === data.id);
    if (index >= 0) drafts[index] = data;
    current = structuredClone(data);
    selectDraft(current);
    renderDrafts();
  }

  async function generate() {
    const topic = el('ai-topic').value.trim();
    const targetKeyword = el('ai-keyword').value.trim();
    if (!topic || !targetKeyword) return notify('Enter an article topic and target keyword.');
    const button = el('ai-generate');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Generating article package…';
    try {
      const body = {
        action: 'generate',
        industry: el('ai-industry').value,
        topic,
        targetKeyword,
        searchIntent: el('ai-intent').value,
        audience: el('ai-audience').value.trim(),
        tone: el('ai-tone').value,
        notes: el('ai-notes').value.trim()
      };
      const { data, error } = await supabaseClient.functions.invoke('growth-ai-content-staging', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.draft) throw new Error('AI did not return a saved draft.');
      drafts.unshift(data.draft);
      selectDraft(data.draft);
      renderDrafts();
      el('ai-draft-count').textContent = drafts.length + ' drafts';
      notify('AI content package created and saved as a draft.');
    } catch (error) {
      notify(error?.message || 'AI generation failed.');
    } finally {
      button.disabled = !providerReady;
      button.textContent = original;
    }
  }

  function bindTabs() {
    document.querySelectorAll('[data-ai-tab]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-ai-tab]').forEach(x => x.classList.toggle('active', x === button));
      document.querySelectorAll('[data-ai-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.aiPane === button.dataset.aiTab));
    }));
  }

  function bindCopy() {
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      const target = el(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.value || target.textContent || '');
        notify('Copied.');
      } catch (_) {
        target.select?.();
        document.execCommand?.('copy');
        notify('Copied.');
      }
    }));
  }

  function fillExample() {
    el('ai-industry').value = 'Mechanics';
    el('ai-topic').value = 'How mechanics can use a digital business card to turn one-time customers into repeat customers';
    el('ai-keyword').value = 'digital business card for mechanics';
    el('ai-intent').value = 'Commercial / buyer intent';
    el('ai-audience').value = 'Independent mechanics, mobile mechanics and auto repair shops';
    el('ai-notes').value = 'Focus on easy contact, services, sharing, QR use and keeping business information in one link. Mention the TES Auto example when useful.';
  }

  async function bootstrap() {
    try {
      if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') throw new Error('The staging auth runtime did not load.');
      const user = await requireUser();
      if (!user) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        location.replace('dashboard.html');
        return;
      }
      showApp();
      bindTabs();
      bindCopy();
      el('ai-generate').addEventListener('click', generate);
      el('ai-fill-example').addEventListener('click', fillExample);
      el('ai-save').addEventListener('click', async () => { try { await saveEdits(); notify('Draft edits saved.'); } catch (e) { notify(e?.message || 'Could not save draft.'); } });
      el('ai-approve').addEventListener('click', async () => { try { await saveEdits('approved'); notify('Draft approved. It is still not auto-published.'); } catch (e) { notify(e?.message || 'Could not approve draft.'); } });
      el('ai-archive').addEventListener('click', async () => { try { await saveEdits('archived'); notify('Draft archived.'); } catch (e) { notify(e?.message || 'Could not archive draft.'); } });
      el('ai-refresh').addEventListener('click', async () => { try { await Promise.all([status(), loadDrafts()]); notify('AI Content refreshed.'); } catch (e) { notify(e?.message || 'Could not refresh.'); } });
      await Promise.all([status(), loadDrafts()]);
    } catch (error) {
      console.error('AI Content Engine startup failed', error);
      el('ai-auth').innerHTML = '<div class="ai-auth-card"><h1>AI Content Engine could not start</h1><p class="muted">' + esc(error?.message || 'Unable to connect.') + '</p><a class="btn btn-primary" href="admin-growth.html">Back to Growth Center</a></div>';
    }
  }

  bootstrap();
})();