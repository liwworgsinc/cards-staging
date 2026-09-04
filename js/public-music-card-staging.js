(function(){
  'use strict';
  const MUSIC_VALUE='music';

  function cardData(){
    try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}
  }
  function shouldActivate(data){return String(data?.card_experience||'').toLowerCase()===MUSIC_VALUE;}
  function visible(element){return Boolean(element&&!element.hidden);}
  function track(name,target,meta){try{if(typeof window.track==='function')window.track(name,target,meta);}catch(_){}}
  function scrollToTarget(id){
    const target=document.getElementById(id);
    if(!target||target.hidden)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function streamingLinks(){
    return Array.from(document.querySelectorAll('#socials a[href]')).filter(link=>/spotify|music\.apple|soundcloud|youtube|tidal|audiomack|bandcamp|deezer|amazon.*music/i.test(link.href));
  }
  function listenHref(data){return streamingLinks()[0]?.href||data?.website||'';}
  function showHref(){
    const serviceLink=document.querySelector('#services a[href],#services button[data-href]');
    return serviceLink?.href||'';
  }
  function icon(name,size=24){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function buildCoverChrome(data,cover){
    if(cover.querySelector('.music-brand-lockup'))return;
    const brand=document.createElement('div');
    brand.className='music-brand-lockup';
    brand.innerHTML='<strong>LIW</strong><span>ARTIST CARD</span>';
    cover.prepend(brand);

    const mode=document.createElement('div');
    mode.className='music-mode-pill';
    mode.innerHTML='<span></span> ARTIST MODE';
    cover.appendChild(mode);

    const aura=document.createElement('div');
    aura.className='music-hero-aura';
    cover.appendChild(aura);
  }

  function buildPrimaryCta(data,content){
    if(content.querySelector('.music-primary-cta'))return;
    const href=listenHref(data);
    const cta=document.createElement(href?'a':'button');
    cta.className='music-primary-cta';
    if(href){cta.href=href;cta.target='_blank';cta.rel='noopener';}
    else{cta.type='button';cta.disabled=true;}
    cta.innerHTML=`${icon('play',19)}<span>LISTEN NOW</span>`;
    cta.addEventListener('click',()=>track('music_listen_click',href||null,{experience:'music'}));
    const company=document.getElementById('company');
    const title=document.getElementById('title');
    const anchor=(company&&!company.hidden?company:title)||document.getElementById('name');
    anchor?.insertAdjacentElement('afterend',cta);
  }

  function buildReleaseCard(data,content){
    if(content.querySelector('.music-release-card'))return;
    const href=listenHref(data);
    const title=String(data?.video_title||data?.headline||'Latest Release').trim();
    const artwork=String(data?.cover_image_url||data?.profile_image_url||'').trim();
    const card=document.createElement(href?'a':'div');
    card.className='music-release-card';
    if(href){card.href=href;card.target='_blank';card.rel='noopener';}
    const bars=Array.from({length:34},(_,i)=>`<span style="--h:${22+((i*17)%58)}%"></span>`).join('');
    card.innerHTML=`
      <div class="music-release-art"${artwork?` style="background-image:url('${artwork.replace(/'/g,'%27')}')"`:''}>${artwork?'':icon('disc-3',26)}</div>
      <div class="music-release-copy"><small>LATEST RELEASE</small><strong>${escapeHtml(title)}</strong><div class="music-waveform">${bars}</div></div>
      <span class="music-release-play">${icon('play',19)}</span>`;
    card.addEventListener('click',()=>track('music_release_click',href||null,{experience:'music'}));
    content.querySelector('.music-primary-cta')?.insertAdjacentElement('afterend',card);
  }

  function tile({label,iconName,target,href,accent='violet'}){
    const node=document.createElement(href?'a':'button');
    node.className=`music-luxe-tile music-accent-${accent}`;
    if(href){node.href=href;node.target='_blank';node.rel='noopener';}
    else node.type='button';
    node.innerHTML=`<span class="music-luxe-icon">${icon(iconName,27)}</span><strong>${label}</strong>`;
    node.addEventListener('click',event=>{
      if(!href){event.preventDefault();scrollToTarget(target);}
      track('music_shortcut',target||href,{label});
    });
    return node;
  }

  function buildLauncher(data,content){
    if(content.querySelector('.music-luxe-launcher'))return;
    const launcher=document.createElement('section');
    launcher.className='music-luxe-launcher';
    launcher.setAttribute('aria-label','Artist shortcuts');
    const grid=document.createElement('div');
    grid.className='music-luxe-grid';

    const href=listenHref(data);
    const bookTarget=visible(document.getElementById('lead-section'))?'lead-section':'business-actions';
    const items=[
      {label:'Music',iconName:'music-2',href:href||null,target:'social-section',accent:'violet'},
      {label:'Videos',iconName:'play-square',target:'video-section',accent:'blue'},
      {label:'Shows',iconName:'ticket',target:'services-section',accent:'violet'},
      {label:'Merch',iconName:'shirt',target:'products-section',accent:'blue'},
      {label:'Gallery',iconName:'image',target:'video-section',accent:'violet'},
      {label:'Fan Club',iconName:'crown',target:'lead-section',accent:'blue'},
      {label:'EPK',iconName:'file-text',target:'downloads-section',accent:'violet'},
      {label:'Book Me',iconName:'calendar-days',target:bookTarget,accent:'blue'},
      {label:'Social',iconName:'users',target:'social-section',accent:'violet'}
    ];
    items.forEach(item=>grid.appendChild(tile(item)));
    launcher.appendChild(grid);
    content.querySelector('.music-release-card')?.insertAdjacentElement('afterend',launcher);
  }

  function buildInnerCircle(content){
    if(content.querySelector('.music-inner-circle'))return;
    const target=visible(document.getElementById('lead-section'))?'lead-section':visible(document.getElementById('social-section'))?'social-section':'';
    if(!target)return;
    const panel=document.createElement('section');
    panel.className='music-inner-circle';
    panel.innerHTML=`
      <div class="music-inner-copy"><span class="music-diamond">${icon('gem',22)}</span><div><strong>Join the Inner Circle</strong><small>Be the first to hear updates, drops & more.</small></div></div>
      <div class="music-inner-action"><span>Email or Phone Number</span><button type="button">JOIN</button></div>`;
    panel.querySelector('button').addEventListener('click',()=>{scrollToTarget(target);track('music_inner_circle',target,{experience:'music'});});
    content.querySelector('.music-luxe-launcher')?.insertAdjacentElement('afterend',panel);
  }

  function buildUpcomingShow(content){
    if(content.querySelector('.music-upcoming-show'))return;
    const services=document.getElementById('services-section');
    if(!visible(services))return;
    const firstCard=document.querySelector('#services .public-service-card,#services > *');
    const raw=String(firstCard?.textContent||'Upcoming performance').replace(/\s+/g,' ').trim();
    const label=raw.slice(0,56)||'Upcoming performance';
    const strip=document.createElement('button');
    strip.type='button';
    strip.className='music-upcoming-show';
    strip.innerHTML=`<span class="music-show-icon">${icon('calendar-days',20)}</span><span class="music-show-copy"><small>UPCOMING SHOW</small><strong>${escapeHtml(label)}</strong></span><span class="music-show-link">View dates</span>${icon('chevron-right',18)}`;
    strip.addEventListener('click',()=>{scrollToTarget('services-section');track('music_show_click','services-section',{experience:'music'});});
    const inner=content.querySelector('.music-inner-circle')||content.querySelector('.music-luxe-launcher');
    inner?.insertAdjacentElement('afterend',strip);
  }

  function renameSections(){
    const names={
      'video-section':['Featured video','Watch'],
      'services-section':['Shows & Tour','Live dates'],
      'products-section':['Merch & Drops','Shop the artist'],
      'social-section':['Follow the Artist','Stay connected'],
      'downloads-section':['EPK & Press Kit','Media & downloads'],
      'lead-section':['Book the Artist','Management & bookings']
    };
    Object.entries(names).forEach(([id,[title,sub]])=>{
      const section=document.getElementById(id);if(!section)return;
      const h=section.querySelector('.public-section-heading h2,.public-rich-head h2');
      const s=section.querySelector('.public-section-heading span,.public-rich-head span');
      if(h)h.textContent=title;if(s)s.textContent=sub;
    });
  }

  function buildFooter(content){
    const branding=document.getElementById('branding');
    if(!branding||branding.dataset.musicLuxe==='true')return;
    branding.dataset.musicLuxe='true';
    branding.classList.add('music-luxe-footer');
    branding.innerHTML='<strong>LIW</strong><span>LINK IN WORLDWIDE</span>';
  }

  function orderSections(content){
    const branding=document.getElementById('branding');
    ['video-section','services-section','products-section','social-section','downloads-section','lead-section','payment-sharing-section'].forEach(id=>{
      const section=document.getElementById(id);
      if(section)content.insertBefore(section,branding||null);
    });
  }

  function activate(){
    const data=cardData();
    const card=document.getElementById('card');
    const content=card?.querySelector('.public-content');
    if(!data||!card||!content||card.hidden||card.dataset.musicReady==='luxe-v2'||!shouldActivate(data))return false;
    if(card.classList.contains('swipe-card-active'))return false;

    card.dataset.musicReady='luxe-v2';
    card.dataset.cardExperience='music';
    card.classList.add('music-card-active');
    document.body.classList.add('music-page-active');
    buildCoverChrome(data,document.getElementById('public-cover'));
    renameSections();
    buildPrimaryCta(data,content);
    buildReleaseCard(data,content);
    buildLauncher(data,content);
    buildInnerCircle(content);
    buildUpcomingShow(content);
    orderSections(content);
    buildFooter(content);

    const save=document.getElementById('save');
    if(save){save.classList.add('music-save-artist');save.innerHTML=`${icon('user-round-plus',18)} Save Artist`;}
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(activate()||attempts>80)clearInterval(timer);
  },175);
})();
