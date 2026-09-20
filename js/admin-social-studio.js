(() => {
  const TABLE = 'staging_growth_social_posts';
  const SNAPSHOT_TABLE = 'staging_metricool_metric_snapshots';
  const NETWORKS = ['instagram','facebook','tiktok','linkedin'];
  let current = null;
  let drafts = [];
  let activePlatform = 'instagram';
  let connection = null;

  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.log(message);
  const titleCase = value => String(value || '').replace(/\b\w/g, m => m.toUpperCase());
  const num = value => Number(value || 0).toLocaleString();

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
      drafts = [current, ...drafts.filter(x => x.id !== current.id)];
      activePlatform = (current.platforms || [])[0] || 'instagram';
      renderCurrent();
      if (data.warning) notify(data.warning);
      else notify('AI campaign and image created.');
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
      notify(error?.message || 'Could not regenerate the image.');
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
    el('ss-industry').value = 'Realtors';
    el('ss-goal').value = 'Show realtors how one LIW Card can present contact details, office information, listings and easy sharing in one polished mobile experience.';
    el('ss-tone').value = 'High-energy and dramatic';
    el('ss-format').value = 'square';
    el('ss-notes').value = 'Make the visual feel premium and property-focused, not generic corporate. Keep the card experience as the hero without fabricating a screenshot.';
    setCheckedNetworks(['instagram','facebook','tiktok']);
  }

  async function bootstrap() {
    try {
      if (typeof requireUser !== 'function' || typeof supabaseClient === 'undefined') throw new Error('Staging auth runtime did not load.');
      const user = await requireUser();
      if (!user) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!isLiwAdminAccount(user, profile)) {
        location.replace('dashboard.html');
        return;
      }
      showApp();

      el('ss-generate').addEventListener('click', generateCampaign);
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