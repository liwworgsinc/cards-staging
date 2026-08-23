const menuButton=document.querySelector('[data-menu-button]');
const mobileMenu=document.querySelector('[data-mobile-menu]');
if(menuButton&&mobileMenu){menuButton.addEventListener('click',()=>mobileMenu.classList.toggle('open'));mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('open')))}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

// The production public-card page may refuse cross-origin framing while this homepage
// is being tested on GitHub Pages. Use the staging renderer on staging instead. It
// reads from the same Supabase project, so the real published card data still loads.
const featuredFrame=document.querySelector('[data-featured-card]');
const isGithubStaging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
if(featuredFrame&&isGithubStaging){
  const stagingCardUrl='card.html?slug=damion-thomas-liw';
  featuredFrame.src=stagingCardUrl;
  document.querySelectorAll('[data-card-url]').forEach(button=>{
    if((button.getAttribute('data-card-url')||'').includes('cards.liwworgs.com/card.html'))button.setAttribute('data-card-url',stagingCardUrl);
  });
}

if(window.lucide)lucide.createIcons();
