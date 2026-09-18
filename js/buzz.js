(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const grid = document.getElementById('buzz-grid');
  const count = document.getElementById('buzz-count');
  const fmt = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  };

  async function load() {
    try {
      const { data, error } = await supabaseClient
        .from('staging_buzz_articles')
        .select('slug,title,excerpt,industry,published_at,updated_at')
        .eq('status','published')
        .order('published_at',{ascending:false});
      if (error) throw error;
      const articles = data || [];
      count.textContent = articles.length + (articles.length === 1 ? ' article' : ' articles');
      grid.innerHTML = articles.length ? articles.map(article => `
        <a class="buzz-card" href="buzz-article.html?slug=${encodeURIComponent(article.slug)}">
          <span class="buzz-card-top"></span>
          <div class="buzz-card-body">
            <span class="buzz-category">${esc(article.industry || 'LIW Cards')}</span>
            <h3>${esc(article.title)}</h3>
            <p>${esc(article.excerpt || '')}</p>
            <span class="buzz-card-meta">Published ${esc(fmt(article.published_at))} · Read article →</span>
          </div>
        </a>`).join('') : '<div class="buzz-empty">The first LIW Buzz article is being prepared. Check back soon.</div>';
    } catch (error) {
      console.error('LIW Buzz failed to load', error);
      count.textContent = '';
      grid.innerHTML = '<div class="buzz-empty">LIW Buzz could not load right now.</div>';
    }
  }
  load();
})();