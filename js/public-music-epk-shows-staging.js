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

  function pressBio(d,s){
    return safe(s?.epk_bio,1800)
      ||safe(d?.biography||d?.bio,1800)
      ||safe(document.getElementById('bio')?.textContent,1800)
      ||'No artist biography added yet.';
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
    summary.innerHTML=`<div class="music-epk-summary-head"><span>${icon('quote',18)}</span><strong>Artist Bio</strong></div><p>${esc(pressBio(d,s))}</p>${release?`<div class="music-epk-release"><small>LATEST RELEASE</small><strong>${esc(release)}</strong></div>`:''}`;
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
      if(s.epk_pro_entitled===true&&s.epk_enabled===true){
        const copy=s.epk_package_enabled===true
          ?'The one-sheet, booking details, press photos and supplied technical documents are in the downloadable promoter ZIP on the professional EPK page.'
          :'The professional EPK contains the artist bio, music, shows and selected press media. The artist can enable a promoter ZIP in the EPK editor.';
        empty.innerHTML=`${icon('file-archive',28)}<strong>${s.epk_package_enabled===true?'Promoter package available':'Professional EPK available'}</strong><span>${esc(copy)}</span>`;
      }else{
        empty.innerHTML=`${icon('files',28)}<strong>No separate press files attached</strong><span>Enable the native EPK or add individual files in Downloads to share press materials.</span>`;
      }
      section.appendChild(empty);
    }

    const actions=document.createElement('section');actions.className='music-epk-actions';
    const links=[];
    const epk=safe(s.epk_url);const booking=safe(s.booking_url);const website=safe(d.website);
    if(s.epk_pro_entitled===true&&s.epk_enabled===true){const native=new URL('epk.html',location.href);native.searchParams.set('slug',safe(d.slug||new URLSearchParams(location.search).get('slug'),160));links.push({href:native.href,label:s.epk_package_enabled===true?'Open EPK & download promoter ZIP':'View Professional EPK',icon:'file-user',primary:true});}
    if(safeTourHref(epk))links.push({href:safeTourHref(epk),label:'External press kit',icon:'file-down',primary:!links.length});
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

  function safeTourHref(value){
    const raw=safe(value,1800);
    if(!raw||/[\s<>"'`]/.test(raw))return '';
    try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_){return '';}
  }

  function tourEntries(s){
    const raw=Array.isArray(s?.shows)?s.shows:[];
    const source=raw.length?raw:[{
      date:s?.upcoming_show_date,
      venue:s?.show_venue,
      city:s?.show_city,
      ticket_url:s?.ticket_url
    }];
    const seen=new Set();
    const items=[];
    source.forEach((item,index)=>{
      if(!item||typeof item!=='object')return;
      const entry={
        date:safe(item.date||item.upcoming_show_date,40),
        venue:safe(item.venue||item.show_venue,140),
        city:safe(item.city||item.show_city,120),
        ticket:safeTourHref(item.ticket_url),
        flyer:safeTourHref(item.flyer_url),
        originalIndex:index
      };
      if(!entry.date&&!entry.venue&&!entry.city&&!entry.ticket&&!entry.flyer)return;
      const key=[entry.date,entry.venue.toLowerCase(),entry.city.toLowerCase()].join('|');
      if(seen.has(key))return;seen.add(key);items.push(entry);
    });
    const now=new Date();
    const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const group=item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date)?(item.date>=today?0:2):1;
    return items.sort((a,b)=>{
      const ag=group(a),bg=group(b);if(ag!==bg)return ag-bg;
      if(ag===0)return a.date.localeCompare(b.date)||a.originalIndex-b.originalIndex;
      if(ag===2)return b.date.localeCompare(a.date)||a.originalIndex-b.originalIndex;
      return a.originalIndex-b.originalIndex;
    });
  }

  function tourEventRow(item,index){
    const node=document.createElement('article');
    node.className='music-tour-event';
    node.dataset.tourIndex=String(index);
    const date=formatDate(item.date)||'Date TBA';
    const venue=item.venue||'Venue to be announced';
    const place=item.city?`<span class="music-tour-event-city">${icon('map-pin',14)} ${esc(item.city)}</span>`:'';
    node.innerHTML=`<div class="music-tour-event-date"><small>SHOW ${index+1}</small><strong>${esc(date)}</strong></div><div class="music-tour-event-copy"><strong>${esc(venue)}</strong>${place}</div>${item.flyer?`<img class="music-tour-event-flyer" src="${esc(item.flyer)}" alt="${esc(venue)} event flyer" loading="lazy"/>`:''}${item.ticket?`<a class="music-tour-event-ticket" href="${esc(item.ticket)}" target="_blank" rel="noopener noreferrer">${icon('ticket',16)} Get Tickets ${icon('arrow-up-right',14)}</a>`:''}`;
    return node;
  }

  function enhanceShows(){
    if(!isMusic())return false;
    const r=room();if(!r||title(r)!=='shows')return false;
    const b=body(r);if(!b)return false;
    if(b.querySelector('.music-tour-hero'))return true;
  
    const s=settings||{};
    const events=tourEntries(s);
    const section=b.querySelector('#services-section');
    const native=section?.querySelector('#services');
    const hasNative=Boolean(native&&[...native.children].some(node=>safe(node.textContent)));
    const anchor=section||b.firstElementChild;
  
    const hero=document.createElement('section');hero.className='music-tour-hero';
    hero.innerHTML=`<div class="music-tour-hero-mark">${icon('mic-2',29)}</div><div class="music-tour-hero-copy"><small>LIVE &amp; ON STAGE</small><h2>${esc(artistName())} Shows &amp; Tour</h2><p>Tour dates, live appearances and ticket links — all in one place.</p></div><div class="music-tour-live-pill"><span></span> ${events.length} ${events.length===1?'DATE':'DATES'}</div>`;
    b.insertBefore(hero,anchor);
  
    if(events.length){
      // The artist_settings.shows array is authoritative. The old services section
      // is not a tour-date store and must not hide, duplicate, or replace these events.
      if(section){section.hidden=true;section.style.setProperty('display','none','important');}
      const featured=events[0];
      const now=new Date();
    const todayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const past=/^\d{4}-\d{2}-\d{2}$/.test(featured.date)&&featured.date<todayKey;
      const spotlight=document.createElement('section');spotlight.className='music-tour-spotlight';
      spotlight.innerHTML=`<div class="music-tour-datebox"><small>${past?'LATEST SHOW':'NEXT SHOW'}</small><strong>${esc(formatDate(featured.date)||'Date TBA')}</strong></div><div class="music-tour-spotlight-copy"><small>LIVE APPEARANCE</small><strong>${esc(featured.venue||'Venue to be announced')}</strong>${featured.city?`<span>${icon('map-pin',14)} ${esc(featured.city)}</span>`:''}</div>${featured.flyer?`<img class="music-tour-featured-flyer" src="${esc(featured.flyer)}" alt="${esc(featured.venue||'Show')} event flyer" loading="lazy"/>`:''}`;
      if(featured.ticket){const a=externalLink(featured.ticket,'Get Tickets','ticket');a.className='music-tour-ticket';spotlight.appendChild(a);}
      b.insertBefore(spotlight,anchor);
      const rest=events.slice(1);
      if(rest.length){
        const list=document.createElement('section');list.className='music-tour-dates';
        list.innerHTML=`<div class="music-tour-dates-heading"><strong>${rest.length} MORE ${rest.length===1?'DATE':'DATES'}</strong><span>Live appearances</span></div>`;
        rest.forEach((item,index)=>list.appendChild(tourEventRow(item,index+1)));
        b.insertBefore(list,anchor);
      }
      // The legacy room's generic ticket destination points to just one show.
      const legacy=[...b.querySelectorAll('.music-room-link[href]')].find(a=>!a.closest('#services-section'));
      if(legacy){legacy.hidden=true;legacy.style.setProperty('display','none','important');}
    }else if(section&&hasNative){
      section.hidden=false;section.classList.add('music-tour-section');
      section.querySelector('.public-section-heading')?.classList.add('music-tour-native-heading');
      native.classList.add('music-tour-list');
      [...native.children].forEach((item,index)=>{
        item.classList.add('music-tour-row');item.dataset.tourIndex=String(index);
        const a=item.querySelector?.('a[href]');if(a){a.target='_blank';a.rel='noopener noreferrer';}
      });
    }else{
      if(section){section.hidden=true;section.style.setProperty('display','none','important');}
      const empty=document.createElement('div');empty.className='music-tour-empty';
      empty.innerHTML=`${icon('calendar-x-2',28)}<strong>No shows posted yet</strong><span>Add upcoming shows, venues, cities and ticket links from Artist Dressing Room.</span>`;
      b.insertBefore(empty,anchor);
    }
    b.appendChild(buildBack('tour'));
    if(window.lucide)try{lucide.createIcons();}catch(_){}
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
    const trigger=event.target?.closest?.('.music-luxe-tile,.music-upcoming-show,.music-bottom-swipe-show,.music-bottom-swipe-proxy');if(!trigger)return;
    const label=safe(trigger.querySelector('strong')?.textContent,40).toLowerCase();
    if(label==='epk')schedule('epk');
    if(label==='shows'||trigger.matches('.music-upcoming-show,.music-bottom-swipe-show')||trigger.dataset.musicBottomProxy==='show')schedule('shows');
  });

  loadSettings().catch(()=>{});
  setTimeout(()=>{
    const t=title();if(t==='epk')schedule('epk');else if(t==='shows')schedule('shows');
  },0);
})();
