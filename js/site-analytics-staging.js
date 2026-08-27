(function () {
  'use strict';

  if (globalThis.__liwSiteAnalyticsStarted) return;
  globalThis.__liwSiteAnalyticsStarted = true;

  const isGithubStaging = location.hostname === 'liwworgsinc.github.io'
    && location.pathname.startsWith('/cards-staging/');
  const isLocalStaging = ['localhost', '127.0.0.1'].includes(location.hostname)
    || location.hostname.startsWith('staging.')
    || location.hostname.startsWith('test.');

  if (!isGithubStaging && !isLocalStaging) return;

  // Keep analytics independent from the homepage's Supabase/config bootstrap so a
  // reporting request can never delay or break the featured-card rotation.
  const ANALYTICS_URL = 'https://nfwqcilqmqruysovjuyj.supabase.co';
  const ANALYTICS_KEY = 'sb_publishable_30SO9QdTrtkp1ATapt7nnQ_QHOmXu49';

  // Do not count automated browser tests, pre-rendering, or embedded card previews as
  // real site visits. The homepage spotlight iframe would otherwise inflate traffic.
  if (navigator.webdriver === true || window.self !== window.top || document.visibilityState === 'prerender') return;

  const VISITOR_KEY = 'liw_affiliate_visitor_id';
  const SESSION_KEY = 'liw_site_session_id';
  const SOURCE_KEY = 'liw_site_traffic_source';
  const MEDIUM_KEY = 'liw_site_utm_medium';
  const CAMPAIGN_KEY = 'liw_site_utm_campaign';

  const safeLocalGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeLocalSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const safeSessionGet = key => { try { return sessionStorage.getItem(key); } catch (_) { return null; } };
  const safeSessionSet = (key, value) => { try { sessionStorage.setItem(key, value); } catch (_) {} };

  function makeId(prefix) {
    return globalThis.crypto?.randomUUID?.()
      || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function visitorId() {
    let value = safeLocalGet(VISITOR_KEY);
    if (!value) {
      value = makeId('liw');
      safeLocalSet(VISITOR_KEY, value);
    }
    return value.slice(0, 100);
  }

  function sessionId() {
    let value = safeSessionGet(SESSION_KEY);
    if (!value) {
      value = makeId('session');
      safeSessionSet(SESSION_KEY, value);
    }
    return value.slice(0, 100);
  }

  function pageFile() {
    const parts = String(location.pathname || '/').split('/').filter(Boolean);
    const last = parts[parts.length - 1] || 'index.html';
    if (isGithubStaging && last === 'cards-staging') return 'index.html';
    return last.includes('.') ? last.toLowerCase() : last.toLowerCase();
  }

  function pageGroup(file) {
    if (file === 'card.html') return 'card';
    if (file.startsWith('admin')) return 'admin';
    if (['login.html', 'register.html', 'forgot-password.html', 'reset-password.html', 'auth-callback.html'].includes(file)) return 'auth';
    if (['dashboard.html', 'editor.html', 'analytics.html', 'leads.html', 'media.html', 'profile.html', 'addons.html', 'agency-dashboard.html', 'affiliate-dashboard.html', 'earn-with-liw.html', 'email-signature.html', 'virtual-background.html'].includes(file)) return 'workspace';
    if (['index.html', 'pricing.html', 'about.html', 'affiliate.html', 'agency.html', 'install.html', 'support.html', 'privacy.html', 'terms.html', 'affiliate-terms.html', 'guest-builder.html', 'hire-a-designer.html'].includes(file)) return 'marketing';
    return 'other';
  }

  function deviceType() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function browserFamily() {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
    if (/FxiOS|Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return 'Other';
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try { return new URL(document.referrer).hostname.slice(0, 180) || null; }
    catch (_) { return null; }
  }

  function sourceFromHost(host) {
    const value = String(host || '').toLowerCase();
    if (!value) return 'Direct';
    if (value === location.hostname.toLowerCase()) return 'Internal';
    if (value.includes('google.')) return 'Google';
    if (value.includes('facebook.') || value === 'l.facebook.com') return 'Facebook';
    if (value.includes('instagram.')) return 'Instagram';
    if (value.includes('tiktok.')) return 'TikTok';
    if (value.includes('linkedin.')) return 'LinkedIn';
    if (value.includes('twitter.') || value === 'x.com') return 'X';
    if (value.includes('bing.')) return 'Bing';
    if (value.includes('youtube.')) return 'YouTube';
    return value.replace(/^www\./, '').slice(0, 80) || 'Referral';
  }

  function cleanCampaignValue(value, limit) {
    const cleaned = String(value || '').trim().replace(/[\u0000-\u001f]/g, ' ');
    return cleaned ? cleaned.slice(0, limit) : null;
  }

  function attribution() {
    const params = new URLSearchParams(location.search);
    const utmSource = cleanCampaignValue(params.get('utm_source'), 80);
    const utmMedium = cleanCampaignValue(params.get('utm_medium'), 80);
    const utmCampaign = cleanCampaignValue(params.get('utm_campaign'), 160);
    const refHost = referrerHost();

    if (utmSource) {
      safeSessionSet(SOURCE_KEY, utmSource);
      if (utmMedium) safeSessionSet(MEDIUM_KEY, utmMedium);
      if (utmCampaign) safeSessionSet(CAMPAIGN_KEY, utmCampaign);
    } else if (!safeSessionGet(SOURCE_KEY)) {
      safeSessionSet(SOURCE_KEY, sourceFromHost(refHost));
    }

    return {
      source: cleanCampaignValue(safeSessionGet(SOURCE_KEY) || sourceFromHost(refHost), 80) || 'Direct',
      medium: cleanCampaignValue(utmMedium || safeSessionGet(MEDIUM_KEY), 80),
      campaign: cleanCampaignValue(utmCampaign || safeSessionGet(CAMPAIGN_KEY), 160),
      referrerHost: refHost
    };
  }

  async function recordPageView() {
    const file = pageFile();
    const group = pageGroup(file);

    if (group === 'workspace' || group === 'admin') return;

    const params = new URLSearchParams(location.search);
    const campaign = attribution();
    const contentKey = file === 'card.html'
      ? cleanCampaignValue(params.get('slug'), 160)
      : null;

    const payload = {
      visitor_id: visitorId(),
      session_id: sessionId(),
      environment: 'staging',
      page_path: file.slice(0, 300),
      page_group: group,
      content_key: contentKey,
      page_title: cleanCampaignValue(document.title, 220),
      referrer_host: campaign.referrerHost,
      traffic_source: campaign.source,
      utm_medium: campaign.medium,
      utm_campaign: campaign.campaign,
      device_type: deviceType(),
      browser_family: browserFamily()
    };

    try {
      const response = await fetch(`${ANALYTICS_URL}/rest/v1/site_page_views`, {
        method: 'POST',
        headers: {
          apikey: ANALYTICS_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (!response.ok && isGithubStaging) {
        console.warn('LIW staging analytics did not record this visit.', response.status);
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordPageView, { once: true });
  } else {
    recordPageView();
  }
})();
