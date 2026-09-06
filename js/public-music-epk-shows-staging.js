/* LIW Cards staging — Music-only EPK / Press Kit + Shows & Tour rooms.
   Event-driven and mobile-safe: upgrades only when the matching room opens. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_EPK_SHOWS__)return;
  window.__LIW_MUSIC_EPK_SHOWS__=true;

  let settings=null;
  let settingsPromise=null;
  const scheduled={epk:false,shows:false};

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function room(){return document.querySelector('.music-artist-room.open');}
  function title(node=room()){return safe(node?.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();}
  function body(node=room()){return node?.querySelector('[data-music-room-body]')||null;}
  function artistName(){return safe(document.getElementById('name')?.textContent||data()?.full_name||'Artist',120)||'Artist';}
  function artistIdentity(){return safe(document.getElementById('title')?.textContent||'',180);}
  function closeRoom(){room()?.querySelector('.music-artist-room-close')?.click();}

  async function loadSettings(){
    if(settings)return settings;
    if(settingsPromise)return settingsPromise;
    settingsPromise=(async()=>{
      const d=data()||{};
      const slug=safe(d.slug||new URLSearchParams(location.search).get('slug'),160);
      if(!slug||typeof supabaseClient==='undefined')return {};
      try{
        const {data:row,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
        if(error)throw error;
        settings=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
      }catch(error){
        console.warn('[LIW EPK/Shows] artist settings unavailable',error);
        settings={};
      }
      return settings;
    })();
    return settingsPromise;
  }

  function formatDate(raw){
    const value=safe(raw,40);if(!value)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
      try{return new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${value}T12:00:00`));}catch(_){ }
    }
    return value;
  }

  function profileImage(d,s){return safe(d?.profile_image_url||s?.release_artwork_url||d?.cover_image_url,1800);}

  function buildBack(kind){
    const node=document.createElement('button');
    node.type='button';node.className=`music-${kind}-back`;
    node.innerHTML=`${icon('arrow-left',16)} Back to Artist Card`;
    node.addEventListener('click',closeRoom);
    return node;
  }

  function externalLink(href,label,iconName='arrow-up-right'){
    const a=document.createElement('a');
    a.href=href;a.target='_blank';a.rel='noopener';
    a.innerHTML=`<span>${label}</span>${icon(iconName,16)}`;
    return a;
  }

  function pressBio(d){
    const dom=safe(document.getElementById('bio')?.textContent,700);
    return dom||safe(d?.bio||d?.headline,700)||`${artistName()} is building a press-ready LIW Artist Card.`;
  }

  function enhanceEpk(){
    if(!isMusic())return false;
    const r=room();if(!r||title(r)!=='epk')return false;
    const b=body(r);const section=b?.querySelector('#downloads-section');
    if(!b||!section)return false;
    if(b.querySelector('.music-epk-hero'))return true;

    const d=data()||{};const s=settings||{};
    section.hidden=false;section.classList.add('music-epk-section');
    section.querySelector('.public-section-heading')?.classList.add('music-epk-native-heading');

    const hero=document.createElement('section');hero.className='music-epk-hero';
    const img=profileImage(d,s);
    const chips=[safe(s.genre,80),safe(s.location,120)].filter(Boolean);
    const release=safe(s.featured_release_title||d.video_title||d.headline,160);
    hero.innerHTML=`
      <div class="music-epk-portrait"${img?` style="background-image:url('${img.replace(/'/g,'%27')}')"`:''}>${img?'':icon('user-round',34)}<span>${icon('badge-check',16)} OFFICIAL EPK</span></div>
      <div class="music-epk-hero-copy">
        <small>LIW ARTIST PRESS KIT</small>
        <h2>${esc(artistName())}</h2>
        <p>${esc(artistIdentity()||chips.join(' • ')||'Artist')}</p>
        ${chips.length?`<div class="music-epk-chips">${chips.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}
      </div>`;
    b.insertBefore(hero,section);

    const summary=document.createElement('section');summary.className='music-epk-summary';
    summary.innerHTML=`<div class="music-epk-summary-head"><span>${icon('quote',18)}</span><strong>Artist Bio</strong></div><p>${esc(pressBio(d))}</p>${release?`<div class="music-epk-release"><small>LATEST RELEASE</small><strong>${esc(release)}</strong></div>`:''}`;
    section.before(summary);

    const downloads=section.querySelector('#downloads');
    if(downloads){
      downloads.classList.add('music-epk-downloads');
      [...downloads.children].forEach((item,index)=>{
        item.classList.add('music-epk-download-item');item.dataset.epkIndex=String(index);
        const a=item.matches?.('a[href]')?item:item.querySelector?.('a[href]');
        if(a){a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',`${safe(a.textContent||'Press material',100)} — open press material`);}
      });
    }

    const materialCount=downloads?.children?.length||0;
    if(!materialCount){
      const empty=document.createElement('div');empty.className='music-epk-empty';
      empty.innerHTML=`${icon('files',28)}<strong>Press materials coming soon</strong><span>Add press photos, one-sheets, riders, logos or media PDFs to the LIW Downloads section.</span>`;
      section.appendChild(empty);
    }

    const actions=document.createElement('section');actions.className='music-epk-actions';
    const links=[];
    const epk=safe(s.epk_url);const booking=safe(s.booking_url);const website=safe(d.website);
    if(epk)links.push({href:epk,label:'Open Full EPK',icon:'file-down',primary:true});
    if(booking)links.push({href:booking,label:'Booking / Management',icon:'calendar-days'});
    if(website)links.push({href:website,label:'Official Website',icon:'globe-2'});
    const email=safe(d.email,180);if(email)links.push({href:`mailto:${email}`,label:'Press Contact',icon:'mail'});
    links.slice(0,4).forEach(item=>{
      const a=externalLink(item.href,item.label,item.icon);a.className=`music-epk-action${item.primary?' primary':''}`;actions.appendChild(a);
    });
    if(actions.children.length)section.after(actions);

    const existing=[...b.querySelectorAll(':scope > div > .music-room-link[href], :scope > .music-room-link[href]')];
    existing.forEach(a=>{a.classList.add('music-epk-base-link');a.target='_blank';a.rel='noopener';});

    b.appendChild(buildBack('epk'));
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function tourItems(section){
    const list=section?.querySelector('#services');if(!list)return [];
    const children=[...list.children].filter(node=>node.nodeType===1);
    children.forEach((item,index)=>{
      item.classList.add('music-tour-row');item.dataset.tourIndex=String(index);
      const link=item.querySelector?.('a[href]');if(link){link.target='_blank';link.rel='noopener';}
    });
    list.classList.add('music-tour-list');
    return children;
  }

  function enhanceShows(){
    if(!isMusic())return false;
    const r=room();if(!r||title(r)!=='shows')return false;
    const b=body(r);const section=b?.querySelector('#services-section');
    if(!b||!section)return false;
    if(b.querySelector('.music-tour-hero'))return true;

    const s=settings||{};
    section.hidden=false;section.classList.add('music-tour-section');
    section.querySelector('.public-section-heading')?.classList.add('music-tour-native-heading');

    const date=formatDate(s.upcoming_show_date);
    const venue=safe(s.show_venue,140);
    const city=safe(s.show_city,120);
    const ticket=safe(s.ticket_url,1800);
    const next=[venue,city].filter(Boolean).join(' • ');

    const hero=document.createElement('section');hero.className='music-tour-hero';
    hero.innerHTML=`
      <div class="music-tour-hero-mark">${icon('mic-2',29)}</div>
      <div class="music-tour-hero-copy"><small>LIVE &amp; ON STAGE</small><h2>${esc(artistName())} Shows &amp; Tour</h2><p>Tour dates, live appearances and ticket links — all in one place.</p></div>
      <div class="music-tour-live-pill"><span></span> LIVE DATES</div>`;
    b.insertBefore(hero,section);

    if(date||next||ticket){
      const spotlight=document.createElement('section');spotlight.className='music-tour-spotlight';
      spotlight.innerHTML=`<div class="music-tour-datebox"><small>NEXT SHOW</small><strong>${esc(date||'Upcoming')}</strong></div><div class="music-tour-spotlight-copy"><small>LIVE APPEARANCE</small><strong>${esc(next||'Venue details coming soon')}</strong>${city&&venue?`<span>${icon('map-pin',14)} ${esc(city)}</span>`:''}</div>`;
      if(ticket){const a=externalLink(ticket,'Get Tickets','ticket');a.className='music-tour-ticket';spotlight.appendChild(a);}
      section.before(spotlight);
    }

    const items=tourItems(section);
    if(!items.length){
      const empty=document.createElement('div');empty.className='music-tour-empty';
      empty.innerHTML=`${icon('calendar-x-2',28)}<strong>No additional dates posted yet</strong><span>${date||next?'The next show is above. More dates can be added from Artist Dressing Room.':'Add upcoming shows, venues, cities and ticket links from Artist Dressing Room.'}</span>`;
      section.appendChild(empty);
    }

    const external=[...b.querySelectorAll('.music-room-link[href]')].find(a=>!a.closest('#services-section'));
    if(external){
      external.target='_blank';external.rel='noopener';external.classList.add('music-tour-store-link');
      if(!external.dataset.musicTourLabel){external.dataset.musicTourLabel='true';external.innerHTML=`${icon('ticket',17)} View ticket destination ${icon('arrow-up-right',15)}`;}
    }

    b.appendChild(buildBack('tour'));
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  async function enhance(kind){
    await loadSettings();
    return kind==='epk'?enhanceEpk():enhanceShows();
  }

  function schedule(kind){
    if(scheduled[kind])return;
    scheduled[kind]=true;
    [0,70,180,420,850].forEach((delay,index)=>setTimeout(()=>{
      enhance(kind).catch(error=>console.warn(`[LIW ${kind}] room upgrade failed`,error));
      if(index===4)scheduled[kind]=false;
    },delay));
  }

  document.addEventListener('click',event=>{
    const tile=event.target?.closest?.('.music-luxe-tile');if(!tile)return;
    const label=safe(tile.querySelector('strong')?.textContent,40).toLowerCase();
    if(label==='epk')schedule('epk');
    if(label==='shows')schedule('shows');
  });

  loadSettings().catch(()=>{});
  setTimeout(()=>{
    const t=title();if(t==='epk')schedule('epk');else if(t==='shows')schedule('shows');
  },0);
})();
