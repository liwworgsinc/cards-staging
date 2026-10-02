(() => {
  if (typeof LIW_IS_GITHUB_STAGING === 'undefined' || !LIW_IS_GITHUB_STAGING || !window.supabaseClient) return;

  const TABLE = 'staging_app_branding';
  const LOGO_SELECTOR = [
    'img.brand-logo',
    'a[aria-label="LIW Cards"] > img',
    'img[data-liw-app-logo]'
  ].join(',');
  let settings = null;
  let manifestObjectUrl = '';

  function parseRgb(value) {
    const match = String(value || '').match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\)/i);
    if (!match) return null;
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] == null ? 1 : Number(match[4])
    };
  }

  function isDarkBackground(element) {
    if (element.closest('.sidebar,[data-theme="dark"],.theme-dark,.dark-theme')) return true;
    let node = element;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      const styles = getComputedStyle(node);
      const rgb = parseRgb(styles.backgroundColor);
      if (rgb && rgb.a > 0.08) {
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        return luminance < 0.47;
      }
    }
    return false;
  }

  function logoFor(element) {
    if (!settings) return '';
    const explicit = element.dataset.liwBrandRole;
    if (explicit === 'dark') {
      return settings.dark_background_logo_url || settings.site_logo_url || settings.light_background_logo_url || '';
    }
    if (explicit === 'light') {
      return settings.light_background_logo_url || settings.site_logo_url || settings.dark_background_logo_url || '';
    }
    if (isDarkBackground(element)) {
      return settings.dark_background_logo_url || settings.site_logo_url || settings.light_background_logo_url || '';
    }
    return settings.light_background_logo_url || settings.site_logo_url || settings.dark_background_logo_url || '';
  }

  function applyLogos(root = document) {
    root.querySelectorAll?.(LOGO_SELECTOR).forEach(image => {
      if (!image.dataset.liwBrandOriginalSrc) {
        image.dataset.liwBrandOriginalSrc = image.getAttribute('src') || '';
      }
      const url = logoFor(image);
      if (url) image.src = url;
    });
  }

  function ensureIconLink(rel, sizes) {
    let link = document.head.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      document.head.appendChild(link);
    }
    return link;
  }

  function applyDocumentIcons() {
    if (!settings) return;

    const favicon = settings.favicon_url || settings.pwa_icon_192_url || settings.pwa_icon_url || '';
    if (favicon) {
      const iconLinks = [...document.head.querySelectorAll('link[rel~="icon"]')];
      if (!iconLinks.length) iconLinks.push(ensureIconLink('icon', 'any'));
      iconLinks.forEach(link => {
        link.href = favicon;
        if (!link.type || link.type === 'image/svg+xml') link.type = 'image/png';
      });
    }

    const appleIcon = settings.apple_touch_icon_url || settings.pwa_icon_192_url || settings.pwa_icon_url || favicon;
    if (appleIcon) {
      const appleLinks = [...document.head.querySelectorAll('link[rel="apple-touch-icon"]')];
      if (!appleLinks.length) appleLinks.push(ensureIconLink('apple-touch-icon', '180x180'));
      appleLinks.forEach(link => {
        link.href = appleIcon;
        link.sizes = '180x180';
      });
    }
  }

  function buildManifest() {
    if (!settings) return;
    const icon192 = settings.pwa_icon_192_url || settings.pwa_icon_url || settings.favicon_url || '';
    const icon512 = settings.pwa_icon_512_url || settings.pwa_icon_url || settings.favicon_url || '';
    if (!icon192 && !icon512) return;

    const base = liwUrl('');
    const icons = [];
    if (icon192) {
      icons.push({ src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' });
      icons.push({ src: icon192, sizes: '192x192', type: 'image/png', purpose: 'maskable' });
    }
    if (icon512) {
      icons.push({ src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' });
      icons.push({ src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' });
    }

    const manifest = {
      id: base,
      name: 'LIW Cards — Build. Share. Grow. Earn.',
      short_name: 'LIW Cards',
      description: 'Build a professional digital card in minutes, share it anywhere, grow your business, and earn with your included affiliate link.',
      lang: 'en-US',
      dir: 'ltr',
      start_url: liwUrl('dashboard.html?source=pwa'),
      scope: base,
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      orientation: 'any',
      background_color: '#080808',
      theme_color: '#0b0b0b',
      categories: ['business', 'productivity', 'utilities'],
      icons,
      shortcuts: [
        {
          name: 'Dashboard',
          short_name: 'Dashboard',
          description: 'Open your LIW Cards dashboard',
          url: liwUrl('dashboard.html?source=shortcut'),
          icons: icon192 ? [{ src: icon192, sizes: '192x192', type: 'image/png' }] : []
        },
        {
          name: 'Create a card',
          short_name: 'New card',
          description: 'Create a new digital business card',
          url: liwUrl('editor.html?source=shortcut'),
          icons: icon192 ? [{ src: icon192, sizes: '192x192', type: 'image/png' }] : []
        },
        {
          name: 'Analytics',
          short_name: 'Analytics',
          description: 'Review views, saves, and engagement',
          url: liwUrl('analytics.html?source=shortcut'),
          icons: icon192 ? [{ src: icon192, sizes: '192x192', type: 'image/png' }] : []
        }
      ]
    };

    if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl);
    manifestObjectUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    const link = document.head.querySelector('link[rel="manifest"]') || document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestObjectUrl;
    link.dataset.liwDynamicManifest = 'true';
    if (!link.parentNode) document.head.appendChild(link);
  }

  function applyAll(root = document) {
    applyLogos(root);
    applyDocumentIcons();
    buildManifest();
  }

  async function loadBranding() {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select('site_logo_url,light_background_logo_url,dark_background_logo_url,favicon_url,pwa_icon_url,pwa_icon_192_url,pwa_icon_512_url,apple_touch_icon_url,updated_at')
        .eq('id', 'global')
        .maybeSingle();
      if (error) throw error;
      settings = data || {};
      window.LIW_STAGING_APP_BRANDING = settings;
      applyAll(document);
      window.dispatchEvent(new CustomEvent('liw:staging-app-branding-loaded', { detail: settings }));
    } catch (error) {
      console.warn('LIW staging app branding unavailable:', error);
    }
  }

  const observer = new MutationObserver(mutations => {
    if (!settings) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(LOGO_SELECTOR)) applyLogos(node.parentElement || document);
        else if (node.querySelector?.(LOGO_SELECTOR)) applyLogos(node);
      }
    }
  });

  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    loadBranding();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();