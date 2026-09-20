(() => {
  const TABLE = 'staging_growth_ai_content_drafts';
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  let drafts = [];
  let current = null;
  let providerReady = false;
  let topicIndex = 0;

  const CONTENT_TOPICS = [
    {
      title: 'Why small businesses are moving beyond paper business cards',
      industry: 'Small business',
      keyword: 'digital business card for small business',
      intent: 'Commercial / buyer intent',
      audience: 'Small business owners and solo entrepreneurs',
      tone: 'Clear, helpful, confident, practical',
      notes: 'Explain practical benefits such as easier sharing, updating business information, keeping links together and presenting a more modern business presence. Mention LIW Cards naturally without unsupported claims.'
    },
    {
      title: 'How realtors can use one digital card to promote themselves and their listings',
      industry: 'Realtors',
      keyword: 'digital business card for realtors',
      intent: 'Industry-specific',
      audience: 'Independent realtors and real estate sales professionals',
      tone: 'Professional and authoritative',
      notes: 'Focus on personal branding, contact information, office details, listings and easy sharing. Keep the article useful rather than overly promotional.'
    },
    {
      title: 'How barbers can turn first-time clients into repeat customers with a digital card',
      industry: 'Barbers',
      keyword: 'digital business card for barbers',
      intent: 'Commercial / buyer intent',
      audience: 'Barbers, barber shops and independent grooming professionals',
      tone: 'Bold and energetic',
      notes: 'Focus on booking links, services, work photos, contact information and staying easy to find after the first visit.'
    },
    {
      title: 'How mechanics can keep customers coming back with one easy business link',
      industry: 'Mechanics',
      keyword: 'digital business card for mechanics',
      intent: 'Commercial / buyer intent',
      audience: 'Independent mechanics, mobile mechanics and auto repair shops',
      tone: 'Clear, helpful, confident, practical',
      notes: 'Focus on services, business hours, contact details, easy sharing and repeat-customer convenience.'
    },
    {
      title: 'Why DJs and artists need more than a social media bio link',
      industry: 'DJs & Artists',
      keyword: 'digital business card for DJs',
      intent: 'Industry-specific',
      audience: 'DJs, musicians, performers and independent artists',
      tone: 'Bold and energetic',
      notes: 'Focus on identity, booking, contact details, music or portfolio links and having a professional shareable home base.'
    },
    {
      title: 'How nail artists can make booking and sharing their work easier',
      industry: 'Nail Artists',
      keyword: 'digital business card for nail artists',
      intent: 'Industry-specific',
      audience: 'Independent nail artists and beauty professionals',
      tone: 'Friendly and conversational',
      notes: 'Focus on booking, services, portfolio photos, contact information and social links.'
    },
    {
      title: 'How restaurants can give customers one simple place for hours, links and contact info',
      industry: 'Restaurants',
      keyword: 'digital business card for restaurants',
      intent: 'Industry-specific',
      audience: 'Independent restaurants, food businesses and hospitality operators',
      tone: 'Friendly and conversational',
      notes: 'Focus on hours, menu or website links, contact details, social profiles and easy sharing.'
    },
    {
      title: 'Free business tools that help small businesses look more professional online',
      industry: 'Small business',
      keyword: 'free business tools for small business',
      intent: 'How-to / informational',
      audience: 'Small business owners looking for practical free tools',
      tone: 'Clear, helpful, confident, practical',
      notes: 'Highlight useful tools like a QR code generator, email signature generator and digital business card score. Lead with genuine utility and connect naturally to LIW Cards.'
    },
    {
      title: 'Digital business card vs paper card: what actually changes for a small business?',
      industry: 'Small business',
      keyword: 'digital business card vs paper business card',
      intent: 'Comparison',
      audience: 'Small business owners comparing paper and digital business cards',
      tone: 'Clear, helpful, confident, practical',
      notes: 'Give a balanced comparison covering updating information, sharing, links, printing, physical handoff and ongoing convenience.'
    },
    {
      title: 'How referral programs can help small businesses grow through word of mouth',
      industry: 'Small business',
      keyword: 'small business referral program',
      intent: 'How-to / informational',
      audience: 'Small business owners and entrepreneurs interested in referrals',
      tone: 'Clear, helpful, confident, practical',
      notes: 'Explain referrals without promising income or guaranteed results. Mention LIW Cards referral opportunity naturally where appropriate.'
    }
  ];


  function dayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function applyTopic(index) {
    topicIndex = ((index % CONTENT_TOPICS.length) + CONTENT_TOPICS.length) % CONTENT_TOPICS.length;
    const topic = CONTENT_TOPICS[topicIndex];
    el('ai-topic-title').textContent = topic.title;
    el('ai-topic-summary').textContent = 'LIW will create the full article, SEO package, social extras and email copy from this topic.';
    el('ai-topic-badge').textContent = topicIndex === (dayOfYear() % CONTENT_TOPICS.length) ? 'Picked for today' : 'Ready to create';
    el('ai-industry').value = topic.industry;
    el('ai-topic').value = topic.title;
    el('ai-keyword').value = topic.keyword;
    el('ai-intent').value = topic.intent;
    el('ai-audience').value = topic.audience;
    el('ai-tone').value = topic.tone;
    el('ai-notes').value = topic.notes;
  }

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
    const simple = el('ai-simple-status');
    if (simple) {
      simple.textContent = providerReady ? 'Ready to create today’s article' : 'Content setup needs attention';
      simple.className = 'ai-pill ' + (providerReady ? 'ok' : 'warn');
    }
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
        ${d.published_url ? '<span class="ai-draft-status approved">LIW Buzz live</span>' : ''}
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
    const published = Boolean(current.published_url);
    const publication = el('ai-current-publication');
    publication.textContent = published ? 'Published on LIW Buzz' : 'Not published';
    publication.className = 'ai-pill ' + (published ? 'ok' : '');
    const publishButton = el('ai-publish');
    publishButton.disabled = current.status !== 'approved';
    publishButton.textContent = current.buzz_article_id ? 'Update LIW Buzz' : 'Publish to LIW Buzz';
    const viewBuzz = el('ai-view-buzz');
    viewBuzz.hidden = !published;
    if (published) viewBuzz.href = 'buzz-article.html?slug=' + encodeURIComponent(current.slug || '');
    el('ai-unpublish').hidden = !published;
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

  async function refreshCurrentDraft() {
    if (!current?.id) return;
    const { data, error } = await supabaseClient.from(TABLE).select('*').eq('id', current.id).single();
    if (error) throw error;
    const index = drafts.findIndex(d => d.id === data.id);
    if (index >= 0) drafts[index] = data;
    else drafts.unshift(data);
    selectDraft(data);
    renderDrafts();
  }

  async function publishToBuzz(button) {
    if (!current?.id) return;
    if (current.status !== 'approved') {
      notify('Approve the draft before publishing it to LIW Buzz.');
      return;
    }
    button.disabled = true;
    const original = button.textContent;
    button.textContent = current.buzz_article_id ? 'Updating Buzz…' : 'Publishing…';
    try {
      const wasPublished = Boolean(current.buzz_article_id);
      await saveEdits();
      const { error } = await supabaseClient.rpc('publish_staging_buzz_article', { p_draft_id: current.id });
      if (error) throw error;
      await refreshCurrentDraft();
      notify(wasPublished ? 'LIW Buzz article updated.' : 'Published to LIW Buzz.');
    } catch (error) {
      notify(error?.message || 'Could not publish to LIW Buzz.');
    } finally {
      button.disabled = current?.status !== 'approved';
      button.textContent = current?.buzz_article_id ? 'Update LIW Buzz' : original;
    }
  }

  async function unpublishFromBuzz(button) {
    if (!current?.id || !current.published_url) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Unpublishing…';
    try {
      const { error } = await supabaseClient.rpc('unpublish_staging_buzz_article', { p_draft_id: current.id });
      if (error) throw error;
      await refreshCurrentDraft();
      notify('LIW Buzz article unpublished. The approved draft is still saved.');
    } catch (error) {
      notify(error?.message || 'Could not unpublish LIW Buzz article.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function generate() {
    const topic = el('ai-topic').value.trim();
    const targetKeyword = el('ai-keyword').value.trim();
    if (!topic || !targetKeyword) return notify('Enter an article topic and target keyword.');
    const button = el('ai-generate');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Creating today’s article…';
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
      notify('Today’s article is ready to review.');
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
    const mechanics = CONTENT_TOPICS.findIndex(item => item.industry === 'Mechanics');
    applyTopic(mechanics >= 0 ? mechanics : 0);
  }

  async function approveAndPublish(button) {
    if (!current?.id) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Publishing…';
    try {
      await saveEdits('approved');
      await publishToBuzz(button);
    } catch (error) {
      notify(error?.message || 'Could not approve and publish this article.');
    } finally {
      button.disabled = false;
      button.textContent = current?.published_url ? 'Published to LIW Buzz' : original;
    }
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
      applyTopic(dayOfYear() % CONTENT_TOPICS.length);
      bindTabs();
      bindCopy();
      el('ai-generate').addEventListener('click', generate);
      el('ai-next-topic').addEventListener('click', () => applyTopic(topicIndex + 1));
      el('ai-fill-example').addEventListener('click', fillExample);
      el('ai-publish-simple').addEventListener('click', event => approveAndPublish(event.currentTarget));
      el('ai-save').addEventListener('click', async () => { try { await saveEdits(); notify('Draft edits saved.'); } catch (e) { notify(e?.message || 'Could not save draft.'); } });
      el('ai-approve').addEventListener('click', async () => { try { await saveEdits('approved'); notify('Draft approved. Use Publish to LIW Buzz when you are ready.'); } catch (e) { notify(e?.message || 'Could not approve draft.'); } });
      el('ai-publish').addEventListener('click', event => publishToBuzz(event.currentTarget));
      el('ai-unpublish').addEventListener('click', event => unpublishFromBuzz(event.currentTarget));
      el('ai-archive').addEventListener('click', async () => {
        if (current?.published_url) return notify('Unpublish the LIW Buzz article before archiving this draft.');
        try { await saveEdits('archived'); notify('Draft archived.'); } catch (e) { notify(e?.message || 'Could not archive draft.'); }
      });
      el('ai-refresh').addEventListener('click', async () => { try { await Promise.all([status(), loadDrafts()]); notify('AI Content refreshed.'); } catch (e) { notify(e?.message || 'Could not refresh.'); } });
      await Promise.all([status(), loadDrafts()]);
    } catch (error) {
      console.error('AI Content Engine startup failed', error);
      el('ai-auth').innerHTML = '<div class="ai-auth-card"><h1>AI Content Engine could not start</h1><p class="muted">' + esc(error?.message || 'Unable to connect.') + '</p><a class="btn btn-primary" href="admin-growth.html">Back to Growth Center</a></div>';
    }
  }

  bootstrap();
})();