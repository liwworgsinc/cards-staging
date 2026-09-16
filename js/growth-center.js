(() => {
  const TABLES = {
    seo: 'staging_growth_seo_briefs',
    partners: 'staging_growth_partners',
    reviews: 'staging_growth_reviews'
  };
  const LEGACY = {
    seo: 'liw_growth_content_queue_v1',
    partners: 'liw_growth_partners_v1',
    reviews: 'liw_growth_reviews_v1',
    migrated: 'liw_growth_cloud_migrated_v1'
  };
  const state = { seo: [], partners: [], reviews: [] };
  let lastBrief = null;

  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
  const slug = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);

  function showGuard(title, text, action = '') {
    const guard = el('growth-auth-guard');
    if (!guard) return;
    guard.hidden = false;
    el('growth-auth-title').textContent = title;
    el('growth-auth-text').textContent = text;
    const actionEl = el('growth-auth-action');
    actionEl.hidden = !action;
    if (action) actionEl.href = action;
  }

  function showApp() {
    el('growth-auth-guard').hidden = true;
    el('growth-app').hidden = false;
    document.body.classList.remove('growth-auth-pending');
  }

  function bindTabs() {
    document.querySelectorAll('.growth-tab').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.growth-tab').forEach(x => x.classList.toggle('active', x === button));
        document.querySelectorAll('.growth-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === button.dataset.tab));
      });
    });
  }

  function renderSeo() {
    const box = el('seo-queue');
    box.innerHTML = state.seo.length ? state.seo.map(item => `
      <div class="growth-item">
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.keyword)} · ${esc(item.industry)} · ${esc(item.intent)}</span>
        <button class="btn btn-light btn-sm" data-del-seo="${esc(item.id)}" style="margin-top:8px">Remove</button>
      </div>`).join('') : '<div class="growth-mini">No saved briefs yet.</div>';
    box.querySelectorAll('[data-del-seo]').forEach(button => button.addEventListener('click', () => deleteRow('seo', button.dataset.delSeo)));
  }

  function renderPartners() {
    const box = el('partner-list');
    box.innerHTML = state.partners.length ? state.partners.map(item => `
      <div class="growth-item">
        <strong>${esc(item.name)}</strong>
        <span>${esc(item.partner_type)} · ${esc(item.status)}</span>
        <button class="btn btn-light btn-sm" data-del-partner="${esc(item.id)}" style="margin-top:8px">Remove</button>
      </div>`).join('') : '<div class="growth-mini">No partner prospects yet.</div>';
    box.querySelectorAll('[data-del-partner]').forEach(button => button.addEventListener('click', () => deleteRow('partners', button.dataset.delPartner)));
  }

  function renderReviews() {
    const box = el('review-list');
    box.innerHTML = state.reviews.length ? state.reviews.map(item => `
      <div class="growth-item">
        <strong>${esc(item.customer_name)}</strong>
        <span>${esc(item.status)}</span>
        <button class="btn btn-light btn-sm" data-del-review="${esc(item.id)}" style="margin-top:8px">Remove</button>
      </div>`).join('') : '<div class="growth-mini">No review requests tracked yet.</div>';
    box.querySelectorAll('[data-del-review]').forEach(button => button.addEventListener('click', () => deleteRow('reviews', button.dataset.delReview)));
  }

  const renderers = { seo: renderSeo, partners: renderPartners, reviews: renderReviews };

  async function loadSection(section) {
    const { data, error } = await supabaseClient.from(TABLES[section]).select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    state[section] = data || [];
    renderers[section]();
  }

  async function loadAll() {
    await Promise.all(['seo', 'partners', 'reviews'].map(loadSection));
  }

  async function deleteRow(section, id) {
    const { error } = await supabaseClient.from(TABLES[section]).delete().eq('id', id);
    if (error) return notify(error.message || 'Could not remove that item.');
    state[section] = state[section].filter(item => item.id !== id);
    renderers[section]();
    notify('Removed from staging Growth Center.');
  }

  function readLegacy(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }

  async function migrateLegacyData() {
    if (localStorage.getItem(LEGACY.migrated) === '1') return;
    const seo = readLegacy(LEGACY.seo);
    const partners = readLegacy(LEGACY.partners);
    const reviews = readLegacy(LEGACY.reviews);
    try {
      if (seo.length) {
        const rows = seo.slice(0, 50).map(item => ({
          title: item.title || item.keyword || 'SEO brief',
          keyword: item.keyword || '',
          industry: item.industry || 'Small business',
          intent: item.intent || 'Commercial / buyer intent',
          brief_text: item.brief_text || `Title: ${item.title || item.keyword || 'SEO brief'}\nKeyword: ${item.keyword || ''}`
        })).filter(row => row.keyword);
        if (rows.length) {
          const { error } = await supabaseClient.from(TABLES.seo).insert(rows);
          if (error) throw error;
        }
      }
      if (partners.length) {
        const rows = partners.slice(0, 100).map(item => ({ name: item.name, partner_type: item.type || item.partner_type || 'Partner' })).filter(row => row.name);
        if (rows.length) {
          const { error } = await supabaseClient.from(TABLES.partners).insert(rows);
          if (error) throw error;
        }
      }
      if (reviews.length) {
        const allowed = new Set(['Ask next', 'Requested', 'Received', 'Declined']);
        const rows = reviews.slice(0, 100).map(item => ({ customer_name: item.name || item.customer_name, status: allowed.has(item.status) ? item.status : 'Ask next' })).filter(row => row.customer_name);
        if (rows.length) {
          const { error } = await supabaseClient.from(TABLES.reviews).insert(rows);
          if (error) throw error;
        }
      }
      localStorage.setItem(LEGACY.migrated, '1');
      localStorage.removeItem(LEGACY.seo);
      localStorage.removeItem(LEGACY.partners);
      localStorage.removeItem(LEGACY.reviews);
      if (seo.length || partners.length || reviews.length) notify('Your old staging Growth Center items were moved to cloud storage.');
    } catch (error) {
      console.error('Growth Center local migration failed', error);
      notify('Old local Growth Center items could not be imported yet. They were left in this browser.');
    }
  }

  function bindSeo() {
    el('build-seo').addEventListener('click', () => {
      const keyword = el('seo-keyword').value.trim();
      if (!keyword) return notify('Add a target keyword first.');
      const industry = el('seo-industry').value;
      const intent = el('seo-intent').value;
      const title = keyword.replace(/\b\w/g, match => match.toUpperCase());
      const briefText = `Title: ${title}\nSlug: /${slug(keyword)}\nAudience: ${industry}\nIntent: ${intent}\n\nOutline:\n1. Why ${industry} use digital business cards\n2. What to include\n3. How QR sharing works\n4. LIW Cards features for ${industry}\n5. FAQ + create-card CTA`;
      lastBrief = { title, keyword, industry, intent, brief_text: briefText };
      el('seo-output').hidden = false;
      el('seo-output').textContent = briefText;
      el('save-seo').disabled = false;
    });

    el('save-seo').addEventListener('click', async () => {
      if (!lastBrief) return;
      const button = el('save-seo');
      button.disabled = true;
      const { data, error } = await supabaseClient.from(TABLES.seo).insert(lastBrief).select('*').single();
      button.disabled = false;
      if (error) return notify(error.message || 'Could not save the SEO brief.');
      state.seo.unshift(data);
      state.seo = state.seo.slice(0, 100);
      renderSeo();
      notify('SEO brief saved to staging cloud storage.');
    });
  }

  function bindSocial() {
    el('build-social').addEventListener('click', () => {
      const industry = el('social-industry').value;
      const channel = el('social-channel').value;
      const offer = el('social-offer').value.trim();
      const posts = [
        `${industry}: still handing out paper cards? Put your contact info, links and services in one LIW Card. ${offer} #DigitalBusinessCard #LIWCards`,
        `One link. Your info. Your work. Your next customer. Built for ${industry.toLowerCase()}. ${offer}`,
        `Quick ${channel} idea: show your LIW Card on-screen, scan the QR, then show how fast a customer can call, book or visit your site. ${offer}`
      ];
      const box = el('social-output');
      box.replaceChildren(...posts.map(text => {
        const item = document.createElement('div');
        item.className = 'growth-item';
        item.textContent = text;
        return item;
      }));
    });
  }

  function bindPartners() {
    el('add-partner').addEventListener('click', async () => {
      const name = el('partner-name').value.trim();
      const partnerType = el('partner-type').value.trim() || 'Partner';
      if (!name) return notify('Add a partner name.');
      const button = el('add-partner');
      button.disabled = true;
      const { data, error } = await supabaseClient.from(TABLES.partners).insert({ name, partner_type: partnerType }).select('*').single();
      button.disabled = false;
      if (error) return notify(error.message || 'Could not add that partner.');
      state.partners.unshift(data);
      el('partner-name').value = '';
      el('partner-type').value = '';
      renderPartners();
      notify('Partner saved to staging cloud storage.');
    });
  }

  function bindReviews() {
    el('add-review').addEventListener('click', async () => {
      const customerName = el('review-name').value.trim();
      const status = el('review-status').value;
      if (!customerName) return notify('Add a customer or business name.');
      const button = el('add-review');
      button.disabled = true;
      const { data, error } = await supabaseClient.from(TABLES.reviews).insert({ customer_name: customerName, status }).select('*').single();
      button.disabled = false;
      if (error) return notify(error.message || 'Could not track that review request.');
      state.reviews.unshift(data);
      el('review-name').value = '';
      renderReviews();
      notify('Review request saved to staging cloud storage.');
    });
  }

  function model() {
    const traffic = Number(el('model-traffic').value) || 0;
    const rate = (Number(el('model-rate').value) || 0) / 100;
    const value = Number(el('model-value').value) || 0;
    const customers = traffic * rate;
    const monthly = customers * value;
    el('model-customers').textContent = customers.toFixed(customers % 1 ? 1 : 0);
    el('model-monthly').textContent = monthly.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    el('model-yearly').textContent = (monthly * 12).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  function bindModel() {
    ['model-traffic', 'model-rate', 'model-value'].forEach(id => el(id).addEventListener('input', model));
    model();
  }

  async function bootstrap() {
    if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') {
      showGuard('Growth Center could not start', 'The staging auth runtime did not load. Refresh once; if it persists, the staging build needs repair.');
      return;
    }
    try {
      const user = await requireUser();
      if (!user) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        showGuard('Admin access required', 'This Growth Center is only available to LIW Cards administrators.', 'dashboard.html');
        return;
      }
      bindTabs();
      bindSeo();
      bindSocial();
      bindPartners();
      bindReviews();
      bindModel();
      showApp();
      await migrateLegacyData();
      await loadAll();
    } catch (error) {
      console.error('Growth Center startup failed', error);
      showGuard('Growth Center could not start', error?.message || 'The staging Growth Center could not connect. Refresh and try again.');
    }
  }

  bootstrap();
})();
