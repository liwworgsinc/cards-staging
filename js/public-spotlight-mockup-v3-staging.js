/* LIW Cards — Spotlight Mockup V3 staging adapter.
   Re-composes existing rendered card nodes; does not replace LIW data/actions. */
(function () {
  const ACTIVE = 'spotlight-mockup-v3-active';
  let navObserver = null;

  function hasCoverImage(cover) {
    const bg = String(cover?.style?.backgroundImage || '');
    return /url\(/i.test(bg);
  }

  function buildHero(card, cover) {
    if (cover.querySelector('.spotlight-hero-copy')) return;
    const content = card.querySelector('.public-content');
    if (!content) return;

    const name = document.getElementById('name');
    const title = document.getElementById('title');
    const company = document.getElementById('company');
    const headline = document.getElementById('headline');
    const avatar = document.getElementById('avatar');
    const avatarImg = avatar?.querySelector('img');

    // The mockup uses the person/business imagery as the hero. When no cover was
    // uploaded, use the real profile photo rather than leaving Spotlight generic.
    if (!hasCoverImage(cover) && avatarImg?.src) {
      cover.style.backgroundImage = `linear-gradient(rgba(0,0,0,.04),rgba(0,0,0,.12)),url("${String(avatarImg.src).replace(/"/g, '%22')}")`;
      cover.style.backgroundPosition = 'center 26%';
      cover.classList.add('spotlight-profile-hero');
      avatar.hidden = true;
    } else if (avatar) {
      card.classList.add('spotlight-has-separate-avatar');
      avatar.hidden = false;
    }

    const hero = document.createElement('div');
    hero.className = 'spotlight-hero-copy';
    if (card.classList.contains('spotlight-has-separate-avatar') && avatar) hero.appendChild(avatar);
    if (title && title.textContent.trim()) hero.appendChild(title);
    if (name) hero.appendChild(name);
    if (company && company.textContent.trim()) hero.appendChild(company);
    if (headline && headline.textContent.trim()) hero.appendChild(headline);
    cover.appendChild(hero);

    // Match the approved mobile rhythm: actions -> primary CTA -> business CTA -> intro.
    const bio = document.getElementById('bio');
    const business = document.getElementById('business-actions');
    if (bio && business && bio.textContent.trim()) business.insertAdjacentElement('afterend', bio);

    const save = document.getElementById('save');
    if (save) save.innerHTML = '<i data-lucide="user-round-plus" size="18"></i><span>Save Contact</span>';
  }

  function visible(element) {
    return Boolean(element && !element.hidden && element.offsetParent !== null);
  }

  function buildBottomNav(card) {
    if (document.querySelector('.spotlight-bottom-nav')) return;
    const candidates = [
      { label: 'About', icon: 'user-round', target: card.querySelector('#public-cover') },
      { label: 'Services', icon: 'sparkles', target: document.getElementById('services-section') },
      { label: 'Work', icon: 'briefcase-business', target: document.getElementById('products-section') || document.getElementById('video-section') || document.getElementById('downloads-section') },
      { label: 'Connect', icon: 'messages-square', target: document.getElementById('social-section') || document.getElementById('lead-section') }
    ];
    const items = candidates.filter((item, index) => index === 0 || visible(item.target));
    if (items.length < 2) {
      const actionTarget = document.getElementById('actions');
      if (actionTarget) items.push({ label: 'Contact', icon: 'phone', target: actionTarget });
    }

    const nav = document.createElement('nav');
    nav.className = 'spotlight-bottom-nav';
    nav.setAttribute('aria-label', 'Spotlight sections');
    nav.dataset.theme = card.classList.contains('public-mode-light') ? 'light' : 'dark';
    nav.style.setProperty('--spotlight-nav-accent', getComputedStyle(card).getPropertyValue('--card-button') || '#d4a84f');
    const inner = document.createElement('div');
    inner.className = 'spotlight-bottom-nav-inner';
    nav.appendChild(inner);

    items.slice(0, 4).forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === 0 ? 'active' : '';
      button.innerHTML = `<i data-lucide="${item.icon}" size="18"></i><span>${item.label}</span>`;
      button.addEventListener('click', () => {
        item.target?.scrollIntoView({ behavior: 'smooth', block: item.target.id === 'public-cover' ? 'start' : 'center' });
      });
      button.__liwTarget = item.target;
      inner.appendChild(button);
    });
    document.body.appendChild(nav);

    if ('IntersectionObserver' in window) {
      navObserver?.disconnect();
      const buttons = [...inner.querySelectorAll('button')];
      navObserver = new IntersectionObserver(entries => {
        const seen = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!seen) return;
        buttons.forEach(button => button.classList.toggle('active', button.__liwTarget === seen.target));
      }, { rootMargin: '-28% 0px -55% 0px', threshold: [0.05,.2,.45] });
      buttons.forEach(button => button.__liwTarget && navObserver.observe(button.__liwTarget));
    }
  }

  function activate() {
    const card = document.getElementById('card');
    if (!card || card.hidden || !card.classList.contains('public-layout-spotlight')) return false;
    if (card.classList.contains(ACTIVE)) return true;
    card.classList.add(ACTIVE);
    const cover = document.getElementById('public-cover');
    if (!cover) return false;
    buildHero(card, cover);
    buildBottomNav(card);
    if (window.lucide) try { window.lucide.createIcons(); } catch (_) {}
    return true;
  }

  function start() {
    if (activate()) return;
    const card = document.getElementById('card');
    if (!card) return;
    const observer = new MutationObserver(() => {
      if (activate()) observer.disconnect();
    });
    observer.observe(card, { attributes:true, childList:true, subtree:true, attributeFilter:['class','hidden'] });
    setTimeout(() => { activate(); observer.disconnect(); }, 5000);
  }

  document.addEventListener('liw:public-card-rendered', () => requestAnimationFrame(activate));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
