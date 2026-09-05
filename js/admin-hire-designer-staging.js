(function mountHireDesignerAdmin(){
  if (!window.LIW_IS_GITHUB_STAGING && !(location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/'))) return;
  if (!/admin\.html$/i.test(location.pathname)) return;

  const defaults = {
    heroTitle: 'A professionally designed LIW Card — without doing it yourself.',
    heroCopy: 'Send us your brand, details, and goals. We’ll build a polished digital business card that is ready to share.',
    cardSetupName: 'Card Setup',
    cardSetupPrice: 49,
    premiumName: 'Premium Card Design',
    premiumPrice: 99,
    teamName: 'Business / Team Setup',
    teamPrice: 199,
    turnaround: '2–3 business days'
  };

  const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function panelMarkup(){
    return `
      <section class="card admin-panel admin-support-panel liw-designer-admin-panel" id="hire-designer-admin-panel">
        <div class="section-title admin-section-title">
          <div>
            <span class="eyebrow">Revenue service</span>
            <h2>Hire a Designer</h2>
            <p class="muted">Manage the public offer and operate paid designer projects from one admin workflow. Package prices saved here also become the checkout source of truth.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn-light btn-sm" href="admin-designer-orders.html"><i data-lucide="clipboard-list" size="15"></i> Designer orders</a>
            <a class="btn btn-light btn-sm" href="hire-designer.html" target="_blank" rel="noopener"><i data-lucide="external-link" size="15"></i> Preview page</a>
          </div>
        </div>

        <form id="liw-designer-settings-form" class="liw-designer-admin-form">
          <div class="liw-designer-admin-block">
            <h3>Hero</h3>
            <label class="form-group"><span>Headline</span><input class="input" id="liw-designer-hero-title" maxlength="130"></label>
            <label class="form-group"><span>Supporting text</span><textarea class="input" id="liw-designer-hero-copy" rows="3" maxlength="280"></textarea></label>
            <label class="form-group"><span>Turnaround message</span><input class="input" id="liw-designer-turnaround" maxlength="80"></label>
          </div>

          <div class="liw-designer-admin-packages">
            <article class="liw-designer-admin-package">
              <span>Package 1</span>
              <label class="form-group"><span>Name</span><input class="input" id="liw-designer-card-setup-name" maxlength="70"></label>
              <label class="form-group"><span>One-time price</span><div class="liw-designer-price-input"><b>$</b><input class="input" id="liw-designer-card-setup-price" type="number" min="0" step="1"></div></label>
            </article>
            <article class="liw-designer-admin-package featured">
              <span>Most popular</span>
              <label class="form-group"><span>Name</span><input class="input" id="liw-designer-premium-name" maxlength="70"></label>
              <label class="form-group"><span>One-time price</span><div class="liw-designer-price-input"><b>$</b><input class="input" id="liw-designer-premium-price" type="number" min="0" step="1"></div></label>
            </article>
            <article class="liw-designer-admin-package">
              <span>Package 3</span>
              <label class="form-group"><span>Name</span><input class="input" id="liw-designer-team-name" maxlength="70"></label>
              <label class="form-group"><span>Starting price</span><div class="liw-designer-price-input"><b>$</b><input class="input" id="liw-designer-team-price" type="number" min="0" step="1"></div></label>
            </article>
          </div>

          <div class="liw-designer-admin-actions">
            <button class="btn btn-primary" type="submit"><i data-lucide="save" size="16"></i> Save designer page</button>
            <button class="btn btn-light" id="liw-designer-reset" type="button"><i data-lucide="rotate-ccw" size="16"></i> Restore defaults</button>
            <span class="muted" id="liw-designer-save-status" aria-live="polite"></span>
          </div>
        </form>
      </section>`;
  }

  function addSidebarLink(){
    const nav = document.querySelector('.sidebar nav');
    if (!nav) return;
    if (!nav.querySelector('a[href="#hire-designer-admin-panel"]')) {
      const link = document.createElement('a');
      link.href = '#hire-designer-admin-panel';
      link.innerHTML = '<i data-lucide="palette" size="18"></i> Hire a Designer';
      const whiteLabel = nav.querySelector('a[href="#admin-white-label-panel"]');
      if (whiteLabel) nav.insertBefore(link, whiteLabel);
      else nav.appendChild(link);
    }
    if (!nav.querySelector('a[href="admin-designer-orders.html"]')) {
      const queue = document.createElement('a');
      queue.href = 'admin-designer-orders.html';
      queue.innerHTML = '<i data-lucide="clipboard-list" size="18"></i> Designer orders';
      nav.appendChild(queue);
    }
  }

  function setForm(content){
    const data = { ...defaults, ...(content || {}) };
    document.getElementById('liw-designer-hero-title').value = data.heroTitle;
    document.getElementById('liw-designer-hero-copy').value = data.heroCopy;
    document.getElementById('liw-designer-turnaround').value = data.turnaround;
    document.getElementById('liw-designer-card-setup-name').value = data.cardSetupName;
    document.getElementById('liw-designer-card-setup-price').value = money(data.cardSetupPrice);
    document.getElementById('liw-designer-premium-name').value = data.premiumName;
    document.getElementById('liw-designer-premium-price').value = money(data.premiumPrice);
    document.getElementById('liw-designer-team-name').value = data.teamName;
    document.getElementById('liw-designer-team-price').value = money(data.teamPrice);
  }

  function readForm(){
    return {
      heroTitle: document.getElementById('liw-designer-hero-title').value.trim(),
      heroCopy: document.getElementById('liw-designer-hero-copy').value.trim(),
      turnaround: document.getElementById('liw-designer-turnaround').value.trim(),
      cardSetupName: document.getElementById('liw-designer-card-setup-name').value.trim(),
      cardSetupPrice: money(document.getElementById('liw-designer-card-setup-price').value),
      premiumName: document.getElementById('liw-designer-premium-name').value.trim(),
      premiumPrice: money(document.getElementById('liw-designer-premium-price').value),
      teamName: document.getElementById('liw-designer-team-name').value.trim(),
      teamPrice: money(document.getElementById('liw-designer-team-price').value)
    };
  }

  function validate(content){
    if (!content.heroTitle || !content.heroCopy) throw new Error('Headline and supporting text are required.');
    if (!content.cardSetupName || !content.premiumName || !content.teamName) throw new Error('Every designer package needs a name.');
    for (const price of [content.cardSetupPrice,content.premiumPrice,content.teamPrice]) {
      if (!Number.isFinite(price) || price < 0) throw new Error('Designer prices must be valid non-negative numbers.');
    }
  }

  async function mount(){
    if (document.getElementById('hire-designer-admin-panel')) return;
    try {
      const access = await getLiwAccessContext();
      if (!access?.isAdmin) return;
    } catch (_) { return; }

    const anchor = document.getElementById('admin-white-label-panel') || document.querySelector('main.main section:last-of-type');
    if (!anchor) return;
    anchor.insertAdjacentHTML('beforebegin', panelMarkup());
    addSidebarLink();
    window.lucide?.createIcons?.();

    const status = document.getElementById('liw-designer-save-status');
    status.textContent = 'Loading current settings…';
    try {
      const { data, error } = await supabaseClient.from('designer_page_settings').select('content').eq('id', 'main').maybeSingle();
      if (error) throw error;
      setForm(data?.content || defaults);
      status.textContent = 'Ready';
    } catch (error) {
      console.warn('Designer settings load failed', error);
      setForm(defaults);
      status.textContent = 'Using defaults';
    }

    document.getElementById('liw-designer-settings-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      if (button) button.disabled = true;
      status.textContent = 'Saving…';
      try {
        const content = readForm();
        validate(content);
        const { error } = await supabaseClient.rpc('admin_save_designer_settings', { p_content: content });
        if (error) throw error;
        status.textContent = 'Saved. Page copy and checkout prices are synchronized.';
        toast('Hire a Designer settings updated');
      } catch (error) {
        console.error(error);
        status.textContent = 'Save failed';
        toast(error.message || 'Could not save designer page');
      } finally {
        if (button) button.disabled = false;
      }
    });

    document.getElementById('liw-designer-reset').addEventListener('click', () => {
      setForm(defaults);
      status.textContent = 'Defaults loaded — press Save to publish them.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0), { once: true });
  else setTimeout(mount, 0);
})();