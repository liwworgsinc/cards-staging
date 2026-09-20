(() => {
  const TABLE = 'staging_growth_social_posts';
  const SNAPSHOT_TABLE = 'staging_metricool_metric_snapshots';
  const NETWORKS = ['instagram','facebook','tiktok','linkedin'];
  let current = null;
  let drafts = [];
  let activePlatform = 'instagram';
  let connection = null;
  let currentUser = null;
  let promoIndex = 0;

  const PROMOTIONS = [
    {
      title: 'Promote LIW Cards to small businesses',
      industry: 'Small business',
      goal: 'Show small business owners how one LIW Card can keep their contact info, services, website and sharing in one polished mobile experience. Focus on replacing scattered links and paper cards with one easy digital card.',
      tone: 'Bold, polished, practical',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Make LIW Cards feel simple, professional and useful for everyday business owners. No unsupported claims.'
    },
    {
      title: 'Show off the Realtor experience',
      industry: 'Realtors',
      goal: 'Promote the LIW Cards Realtor experience. Show how a realtor can present contact details, office information, listings and easy sharing from one mobile card.',
      tone: 'High-energy and dramatic',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Premium real-estate energy. Make property presentation and personal branding feel important.'
    },
    {
      title: 'Promote LIW Cards to barbers',
      industry: 'Barbers',
      goal: 'Show barbers how a LIW Card can keep their contact details, services, booking link, work photos and social links together so clients can easily connect and book again.',
      tone: 'High-energy and dramatic',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Stylish grooming-industry visual. Confident and modern, not corporate.'
    },
    {
      title: 'Promote LIW Cards to mechanics',
      industry: 'Mechanics',
      goal: 'Show independent mechanics and auto shops how a LIW Card can keep services, contact info, business hours, website and customer sharing in one easy link.',
      tone: 'Bold, polished, practical',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Strong automotive visual. Practical, trustworthy and built for working businesses.'
    },
    {
      title: 'Promote LIW Cards to DJs and artists',
      industry: 'DJs & Artists',
      goal: 'Show DJs, musicians and artists how one LIW Card can present their identity, contact information, social links, music or portfolio links and booking path in one shareable experience.',
      tone: 'High-energy and dramatic',
      format: 'portrait',
      platforms: ['instagram','facebook'],
      notes: 'Performance energy, lighting and creative personality. Make it feel like an artist promo asset.'
    },
    {
      title: 'Promote LIW Cards to nail artists',
      industry: 'Nail Artists',
      goal: 'Show nail artists how a LIW Card can organize their contact information, booking link, services, work photos and social profiles in one polished mobile card.',
      tone: 'High-energy and dramatic',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Beauty-industry visual with premium detail and personality.'
    },
    {
      title: 'Promote LIW Cards to restaurants',
      industry: 'Restaurants',
      goal: 'Show restaurants how a LIW Card can give customers one easy place for contact information, hours, menu or website links, social profiles and sharing.',
      tone: 'Friendly and conversational',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Warm hospitality visual. Make the business feel inviting and easy to reach.'
    },
    {
      title: 'Promote the free LIW business tools',
      industry: 'Small business',
      goal: 'Promote the free LIW Cards business tools such as the QR Code Generator, Email Signature Generator and Digital Business Card Score as useful tools for small business owners.',
      tone: 'Friendly and conversational',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Lead with usefulness and free value. Invite people to try the tools and discover LIW Cards.'
    },
    {
      title: 'Promote the LIW referral opportunity',
      industry: 'Small business',
      goal: 'Promote the LIW Cards referral opportunity. Explain that people can share LIW Cards with business owners and earn through the referral program without overpromising income.',
      tone: 'Bold, polished, practical',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Entrepreneurial energy. Do not promise or imply guaranteed earnings.'
    },
    {
      title: 'Show why digital beats paper',
      industry: 'Small business',
      goal: 'Create a simple paper business card versus LIW digital card comparison focused on easier updating, sharing, links and keeping business information together.',
      tone: 'Bold, polished, practical',
      format: 'square',
      platforms: ['instagram','facebook'],
      notes: 'Clear visual contrast between outdated paper limitations and a modern digital card experience.'
    }
  ];

  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  const titleCase = value => String(value || '').replace(/\b\w/g, m => m.toUpperCase());
  const num = value => Number(value || 0).toLocaleString();

  function dayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function applyPromotion(index) {
    promoIndex = ((index % PROMOTIONS.length) + PROMOTIONS.length) % PROMOTIONS.length;
    const promo = PROMOTIONS[promoIndex];
    el('ss-promo-title').textContent = promo.title;
    el('ss-promo-copy').textContent = promo.goal;
    el('ss-promo-badge').textContent = promoIndex === (dayOfYear() % PROMOTIONS.length) ? 'Picked for today' : 'Ready to promote';
    el('ss-industry').value = promo.industry;
    el('ss-goal').value = promo.goal;
    el('ss-tone').value = promo.tone;
    el('ss-format').value = promo.format;
    el('ss-notes').value = promo.notes;
    setCheckedNetworks(promo.platforms);
  }

  function setSuggestedSchedule() {
    const input = el('ss-schedule-time');
    if (!input || input.value) return;
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    if (now.getHours() < 18) {
      next.setHours(18, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(18, 0, 0, 0);
    }
    const pad = n => String(n).padStart(2, '0');
    input.value = next.getFullYear() + '-' + pad(next.getMonth()+1) + '-' + pad(next.getDate()) + 'T' + pad(next.getHours()) + ':' + pad(next.getMinutes());
  }


  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 5) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not build fallback image.')), 'image/png', 0.96);
    });
  }

  async function createFallbackImage(post) {
    if (!currentUser || !post) return post;
    const format = post.post_format || 'square';
    const size = format === 'portrait'
      ? { width: 1080, height: 1350 }
      : format === 'landscape'
        ? { width: 1200, height: 675 }
        : { width: 1080, height: 1080 };

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return post;

    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
    gradient.addColorStop(0, '#07102e');
    gradient.addColorStop(0.58, '#17346f');
    gradient.addColorStop(1, '#9b742f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size.width * 0.86, size.height * 0.16, size.width * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size.width * 0.08, size.height * 0.88, size.width * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const pad = Math.round(size.width * 0.075);
    ctx.fillStyle = '#f0cf89';
    ctx.font = '800 ' + Math.round(size.width * 0.035) + 'px Arial, sans-serif';
    ctx.fillText('LIW CARDS', pad, pad + Math.round(size.height * 0.03));

    const matched = PROMOTIONS.find(item => item.goal === post.goal);
    const headline = matched?.title || (post.industry ? 'Built for ' + post.industry : 'Build. Share. Grow.');
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 ' + Math.round(size.width * 0.072) + 'px Arial, sans-serif';
    let y = Math.round(size.height * 0.30);
    y = wrapCanvasText(ctx, headline, pad, y, size.width - pad * 2, Math.round(size.width * 0.085), 4);

    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '500 ' + Math.round(size.width * 0.032) + 'px Arial, sans-serif';
    y += Math.round(size.height * 0.035);
    y = wrapCanvasText(ctx, 'One digital card. Your business info, links and sharing in one polished place.', pad, y, size.width - pad * 2, Math.round(size.width * 0.047), 4);

    const buttonY = Math.min(size.height - Math.round(size.height * 0.18), y + Math.round(size.height * 0.07));
    const buttonW = Math.round(size.width * 0.48);
    const buttonH = Math.round(size.height * 0.08);
    ctx.fillStyle = '#f0cf89';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pad, buttonY, buttonW, buttonH, buttonH / 2);
    else ctx.rect(pad, buttonY, buttonW, buttonH);
    ctx.fill();
    ctx.fillStyle = '#07102e';
    ctx.font = '900 ' + Math.round(size.width * 0.03) + 'px Arial, sans-serif';
    ctx.fillText('cards.liwworgs.com', pad + Math.round(buttonW * 0.08), buttonY + Math.round(buttonH * 0.63));

    const blob = await canvasBlob(canvas);
    const path = currentUser.id + '/' + post.id + '/liw-fallback-' + Date.now() + '.png';
    const upload = await supabaseClient.storage.from('staging-social-media').upload(path, blob, {
      contentType: 'image/png',
      upsert: false,
      cacheControl: '3600'
    });
    if (upload.error) throw upload.error;
    const publicUrl = supabaseClient.storage.from('staging-social-media').getPublicUrl(path).data.publicUrl;
    const { data, error } = await supabaseClient.from(TABLE).update({
      image_url: publicUrl,
      image_size: size.width + 'x' + size.height,
      image_model: 'liw-branded-fallback-v1',
      buffer_error: null,
      updated_at: new Date().toISOString()
    }).eq('id', post.id).select('*').single();
    if (error) throw error;
    return data || { ...post, image_url: publicUrl, image_model: 'liw-branded-fallback-v1' };
  }

  function showApp() {
    el('ss-auth').hidden = true;
    el('ss-app').hidden = false;
  }

  async function invoke(action, body = {}) {
    const { data, error } = await supabaseClient.functions.invoke('growth-social-staging', { body: { action, ...body } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  function checkedNetworks() {
    return [...document.querySelectorAll('.ss-network input[type="checkbox"]:checked')].map(x => x.value);
  }

  function setCheckedNetworks(networks = []) {
    const wanted = new Set(networks);
    document.querySelectorAll('.ss-network input[type="checkbox"]').forEach(input => {
      input.checked = wanted.has(input.value);
    });
  }

  function decorateNetworkLabels() {
    if (!connection) return;
    const supported = new Set(connection.bufferApiSupported || []);
    const channels = connection.buffer?.channels || [];
    document.querySelectorAll('.ss-network').forEach(label => {
      const input = label.querySelector('input');
      if (!input) return;
      const network = input.value;
      const base = titleCase(network);
      const hasChannel = channels.some(ch => String(ch.service || '').toLowerCase() === network);
      if (network === 'tiktok') {
        label.lastChild.textContent = ' TikTok · AI copy only';
        label.title = 'Buffer public API does not currently publish TikTok posts.';
      } else if (!supported.has(network)) {
        label.lastChild.textContent = ' ' + base + ' · copy only';
      } else if (connection.buffer?.apiConfigured && !hasChannel) {
        label.lastChild.textContent = ' ' + base + ' · connect in Buffer';
      } else {
        label.lastChild.textContent = ' ' + base;
      }
    });
  }

  function renderConnection() {
    const ai = el('ss-ai-status');
    const image = el('ss-image-model');
    const buffer = el('ss-buffer-status');
    const metricool = el('ss-metricool-status');

    ai.textContent = connection?.openaiConfigured ? 'AI ready · ' + (connection.contentModel || 'OpenAI') : 'AI not configured';
    ai.className = 'ss-pill ' + (connection?.openaiConfigured ? 'ok' : 'warn');
    image.textContent = connection?.imageModel || 'Image model unavailable';

    if (!connection?.buffer?.apiConfigured) {
      buffer.textContent = 'Buffer key not detected';
      buffer.className = 'ss-pill warn';
    } else if (connection.buffer.error) {
      buffer.textContent = 'Buffer needs attention';
      buffer.className = 'ss-pill warn';
    } else {
      const count = (connection.buffer.channels || []).length;
      buffer.textContent = 'Buffer connected · ' + count + ' channel' + (count === 1 ? '' : 's');
      buffer.className = 'ss-pill ok';
    }

    const metricoolNetworks = connection?.metricool?.connectedNetworks || [];
    metricool.textContent = connection?.metricool ? 'Metricool analytics · ' + metricoolNetworks.length + ' networks' : 'Metricool analytics unavailable';
    metricool.className = 'ss-pill ' + (connection?.metricool ? 'ok' : 'warn');

    const simple = el('ss-simple-status');
    if (simple) {
      if (connection?.openaiConfigured && connection?.buffer?.apiConfigured && !connection.buffer.error) {
        simple.textContent = 'Ready to create and schedule';
        simple.className = 'ss-pill ok';
      } else if (connection?.openaiConfigured) {
        simple.textContent = 'Ready to create posts · scheduling needs attention';
        simple.className = 'ss-pill warn';
      } else {
        simple.textContent = 'Setup needs attention';
        simple.className = 'ss-pill warn';
      }
    }

    const note = el('ss-scheduler-note');
    if (!connection?.buffer?.apiConfigured) {
      note.innerHTML = '<strong>Buffer scheduling is not active.</strong> Add <code>BUFFER_API_KEY</code> to Supabase Edge Function secrets.';
    } else if (connection.buffer.error) {
      note.innerHTML = '<strong>Buffer connection error:</strong> ' + esc(connection.buffer.error);
    } else {
      const channelText = (connection.buffer.channels || []).map(ch => titleCase(ch.service) + ': ' + (ch.displayName || ch.name || 'connected')).join(' · ');
      note.innerHTML = '<strong>Buffer scheduler ready.</strong> ' + esc(channelText || 'No publishable channels found.') + '<br><small>TikTok content is generated here, but Buffer\'s public API does not currently publish TikTok.</small>';
    }
    decorateNetworkLabels();
  }

  async function loadStatus() {
    connection = await invoke('status');
    renderConnection();
  }

  function saveActiveCaptionToMemory() {
    if (!current) return;
    current.captions = { ...(current.captions || {}) };
    current.captions[activePlatform] = el('ss-caption').value;
    current.selected_caption = el('ss-caption').value;
  }

  function renderTabs() {
    const tabs = el('ss-tabs');
    tabs.innerHTML = '';
    NETWORKS.forEach(network => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ss-tab' + (network === activePlatform ? ' active' : '');
      button.textContent = titleCase(network);
      button.addEventListener('click', () => {
        saveActiveCaptionToMemory();
        activePlatform = network;
        renderTabs();
        el('ss-caption').value = current?.captions?.[network] || '';
      });
      tabs.appendChild(button);
    });
  }

  function renderCurrent() {
    const empty = el('ss-empty');
    const result = el('ss-result');
    if (!current) {
      empty.hidden = false;
      result.hidden = true;
      return;
    }
    empty.hidden = true;
    result.hidden = false;

    const preferred = (current.platforms || []).includes(activePlatform) ? activePlatform : ((current.platforms || [])[0] || 'instagram');
    activePlatform = preferred;
    el('ss-current-title').textContent = current.industry + ' social campaign';
    el('ss-current-status').textContent = current.status || 'draft';
    el('ss-current-platforms').textContent = (current.platforms || []).map(titleCase).join(' · ') || 'No networks';
    el('ss-caption').value = current.captions?.[activePlatform] || current.selected_caption || '';
    el('ss-image-prompt').value = current.image_prompt || '';
    el('ss-format').value = current.post_format || 'square';
    setCheckedNetworks(current.platforms || []);
    renderTabs();

    const art = el('ss-art');
    if (current.image_url) {
      art.innerHTML = '<img src="' + esc(current.image_url) + '" alt="Generated LIW social artwork"/>';
      el('ss-open-image').hidden = false;
      el('ss-open-image').href = current.image_url;
    } else {
      art.innerHTML = '<div class="ss-art-empty">No generated image yet.</div>';
      el('ss-open-image').hidden = true;
    }

    el('ss-hashtags').innerHTML = (current.hashtags || []).map(tag => '<span class="ss-tag">' + esc(tag) + '</span>').join('');
    const note = el('ss-scheduler-note');
    if (current.buffer_posts?.length) {
      const lines = current.buffer_posts.map(item => {
        const icon = item.ok ? '✓' : '•';
        return icon + ' ' + titleCase(item.platform) + ': ' + (item.ok ? 'scheduled' : item.error || 'not scheduled');
      });
      note.innerHTML = '<strong>Last Buffer result</strong><br>' + lines.map(esc).join('<br>');
    } else {
      renderConnection();
    }
    renderDrafts();
  }

  function renderDrafts() {
    const box = el('ss-drafts');
    el('ss-draft-count').textContent = drafts.length + ' draft' + (drafts.length === 1 ? '' : 's');
    if (!drafts.length) {
      box.innerHTML = '<div class="ss-note">No Social Studio campaigns saved yet.</div>';
      return;
    }
    box.innerHTML = drafts.map(item => {
      const image = item.image_url ? '<img src="' + esc(item.image_url) + '" alt=""/>' : '<div style="aspect-ratio:1.7/1;background:#eef1f5;border-radius:9px;margin-bottom:9px"></div>';
      return '<button class="ss-draft" type="button" data-id="' + esc(item.id) + '">' +
        image +
        '<strong>' + esc(item.industry) + '</strong>' +
        '<span>' + esc(item.goal) + '</span>' +
        '<small>' + esc((item.status || 'draft').toUpperCase()) + ' · ' + esc(new Date(item.created_at).toLocaleString()) + '</small>' +
      '</button>';
    }).join('');
    box.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => {
      saveActiveCaptionToMemory();
      current = drafts.find(x => x.id === button.dataset.id) || null;
      activePlatform = (current?.platforms || [])[0] || 'instagram';
      renderCurrent();
    }));
  }

  async function loadDrafts() {
    const { data, error } = await supabaseClient.from(TABLE).select('*').order('created_at', { ascending: false }).limit(60);
    if (error) throw error;
    drafts = data || [];
    if (current) current = drafts.find(x => x.id === current.id) || current;
    renderDrafts();
  }

  async function loadMetrics() {
    const { data, error } = await supabaseClient.from(SNAPSHOT_TABLE).select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    const grid = el('ss-metrics-grid');
    if (!data) {
      el('ss-metrics-range').textContent = 'No Metricool snapshot saved yet.';
      grid.innerHTML = '<div class="ss-note">Metricool metrics will appear after the next sync.</div>';
      return;
    }
    const summary = data.metrics?.summary || {};
    const start = new Date(data.range_start).toLocaleDateString();
    const end = new Date(data.range_end).toLocaleDateString();
    el('ss-metrics-range').textContent = start + ' – ' + end + ' · latest saved Metricool snapshot';
    const cards = [
      ['Instagram', summary.instagram || {}, 'followers', ['posts','views','reach','interactions']],
      ['Facebook', summary.facebook || {}, 'followers', ['posts','impressions','interactions','mediaViews']],
      ['TikTok', summary.tiktok || {}, 'followers', ['videos','views','reach','interactions']]
    ];
    grid.innerHTML = cards.map(([name, stats, hero, details]) => {
      const detail = details.map(key => titleCase(key) + ': ' + num(stats[key])).join(' · ');
      return '<article class="ss-metric-card"><h3>' + esc(name) + '</h3><strong>' + num(stats[hero]) + '</strong><span>' + esc(titleCase(hero)) + '</span><small>' + esc(detail) + '</small></article>';
    }).join('');
  }

  async function persistCurrent(statusOverride) {
    if (!current) return null;
    saveActiveCaptionToMemory();
    const patch = {
      captions: current.captions || {},
      selected_caption: current.selected_caption || '',
      image_prompt: el('ss-image-prompt').value.trim(),
      post_format: el('ss-format').value,
      platforms: checkedNetworks(),
      updated_at: new Date().toISOString()
    };
    if (statusOverride) patch.status = statusOverride;
    const { data, error } = await supabaseClient.from(TABLE).update(patch).eq('id', current.id).select('*').single();
    if (error) throw error;
    current = data;
    drafts = drafts.map(x => x.id === data.id ? data : x);
    renderCurrent();
    return data;
  }

  async function generateCampaign() {
    const goal = el('ss-goal').value.trim();
    const platforms = checkedNetworks();
    if (!goal) return notify('Add the campaign goal or message first.');
    if (!platforms.length) return notify('Choose at least one network.');
    const button = el('ss-generate');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating campaign + image…';
    try {
      const data = await invoke('generate', {
        industry: el('ss-industry').value,
        goal,
        tone: el('ss-tone').value,
        format: el('ss-format').value,
        platforms,
        notes: el('ss-notes').value.trim()
      });
      current = data.post;
      let usedFallback = false;
      if (!current.image_url) {
        current = await createFallbackImage(current);
        usedFallback = true;
      }
      drafts = [current, ...drafts.filter(x => x.id !== current.id)];
      activePlatform = (current.platforms || [])[0] || 'instagram';
      renderCurrent();
      if (usedFallback) notify('Today’s post is ready. LIW made a branded image automatically.');
      else notify('Today’s post is ready to review.');
    } catch (error) {
      notify(error?.message || 'Could not generate the social campaign.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function regenerateImage() {
    if (!current) return;
    const button = el('ss-regenerate-image');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Generating image…';
    try {
      await persistCurrent();
      const data = await invoke('generate_image', {
        postId: current.id,
        imagePrompt: el('ss-image-prompt').value.trim(),
        format: el('ss-format').value
      });
      current = data.post;
      drafts = drafts.map(x => x.id === current.id ? current : x);
      renderCurrent();
      notify('New social image generated.');
    } catch (error) {
      try {
        current = await createFallbackImage(current);
        drafts = drafts.map(x => x.id === current.id ? current : x);
        renderCurrent();
        notify('LIW made a branded replacement image automatically.');
      } catch (fallbackError) {
        notify(fallbackError?.message || error?.message || 'Could not make the image.');
      }
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function bufferSchedulableNetworks() {
    if (!connection?.buffer?.apiConfigured || connection.buffer.error) return [];
    const supported = new Set(connection.bufferApiSupported || []);
    const channelServices = new Set((connection.buffer.channels || []).map(x => String(x.service || '').toLowerCase()));
    return checkedNetworks().filter(network => supported.has(network) && channelServices.has(network));
  }

  async function scheduleInBuffer() {
    if (!current) return;
    const local = el('ss-schedule-time').value;
    if (!local) return notify('Choose a future date and time.');
    const schedulable = bufferSchedulableNetworks();
    if (!schedulable.length) return notify('No selected Buffer-supported channel is connected. Check Instagram or Facebook.');
    const due = new Date(local);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) return notify('Choose a future date and time.');

    const button = el('ss-schedule');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Scheduling…';
    try {
      await persistCurrent();
      const data = await invoke('schedule', {
        postId: current.id,
        scheduledFor: due.toISOString(),
        platforms: schedulable
      });
      current = data.post;
      drafts = drafts.map(x => x.id === current.id ? current : x);
      renderCurrent();
      const successes = (data.results || []).filter(x => x.ok).map(x => titleCase(x.platform));
      notify(successes.length ? 'Scheduled in Buffer: ' + successes.join(', ') : 'Buffer did not schedule a channel.');
    } catch (error) {
      notify(error?.message || 'Could not schedule in Buffer.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function fillExample() {
    const realtor = PROMOTIONS.findIndex(item => item.industry === 'Realtors');
    applyPromotion(realtor >= 0 ? realtor : 0);
  }

  async function bootstrap() {
    try {
      if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') throw new Error('Staging auth runtime did not load.');
      const user = await requireUser();
      if (!user) return;
      currentUser = user;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        location.replace('dashboard.html');
        return;
      }
      showApp();

      applyPromotion(dayOfYear() % PROMOTIONS.length);
      setSuggestedSchedule();
      el('ss-generate').addEventListener('click', generateCampaign);
      el('ss-next-promo').addEventListener('click', () => applyPromotion(promoIndex + 1));
      el('ss-example').addEventListener('click', fillExample);
      el('ss-save').addEventListener('click', async () => {
        try { await persistCurrent(); notify('Social draft saved.'); } catch (e) { notify(e?.message || 'Could not save draft.'); }
      });
      el('ss-ready').addEventListener('click', async () => {
        try { await persistCurrent('ready'); notify('Social campaign marked ready.'); } catch (e) { notify(e?.message || 'Could not mark ready.'); }
      });
      el('ss-regenerate-image').addEventListener('click', regenerateImage);
      el('ss-schedule').addEventListener('click', scheduleInBuffer);
      el('ss-refresh').addEventListener('click', async () => {
        try {
          await Promise.all([loadStatus(), loadDrafts(), loadMetrics()]);
          setSuggestedSchedule();
          notify('Social Studio refreshed.');
        } catch (e) {
          notify(e?.message || 'Could not refresh Social Studio.');
        }
      });

      await Promise.all([loadStatus(), loadDrafts(), loadMetrics()]);
      const first = drafts[0];
      if (first) {
        current = first;
        activePlatform = (first.platforms || [])[0] || 'instagram';
        renderCurrent();
      }
    } catch (error) {
      console.error('Social Studio startup failed', error);
      el('ss-auth').innerHTML = '<div class="ss-auth-card"><h1>Social Studio could not start</h1><p class="muted">' + esc(error?.message || 'Unable to connect.') + '</p><a class="btn btn-primary" href="admin-growth.html">Back to Growth Center</a></div>';
    }
  }

  bootstrap();
})();