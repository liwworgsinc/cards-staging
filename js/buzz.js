(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const grid = document.getElementById('buzz-grid');
  const count = document.getElementById('buzz-count');
  const feature = document.getElementById('buzz-feature');
  const fmt = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  };

  function featureCard(article) {
    return `
      <a class="buzz-feature-story" href="buzz-article.html?slug=${encodeURIComponent(article.slug)}">
        <span class="buzz-category">${esc(article.industry || 'LIW Cards')}</span>
        <h2>${esc(article.title)}</h2>
        <p>${esc(article.excerpt || '')}</p>
        <div class="buzz-feature-meta"><span>Published ${esc(fmt(article.published_at))}</span><span>•</span><strong>Read the latest drop →</strong></div>
      </a>`;
  }

  function streamCard(article) {
    return `
      <a class="buzz-card" href="buzz-article.html?slug=${encodeURIComponent(article.slug)}">
        <span class="buzz-card-top"></span>
        <div class="buzz-card-body">
          <span class="buzz-category">${esc(article.industry || 'LIW Cards')}</span>
          <h3>${esc(article.title)}</h3>
          <p>${esc(article.excerpt || '')}</p>
          <span class="buzz-card-meta"><span>${esc(fmt(article.published_at))}</span><span class="buzz-card-arrow">Read →</span></span>
        </div>
      </a>`;
  }

  async function load() {
    try {
      const { data, error } = await supabaseClient
        .from('staging_buzz_articles')
        .select('slug,title,excerpt,industry,published_at,updated_at')
        .eq('status','published')
        .order('published_at',{ascending:false});
      if (error) throw error;

      const articles = data || [];
      count.textContent = articles.length + (articles.length === 1 ? ' story' : ' stories');

      if (!articles.length) {
        feature.innerHTML = '<div class="buzz-empty"><strong>The first LIW Buzz drop is coming.</strong><span>Once an approved article is published from AI Content, it will take over this featured spot.</span></div>';
        grid.innerHTML = '<div class="buzz-empty"><strong>No published stories yet.</strong><span>The Buzz stream will fill automatically as articles go live.</span></div>';
        return;
      }

      feature.innerHTML = featureCard(articles[0]);
      const stream = articles.slice(1);
      grid.innerHTML = stream.length
        ? stream.map(streamCard).join('')
        : '<div class="buzz-empty"><strong>That’s the first drop.</strong><span>More LIW Buzz stories will stack here as you publish them.</span></div>';
    } catch (error) {
      console.error('LIW Buzz failed to load', error);
      count.textContent = '';
      feature.innerHTML = '<div class="buzz-empty"><strong>LIW Buzz could not load.</strong><span>Please try again.</span></div>';
      grid.innerHTML = '<div class="buzz-empty"><strong>The Buzz stream is unavailable right now.</strong></div>';
    }
  }

  load();
})();