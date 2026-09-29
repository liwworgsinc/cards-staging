(function nativeEpkPublic(){
  'use strict';
  if(window.__LIW_NATIVE_EPK_PUBLIC__)return;
  window.__LIW_NATIVE_EPK_PUBLIC__=true;
  const params=new URLSearchParams(location.search);
  const slug=String(params.get('slug')||'').trim().slice(0,160);
  const preview=params.get('editor_preview')==='1';
  const loader=document.getElementById('epk-loading');
  const app=document.getElementById('epk-app');
  function safe(v,max=1800){return String(v??'').trim().slice(0,max);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function http(v){
    const raw=safe(v,1800);
    if(!raw||/[\s<>"'`]/.test(raw))return '';
    try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch(_){return '';}
  }
  function email(v){const raw=safe(v,180);return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(raw)?raw:'';}
  function one(v){return Array.isArray(v)?v[0]||null:v||null;}
  function img(v,alt,cls){const url=http(v);return url?`<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`:'';}
  function badge(v){return v?`<span class="epk-chip">${esc(v)}</span>`:'';}
  function section(title,label,inside){
    return inside?`<section class="epk-panel"><small class="epk-eyebrow">${esc(label)}</small><h2>${esc(title)}</h2>${inside}</section>`:'';
  }
  function notice(title,description){
    document.title=`${title} | LIW Cards`;
    loader.innerHTML=`<span class="epk-loading-mark">LIW</span><h1>${esc(title)}</h1><p>${esc(description)}</p>`;
    loader.hidden=false;app.hidden=true;
  }
  function date(v){
    const s=safe(v,40);if(!s)return 'Date TBA';
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(`${s}T12:00:00`));}catch(_){}}
    return s;
  }
  function releaseMarkup(s){
    const r=(Array.isArray(s.releases)?s.releases:[]).find(x=>x?.featured)||(s.releases||[])[0]||{};
    const title=safe(r.title||s.featured_release_title,140);
    const artwork=http(r.artwork_url||s.release_artwork_url);
    const urls=[
      ['Listen',r.listen_url||s.listen_url],['Spotify',s.spotify_url],['Apple Music',s.apple_music_url],
      ['YouTube',s.youtube_url],['SoundCloud',s.soundcloud_url],['Audiomack',s.audiomack_url],['Tidal',s.tidal_url]
    ].filter(x=>http(x[1]));
    if(!title&&!urls.length)return '';
    const links=urls.map(([label,u])=>`<a href="${esc(http(u))}" rel="noopener noreferrer" target="_blank">${esc(label)} ↗</a>`).join('');
    return section('Featured release','Music',`<div class="epk-release">${artwork?img(artwork,`${title} cover art`,''): '<span class="epk-art-placeholder" aria-hidden="true">♫</span>'}<div><strong>${esc(title||'Listen to the artist')}</strong><div class="epk-links">${links}</div></div></div>`);
  }
  function selectedMedia(settings){
  return (Array.isArray(settings.media_items)?settings.media_items:[])
    .filter(x=>x&&safe(x.title)&&http(x.url)&&x.visible!==false&&x.epk_include!==false)
    .filter(x=>!Array.isArray(settings.epk_media_ids)||settings.epk_media_ids.includes(x.id))
    .slice(0,4);
}
  function videoMarkup(settings){
  const video=selectedMedia(settings).find(x=>x.type==='video');
  if(!video)return '';
  const url=http(video.url);
  let embed='';
  try {
    const parsed=new URL(url),host=parsed.hostname.toLowerCase();
    let id='';
    if(host==='youtu.be')id=parsed.pathname.split('/')[1]||'';
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
      id=parsed.searchParams.get('v')||parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]||'';
    }
    if(/^[a-zA-Z0-9_-]{11}$/.test(id))embed='https://www.youtube-nocookie.com/embed/'+id+'?rel=0';
    if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
      id=parsed.pathname.match(/^\/(?:video\/)?(\d+)/)?.[1]||'';
      if(/^\d{6,12}$/.test(id))embed='https://player.vimeo.com/video/'+id;
    }
  }catch(_){}
  const stage=embed?`<div class="epk-video-stage"><button type="button" data-epk-embed="${esc(embed)}" aria-label="Play performance video"><span aria-hidden="true">▶</span><strong>Play performance video</strong><small>Video loads only when you press play</small></button></div>`:'';
  return `<div id="epk-watch">${section('Watch the artist','Performance footage',`<div class="epk-performance">${stage}<p class="epk-video-title">${esc(video.title)}</p><a class="epk-video-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch original video ↗</a></div>`)}</div>`;
}
  function otherReleases(settings){
  const items=(Array.isArray(settings.releases)?settings.releases:[]);
  const featured=items.find(x=>x?.featured)||items[0];
  const additional=items.filter(x=>x!==featured&&safe(x?.title)&&http(x?.listen_url)).slice(0,5);
  if(!additional.length)return '';
  return section('More music','Additional releases',`<div class="epk-more-music">${additional.map(item=>`<a href="${esc(http(item.listen_url))}" target="_blank" rel="noopener noreferrer">${img(item.artwork_url,`${item.title} artwork`,'epk-small-art')}<span>${esc(item.title)}</span><b>Listen ↗</b></a>`).join('')}</div>`);
}
  function heroActions(bookingHref,hasPerformance){
  if(!bookingHref&&!hasPerformance)return '';
  return `<div class="epk-hero-actions">${bookingHref?`<a class="epk-hero-cta" href="${esc(bookingHref)}">Book this artist ↗</a>`:''}${hasPerformance?'<a class="epk-hero-cta secondary" href="#epk-watch">Watch performance ↓</a>':''}</div>`;
}
  function mobileBooking(bookingHref){
  return bookingHref?`<a class="epk-mobile-book" href="${esc(bookingHref)}">Book this artist ↗</a>`:'';
}
  function wireVideoPlayback(host){
  host.querySelector('[data-epk-embed]')?.addEventListener('click',event=>{
    const button=event.currentTarget,source=button.dataset.epkEmbed;
    if(!source||!/^https:\/\/(?:www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(source))return;
    const frame=document.createElement('iframe');
    frame.src=source;
    frame.title='Artist performance video';
    frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.loading='lazy';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');
    button.replaceWith(frame);
  });
}
  function mediaMarkup(s){
    const media=selectedMedia(s);
    if(!media.length)return '';
    const tiles=media.map(x=>{
      const url=http(x.url),picture=x.type==='photo'&&http(x.url);
      return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${picture?img(picture,x.title,''):`<span class="epk-media-icon" aria-hidden="true">${x.type==='video'?'▶':x.type==='press'?'▤':x.type==='audio'?'♫':'↗'}</span>`}<strong>${esc(x.title)}</strong><small>${esc(x.type||'Media')}</small></a>`;
    }).join('');
    return section('Selected media','Photos · Video · Audio · Press',`<div class="epk-media">${tiles}</div>`);
  }
  function showsMarkup(s){
    const shows=(Array.isArray(s.shows)?s.shows:[]).filter(x=>x&&(safe(x.date)||safe(x.venue)||safe(x.city))).slice(0,4);
    if(!shows.length)return '';
    const rows=shows.map(x=>`<article class="epk-date"><time>${esc(date(x.date))}</time><div><strong>${esc(x.venue||'Live performance')}</strong>${x.city?`<small>${esc(x.city)}</small>`:''}${http(x.ticket_url)?`<a href="${esc(http(x.ticket_url))}" rel="noopener noreferrer" target="_blank">Event / ticket link ↗</a>`:''}</div></article>`).join('');
    return section('Live performances','Shows and events',rows);
  }
  function contactMarkup(card,s){
    const press=email(s.epk_press_email)||email(card.email);
    const booking=email(s.epk_booking_email)||email(card.email);
    const bookingUrl=http(s.booking_url);
    const website=http(card.website);
    const rows=[
      press?`<a href="mailto:${esc(press)}"><small>Press inquiries</small>${esc(press)}</a>`:'',
      booking?`<a href="mailto:${esc(booking)}"><small>Booking email</small>${esc(booking)}</a>`:'',
      bookingUrl?`<a href="${esc(bookingUrl)}" target="_blank" rel="noopener noreferrer"><small>Booking destination</small>Open booking link ↗</a>`:'',
      website?`<a href="${esc(website)}" target="_blank" rel="noopener noreferrer"><small>Official website</small>Visit website ↗</a>`:''
    ].filter(Boolean).join('');
    return section('Get in touch','Press and booking',rows?`<div class="epk-contact">${rows}</div>`:'');
  }
  function render(card,s){
    const name=safe(s.stage_name||card.full_name,120)||'Artist';
    const tagline=safe(s.epk_tagline||card.title||card.headline,160);
    const bio=safe(s.epk_bio||card.biography,1800);
    const highlights=safe(s.epk_highlights,600).split(/\r?\n/).map(x=>safe(x,180)).filter(Boolean).slice(0,6);
    const cover=http(card.cover_image_url),portrait=http(card.profile_image_url);
    const genre=safe(s.genre,80),locationText=safe(s.location,120);
    const bookingAddress=email(s.epk_booking_email)||email(card.email);
    const bookingHref=http(s.booking_url)||(bookingAddress?'mailto:'+bookingAddress:'');
    const hasPerformance=selectedMedia(s).some(x=>x.type==='video');
    const back=new URL('card.html',location.href);back.searchParams.set('slug',slug);
    const pressBio=section('About the artist','Biography',bio?`<p>${esc(bio)}</p>`:'');
    const achievement=section('Career highlights','Selected milestones',highlights.length?`<ul class="epk-highlights">${highlights.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'');
    document.title=`${name} | Official EPK · LIW Cards`;
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=safe(bio||tagline||`${name} professional press kit`,160);
    app.innerHTML=`
      <div class="epk-nav"><a class="epk-brand" href="${esc(back.href)}"><span class="epk-brand-mark">LIW</span><span>OFFICIAL ARTIST EPK</span></a>
        <div class="epk-nav-actions"><a class="epk-button" href="${esc(back.href)}">← Artist card</a><button type="button" class="epk-button" data-copy-link>Copy EPK link</button><button type="button" class="epk-button primary" data-save-pdf>Print / Save PDF</button></div>
      </div>
      <header class="epk-hero">${cover?img(cover,`${name} cover image`,'epk-cover'):''}
        <div class="epk-hero-inner">${portrait?img(portrait,`${name} artist portrait`,'epk-avatar'):`<div class="epk-avatar epk-initial" aria-hidden="true">${esc(name.slice(0,1).toUpperCase())}</div>`}
          <div><span class="epk-kicker">LIW • PROFESSIONAL ELECTRONIC PRESS KIT</span><h1>${esc(name)}</h1><p class="epk-meta">${esc([genre,locationText].filter(Boolean).join(' • '))}</p>${tagline?`<p class="epk-hero-desc">${esc(tagline)}</p>`:''}${heroActions(bookingHref,hasPerformance)}</div>
        </div>
      </header>
      <div class="epk-strip">${badge(genre)}${badge(locationText)}<span class="epk-chip">Showtime by LIW Cards</span></div>
      <div class="epk-layout"><div class="epk-main">${pressBio}${releaseMarkup(s)}${otherReleases(s)}${videoMarkup(s)}${mediaMarkup(s)}</div><aside class="epk-side">${achievement}${showsMarkup(s)}${contactMarkup(card,s)}</aside></div>
      <footer class="epk-footer">Electronic press kit powered by <a href="https://cards.liwworgs.com/" target="_blank" rel="noopener noreferrer">LIW Cards</a> • Artist-provided information</footer>
      ${mobileBooking(bookingHref)}
    `;
    loader.hidden=true;app.hidden=false;
    const publicShare=card.status==='published'&&s.epk_enabled===true;
    const copyButton=app.querySelector('[data-copy-link]');if(copyButton&&!publicShare){copyButton.disabled=true;copyButton.textContent='Publish to share';}
    app.querySelector('[data-save-pdf]')?.addEventListener('click',()=>window.print());
    wireVideoPlayback(app);
    app.querySelector('[data-copy-link]')?.addEventListener('click',async()=>{
      const b=app.querySelector('[data-copy-link]');
      const link=new URL(location.href);link.searchParams.delete('editor_preview');
      try{await navigator.clipboard.writeText(link.href);b.textContent='Link copied';}
      catch(_){b.textContent='Select the URL in your browser to copy';}
    });
  }
  async function load(){
    if(!slug)return notice('EPK not found','This press kit link does not contain an artist card address.');
    if(typeof window.supabase==='undefined'||typeof LIW_CONFIG==='undefined'||typeof supabaseClient==='undefined')return notice('Unable to load','The press kit service is currently unavailable.');
    try{
      let client=window.supabase.createClient(LIW_CONFIG.supabaseUrl,LIW_CONFIG.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      let result=await client.rpc('public_card_by_slug',{p_slug:slug});
      let card=one(result.data);
      if(result.error||!card||card.status!=='published'){
        if(!preview)return notice('EPK unavailable','This artist card is unpublished, private, or unavailable.');
        const auth=await supabaseClient.auth.getUser();
        if(!auth.data?.user)return notice('Owner preview only','Sign in as this artist card’s owner and open the EPK from the editor.');
        client=supabaseClient;
        result=await client.rpc('public_card_by_slug',{p_slug:slug});card=one(result.data);
        if(result.error||!card)return notice('Preview unavailable','You do not have permission to preview this artist card.');
      }
      if(safe(card.card_experience,30).toLowerCase()!=='music')return notice('EPK unavailable','This card is not using the Showtime experience.');
      const artist=await client.rpc('public_artist_settings_by_slug',{p_slug:slug});
      if(artist.error)throw artist.error;
      const s=one(artist.data)||{};
      if(s.epk_enabled!==true&&!preview)return notice('EPK not published','This artist has not enabled their public press kit yet.');
      render(card,s);
    }catch(error){
      console.warn('[LIW Native EPK] unavailable',error);
      notice('Press kit unavailable','We could not load this EPK. Please return to the artist card and try again.');
    }
  }
  load();
})();
