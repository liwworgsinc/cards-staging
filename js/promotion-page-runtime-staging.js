(() => {
  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  const match = page.match(/^digital-business-card-for-(.+)\.html$/);
  if (!match || !window.supabaseClient) return;

  const pageKey = match[1];
  const environment =
    location.hostname === 'liwworgsinc.github.io' &&
    location.pathname.startsWith('/cards-staging/')
      ? 'staging'
      : 'production';

  const setMeta = (selector, value) => {
    if (!value) return;
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  };

  const embedUrlFor = (value) => {
    if (!value) return '';
    try {
      const live = new URL(value, location.href);
      const slug = live.searchParams.get('slug');
      if (slug && environment === 'staging') {
        const base = new URL('/cards-staging/card.html', location.origin);
        base.searchParams.set('slug', slug);
        base.searchParams.set('embed', '1');
        return base.href;
      }
      live.searchParams.set('embed', '1');
      return live.href;
    } catch {
      return value;
    }
  };

  const showDisabled = () => {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML =
      '<section class="seo-section"><div class="seo-wrap"><div class="seo-card" style="max-width:760px;margin:70px auto;text-align:center;padding:38px"><span class="seo-eyebrow">LIW Cards</span><h1 style="margin:10px 0">This promotion page is temporarily unavailable.</h1><p>Explore LIW Cards or return to the main digital business card page.</p><div style="margin-top:20px"><a class="seo-btn seo-btn-primary" href="digital-business-card.html">Explore LIW Cards</a></div></div></div></section>';
  };

  const apply = (cfg) => {
    if (!cfg || !cfg.page_key) return;
    document.documentElement.dataset.liwPromotionManaged = 'true';

    if (cfg.is_published === false) {
      showDisabled();
      return;
    }

    if (cfg.page_title) {
      document.title = cfg.page_title;
      setMeta('meta[property="og:title"]', cfg.page_title);
      setMeta('meta[name="twitter:title"]', cfg.page_title);
    }
    if (cfg.meta_description) {
      setMeta('meta[name="description"]', cfg.meta_description);
      setMeta('meta[property="og:description"]', cfg.meta_description);
      setMeta('meta[name="twitter:description"]', cfg.meta_description);
    }
    if (cfg.h1) {
      const h1 = document.querySelector('main h1');
      if (h1) h1.textContent = cfg.h1;
    }

    if (cfg.primary_cta_url) {
      document.querySelectorAll('a[href*="guest-builder.html"]').forEach((a) => {
        a.href = cfg.primary_cta_url;
      });
    }
    if (cfg.primary_cta_text) {
      document
        .querySelectorAll('main a.seo-btn-primary[href*="guest-builder"], main a.seo-btn-primary')
        .forEach((a) => {
          if (a.closest('.seo-hero-actions') || /create|build|start/i.test(a.textContent || '')) {
            a.textContent = cfg.primary_cta_text;
          }
        });
    }

    if (cfg.demo_card_url) {
      document.querySelectorAll('a[href*="card.html?slug="]').forEach((a) => {
        a.href = cfg.demo_card_url;
        if (cfg.demo_button_text && (a.closest('.seo-live-demo-label') || /demo/i.test(a.textContent || ''))) {
          a.textContent = cfg.demo_button_text;
        }
      });
      const embedUrl = embedUrlFor(cfg.demo_card_url);
      document.querySelectorAll('iframe[src*="card.html?slug="]').forEach((frame) => {
        frame.src = embedUrl;
      });
    }
  };

  (async () => {
    try {
      const { data, error } = await window.supabaseClient.rpc('public_promotion_page', {
        p_page_key: pageKey,
        p_environment: environment
      });
      if (error) throw error;
      apply(data);
    } catch (error) {
      console.warn('LIW promotion page settings could not load.', error);
    }
  })();
})();