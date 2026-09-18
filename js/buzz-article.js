(() => {
  const root = document.getElementById('buzz-article-root');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  };
  const safeUrl = value => {
    try {
      const u = new URL(String(value || ''), location.href);
      return ['http:','https:'].includes(u.protocol) ? u.href : '#';
    } catch { return '#'; }
  };
  const inline = value => {
    let s = esc(value);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_,label,url) => '<a href="' + esc(safeUrl(url)) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    return s;
  };
  const renderMarkdown = markdown => {
    const lines = String(markdown || '').replace(/\r/g,'').split('\n');
    const out = [];
    let para = [];
    let listType = '';
    const flushPara = () => {
      if (!para.length) return;
      out.push('<p>' + inline(para.join(' ')) + '</p>');
      para = [];
    };
    const closeList = () => {
      if (!listType) return;
      out.push('</' + listType + '>');
      listType = '';
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushPara(); closeList(); continue; }
      const h = line.match(/^(#{2,4})\s+(.+)$/);
      if (h) {
        flushPara(); closeList();
        const level = Math.min(4,h[1].length);
        out.push('<h' + level + '>' + inline(h[2]) + '</h' + level + '>');
        continue;
      }
      const ul = line.match(/^[-*]\s+(.+)$/);
      if (ul) {
        flushPara();
        if (listType !== 'ul') { closeList(); listType='ul'; out.push('<ul>'); }
        out.push('<li>' + inline(ul[1]) + '</li>');
        continue;
      }
      const ol = line.match(/^\d+[.)]\s+(.+)$/);
      if (ol) {
        flushPara();
        if (listType !== 'ol') { closeList(); listType='ol'; out.push('<ol>'); }
        out.push('<li>' + inline(ol[1]) + '</li>');
        continue;
      }
      closeList();
      para.push(line);
    }
    flushPara(); closeList();
    return out.join('');
  };

  function setMeta(article) {
    document.title = (article.seo_title || article.title) + ' | LIW Buzz';
    document.querySelector('meta[name="description"]').setAttribute('content', article.meta_description || article.excerpt || '');
    const prodUrl = 'https://cards.liwworgs.com/buzz-article.html?slug=' + encodeURIComponent(article.slug);
    document.getElementById('buzz-canonical').setAttribute('href', prodUrl);
    document.getElementById('buzz-og-title').setAttribute('content', article.title);
    document.getElementById('buzz-og-description').setAttribute('content', article.meta_description || article.excerpt || '');
    document.getElementById('buzz-og-url').setAttribute('content', prodUrl);

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'Article',
      headline: article.title,
      description: article.meta_description || article.excerpt || '',
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author:{'@type':'Organization',name:article.author_name || 'LIW Cards',url:'https://cards.liwworgs.com/about.html'},
      publisher:{'@type':'Organization',name:'LIW Cards',url:'https://cards.liwworgs.com/'},
      mainEntityOfPage:prodUrl
    });
    document.head.appendChild(ld);
  }

  async function load() {
    const slug = new URLSearchParams(location.search).get('slug') || '';
    if (!slug) {
      root.innerHTML = '<div class="buzz-loading"><h1>Article not found</h1><p><a href="buzz.html">Return to LIW Buzz</a></p></div>';
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('staging_buzz_articles')
        .select('*')
        .eq('slug',slug)
        .eq('status','published')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        root.innerHTML = '<div class="buzz-loading"><h1>Article not found</h1><p>This LIW Buzz article is not published.</p><p><a href="buzz.html">Return to LIW Buzz</a></p></div>';
        return;
      }
      setMeta(data);
      const faq = Array.isArray(data.faq) ? data.faq : [];
      root.className = 'buzz-article-shell';
      root.innerHTML = `
        <header class="buzz-article-hero">
          <a class="buzz-back" href="buzz.html">← Back to LIW Buzz</a>
          <span class="buzz-category">${esc(data.industry || 'LIW Cards')}</span>
          <h1>${esc(data.title)}</h1>
          <p class="buzz-deck">${esc(data.excerpt || '')}</p>
          <div class="buzz-byline"><span>By ${esc(data.author_name || 'LIW Cards')}</span><span>·</span><span>Published ${esc(fmt(data.published_at))}</span></div>
        </header>
        <article class="buzz-body-card"><div class="buzz-body">${renderMarkdown(data.article_markdown)}</div></article>
        ${faq.length ? '<section class="buzz-faq"><h2>Frequently asked questions</h2><div class="buzz-faq-list">' + faq.map(item => '<article><strong>' + esc(item.question || '') + '</strong><span>' + esc(item.answer || '') + '</span></article>').join('') + '</div></section>' : ''}
        <section class="buzz-cta"><div><h2>Ready to make your business easier to share?</h2><p>Build your LIW Card and put your contact details, links and business actions in one place.</p></div><a class="btn btn-primary" href="guest-builder.html?from=buzz-article">Build free</a></section>
      `;
    } catch (error) {
      console.error('Buzz article failed to load', error);
      root.innerHTML = '<div class="buzz-loading"><h1>LIW Buzz could not load</h1><p>Please try again.</p></div>';
    }
  }
  load();
})();