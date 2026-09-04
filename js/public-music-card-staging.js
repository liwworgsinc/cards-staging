(function(){
  const MUSIC_VALUE='music';

  function cardData(){
    try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}
  }

  function isVisible(element){
    return Boolean(element&&!element.hidden&&(element.innerHTML?.trim()||element.textContent?.trim()));
  }

  function shouldActivate(data){
    return String(data?.card_experience||'').toLowerCase()===MUSIC_VALUE;
  }

  function scrollToTarget(id){
    const target=document.getElementById(id);
    if(!target||target.hidden)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function addModePill(cover){
    if(!cover||cover.querySelector('.music-mode-pill'))return;
    const pill=document.createElement('span');
    pill.className='music-mode-pill';
    pill.innerHTML='<i data-lucide="music-2" size="13"></i> ARTIST MODE';
    cover.appendChild(pill);
  }

  function findListenHref(data){
    const socialLinks=Array.from(document.querySelectorAll('#socials a[href]'));
    const streaming=socialLinks.find(link=>/spotify|music\.apple|soundcloud|youtube|tidal|audiomack|bandcamp/i.test(link.href));
    return streaming?.href||data?.website||socialLinks[0]?.href||'';
  }

  function createPrimaryCta(data, content){
    if(content.querySelector('.music-primary-cta'))return;
    const href=findListenHref(data);
    if(!href)return;
    const cta=document.createElement('a');
    cta.className='music-primary-cta';
    cta.href=href;
    cta.target=/^https?:/i.test(href)?'_blank':'_self';
    cta.rel='noopener';
    cta.innerHTML='<i data-lucide="play" size="18"></i><span>LISTEN NOW</span>';
    cta.addEventListener('click',()=>{if(typeof window.track==='function')window.track('music_listen_click',null,{experience:'music'});});
    const identityEnd=document.getElementById('company')||document.getElementById('title')||document.getElementById('name');
    identityEnd?.insertAdjacentElement('afterend',cta);
  }

  function createLauncher(content){
    if(content.querySelector('.music-launcher'))return;
    const candidates=[
      {id:'video-section',label:'Videos',icon:'play-square'},
      {id:'services-section',label:'Shows',icon:'ticket'},
      {id:'products-section',label:'Merch',icon:'shirt'},
      {id:'social-section',label:'Socials',icon:'users'},
      {id:'downloads-section',label:'EPK',icon:'file-down'},
      {id:'lead-section',label:'Book Me',icon:'calendar-check'}
    ].filter(item=>isVisible(document.getElementById(item.id)));

    const business=document.getElementById('business-actions');
    if(isVisible(business)&&!candidates.some(item=>item.label==='Book Me')){
      candidates.push({id:'business-actions',label:'Book Me',icon:'calendar-check'});
    }
    if(!candidates.length)return;

    const launcher=document.createElement('section');
    launcher.className='music-launcher';
    launcher.setAttribute('aria-label','Artist card shortcuts');
    launcher.innerHTML='<div class="music-launcher-grid"></div>';
    const grid=launcher.firstElementChild;
    candidates.slice(0,9).forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='music-launch-tile';
      button.innerHTML=`<i data-lucide="${item.icon}" size="23"></i><span>${item.label}</span>`;
      button.addEventListener('click',()=>{
        scrollToTarget(item.id);
        if(typeof window.track==='function')window.track('music_shortcut',item.id,{label:item.label});
      });
      grid.appendChild(button);
    });
    const actions=document.getElementById('actions');
    (actions||document.getElementById('save'))?.insertAdjacentElement('afterend',launcher);
  }

  function renameSections(){
    const serviceHeading=document.querySelector('#services-section .public-section-heading h2');
    const productHeading=document.querySelector('#products-section .public-section-heading h2');
    const downloadHeading=document.querySelector('#downloads-section .public-section-heading h2');
    const leadHeading=document.querySelector('#lead-section .public-section-heading h2');
    if(serviceHeading&&serviceHeading.textContent.trim()==='Services')serviceHeading.textContent='Shows & Booking';
    if(productHeading&&productHeading.textContent.trim()==='Featured products')productHeading.textContent='Merch & Drops';
    if(downloadHeading&&downloadHeading.textContent.trim()==='Downloads')downloadHeading.textContent='EPK & Downloads';
    if(leadHeading&&leadHeading.textContent.trim()==='Send an inquiry')leadHeading.textContent='Book the Artist';
  }

  function orderArtistSections(content){
    const branding=document.getElementById('branding');
    const ids=['video-section','services-section','products-section','social-section','downloads-section','lead-section','payment-sharing-section'];
    ids.forEach(id=>{
      const section=document.getElementById(id);
      if(section)content.insertBefore(section,branding||null);
    });
  }

  function activate(){
    const data=cardData();
    const card=document.getElementById('card');
    const content=card?.querySelector('.public-content');
    if(!data||!card||!content||card.hidden||card.dataset.musicReady==='true'||!shouldActivate(data))return false;
    // Flow owns its DOM only when card_experience=flow. Never mix the two experiences.
    if(card.classList.contains('swipe-card-active'))return false;

    card.dataset.musicReady='true';
    card.dataset.cardExperience='music';
    card.classList.add('music-card-active');
    addModePill(document.getElementById('public-cover'));
    createPrimaryCta(data,content);
    renameSections();
    createLauncher(content);
    orderArtistSections(content);

    const save=document.getElementById('save');
    if(save){
      save.classList.add('music-save-artist');
      save.innerHTML='<i data-lucide="user-round-plus" size="18"></i> Save Artist';
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(activate()||attempts>64)clearInterval(timer);
  },200);
})();
