/* LIW Cards staging — Artist Hub 2.0 front-of-card experience.
   Music-only, event/poll driven, no document-wide observers. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_ARTIST_HUB_V2__)return;
  window.__LIW_MUSIC_ARTIST_HUB_V2__=true;

  const FOLLOW_STORAGE='liw_artist_follower_key_v1';
  const FAN_FIRST=['music','videos','shows','merch','fan_club','social','gallery','book','epk'];
  const LABEL_TO_KEY={music:'music',videos:'videos',shows:'shows',merch:'merch',gallery:'gallery','fan club':'fan_club','inner circle':'fan_club',epk:'epk','book me':'book',social:'social'};
  let settings=null;
  let settingsPromise=null;
  let followerKeyMemory='';
  let mounting=false;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
  function icon(name,size=17){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function slug(){return safe(data()?.slug||new URLSearchParams(location.search).get('slug'),160);}
  function artistName(){return safe(document.getElementById('name')?.textContent||data()?.full_name||'Artist',120)||'Artist';}

  async function loadSettings(){
    if(settings)return settings;
    if(settingsPromise)return settingsPromise;
    settingsPromise=(async()=>{
      const cardSlug=slug();
      if(!cardSlug||typeof supabaseClient==='undefined')return {};
      try{
        const {data:row,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:cardSlug});
        if(error)throw error;
        settings=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
      }catch(error){console.warn('[LIW Artist Hub v2] settings unavailable',error);settings={};}
      return settings;
    })();
    return settingsPromise;
  }

  function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));}
  function makeUuid(){
    try{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();}catch(_){ }
    const bytes=new Uint8Array(16);
    try{globalThis.crypto.getRandomValues(bytes);}catch(_){for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);}
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  function followerKey(){
    if(validUuid(followerKeyMemory))return followerKeyMemory;
    try{const saved=localStorage.getItem(FOLLOW_STORAGE);if(validUuid(saved)){followerKeyMemory=saved;return saved;}}catch(_){ }
    followerKeyMemory=makeUuid();try{localStorage.setItem(FOLLOW_STORAGE,followerKeyMemory);}catch(_){ }
    return followerKeyMemory;
  }
  function first(row){return Array.isArray(row)?row[0]||{}:row||{};}
  function formatCount(value){const n=Math.max(0,Number(value)||0);try{return new Intl.NumberFormat().format(n);}catch(_){return String(n);}}

  async function followStatus(){
    if(typeof supabaseClient==='undefined'||!slug())return {following:false,count:0};
    const {data:row,error}=await supabaseClient.rpc('public_artist_follow_status',{p_slug:slug(),p_follower_key:followerKey()});
    if(error)throw error;const result=first(row);return {following:result.following===true,count:Number(result.follower_count)||0};
  }
  async function setFollow(value){
    if(typeof supabaseClient==='undefined'||!slug())throw new Error('Follow service unavailable');
    const {data:row,error}=await supabaseClient.rpc('public_artist_follow_set',{p_slug:slug(),p_follower_key:followerKey(),p_follow:Boolean(value)});
    if(error)throw error;const result=first(row);return {following:result.following===true,count:Number(result.follower_count)||0};
  }

  function roomKey(tile){return LABEL_TO_KEY[safe(tile?.querySelector('strong')?.textContent,40).toLowerCase()]||'';}
  function tiles(){return [...document.querySelectorAll('#card.music-card-active .music-luxe-grid > .music-luxe-tile')];}
  function tileByKey(key){return tiles().find(node=>roomKey(node)===key)||null;}

  function reorderTiles(){
    const grid=document.querySelector('#card.music-card-active .music-luxe-grid');if(!grid)return false;
    const map=new Map();tiles().forEach(node=>{const key=roomKey(node);if(key)map.set(key,node);});
    FAN_FIRST.forEach(key=>{const node=map.get(key);if(node)grid.appendChild(node);});
    const fan=map.get('fan_club');if(fan){const strong=fan.querySelector('strong');if(strong)strong.textContent='Inner Circle';fan.dataset.artistHubRoom='fan_club';}
    const merch=map.get('merch');if(merch){
      merch.querySelector('.music-hub-tile-badge')?.remove();
      const products=[...document.querySelectorAll('#products .public-product-card,#products > *')].filter(el=>safe(el.textContent));
      if(products.length){const badge=document.createElement('span');badge.className='music-hub-tile-badge';badge.textContent=products.length>1?`${products.length} ITEMS`:'NEW DROP';merch.appendChild(badge);}
    }
    return true;
  }

  function releaseTitle(){return safe(settings?.featured_release_title||data()?.video_title||data()?.headline||'Latest Release',140);}
  function genre(){return safe(settings?.genre,80);}
  function identityTagline(){
    const custom=safe(data()?.headline,180);
    if(custom&&custom.toLowerCase()!==releaseTitle().toLowerCase())return custom;
    const parts=[];if(genre())parts.push(`${genre()} artist`);if(releaseTitle())parts.push(`“${releaseTitle()}” out now`);return parts.join(' • ');
  }

  function buildTagline(){
    const row=document.querySelector('#card.music-card-active .music-identity-row');if(!row)return false;
    const copy=row.querySelector('.music-identity-copy')||row;
    let node=copy.querySelector('.music-hub-tagline');if(!node){node=document.createElement('p');node.className='music-hub-tagline';copy.appendChild(node);}
    node.textContent=identityTagline();node.hidden=!node.textContent;return true;
  }

  function releasePolish(){
    const card=document.querySelector('#card.music-card-active .music-release-card');if(!card)return false;
    card.classList.add('music-hub-release');
    const small=card.querySelector('.music-release-copy small');if(small)small.textContent='FEATURED RELEASE · PLAY ON LIW';
    const play=card.querySelector('.music-release-play');if(play){play.innerHTML=icon('play',18);play.setAttribute('aria-label','Play featured release on LIW');}
    let providers=card.querySelector('.music-hub-release-providers');
    if(!providers){
      const names=[];if(safe(settings?.spotify_url))names.push('Spotify');if(safe(settings?.soundcloud_url))names.push('SoundCloud');
      if(names.length){providers=document.createElement('span');providers.className='music-hub-release-providers';providers.textContent=names.join(' + ');card.querySelector('.music-release-copy')?.appendChild(providers);}
    }
    return true;
  }

  function showDateText(){
    const raw=safe(settings?.upcoming_show_date,40);if(!raw)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(`${raw}T12:00:00`));}catch(_){ }}
    return raw;
  }
  function showCount(){return [...document.querySelectorAll('#services .public-service-card,#services > *')].filter(el=>safe(el.textContent)).length;}
  function polishShow(){
    const show=document.querySelector('#card.music-card-active .music-upcoming-show');if(!show)return false;
    show.classList.add('music-hub-next-show');
    const small=show.querySelector('.music-show-copy small');if(small)small.textContent='NEXT SHOW';
    const link=show.querySelector('.music-show-link');if(link)link.textContent=safe(settings?.ticket_url)?'GET TICKETS':'VIEW DATES';
    let more=show.querySelector('.music-hub-more-shows');const count=showCount();
    if(count>1&&!more){more=document.createElement('em');more.className='music-hub-more-shows';more.textContent=`+ ${count-1} more ${count-1===1?'date':'dates'}`;show.querySelector('.music-show-copy')?.appendChild(more);}
    return true;
  }

  function polishInnerCircle(){
    const node=document.querySelector('#card.music-card-active .music-inner-circle');if(!node)return false;
    node.classList.add('music-hub-inner-circle');
    const strong=node.querySelector('.music-inner-copy strong');if(strong&&!safe(settings?.inner_circle_label))strong.textContent='Join the Inner Circle';
    const small=node.querySelector('.music-inner-copy small');if(small)small.textContent='Exclusive drops, presales & artist updates.';
    const ghost=node.querySelector('.music-inner-action > span');if(ghost)ghost.textContent='Stay close to the artist';
    const button=node.querySelector('.music-inner-action button');if(button)button.textContent='JOIN';
    return true;
  }

  function buildFollow(){
    const row=document.querySelector('#card.music-card-active .music-identity-row');if(!row)return null;
    const copy=row.querySelector('.music-identity-copy')||row;
    let node=copy.querySelector('.music-hub-follow');
    if(node)return node;
    node=document.createElement('div');node.className='music-hub-follow';node.dataset.following='false';
    node.innerHTML=`<button type="button" class="music-hub-follow-btn" aria-pressed="false">${icon('user-plus',15)} <span>Follow on LIW</span></button><span class="music-hub-follow-count"><b data-hub-follow-count>0</b> followers</span>`;
    node.querySelector('button').addEventListener('click',async()=>{
      if(node.dataset.loading==='true')return;node.dataset.loading='true';const btn=node.querySelector('button');btn.disabled=true;
      try{paintFollow(node,await setFollow(node.dataset.following!=='true'));syncSocialFollow();}
      catch(error){console.warn('[LIW Artist Hub v2] follow update failed',error);}
      finally{node.dataset.loading='false';btn.disabled=false;}
    });
    copy.appendChild(node);return node;
  }
  function paintFollow(node,state){
    if(!node)return;node.dataset.following=state.following?'true':'false';
    const btn=node.querySelector('.music-hub-follow-btn');const count=node.querySelector('[data-hub-follow-count]');
    if(btn){btn.setAttribute('aria-pressed',state.following?'true':'false');btn.classList.toggle('is-following',state.following);btn.innerHTML=state.following?`${icon('check',15)} <span>Following ✓</span>`:`${icon('user-plus',15)} <span>Follow on LIW</span>`;}
    if(count)count.textContent=formatCount(state.count);updateProofCount(state.count);if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  async function refreshFollow(){const node=buildFollow();if(!node)return;try{paintFollow(node,await followStatus());}catch(error){console.warn('[LIW Artist Hub v2] follow status failed',error);}}
  function syncSocialFollow(){
    const social=document.querySelector('.music-liw-follow');if(!social)return;
    const front=document.querySelector('.music-hub-follow');if(!front)return;
    const count=front.querySelector('[data-hub-follow-count]')?.textContent||'0';
    const target=social.querySelector('[data-liw-follow-count]');if(target)target.textContent=`${count} ${count==='1'?'follower':'followers'}`;
  }

  function buildProof(){
    const release=document.querySelector('#card.music-card-active .music-release-card');if(!release)return null;
    let node=document.querySelector('#card.music-card-active .music-hub-proof');if(node)return node;
    node=document.createElement('section');node.className='music-hub-proof';node.setAttribute('aria-label','Artist activity');
    const show=showDateText();
    node.innerHTML=`<span>${icon('heart',14)} <b data-hub-proof-followers>0</b> LIW followers</span><span>${icon('calendar-days',14)} ${show?esc(show):'Shows'}</span><span>${icon('disc-3',14)} New release</span>`;
    release.insertAdjacentElement('beforebegin',node);if(window.lucide)try{lucide.createIcons();}catch(_){ }return node;
  }
  function updateProofCount(count){const el=document.querySelector('[data-hub-proof-followers]');if(el)el.textContent=formatCount(count);}

  async function mount(){
    if(mounting||!isMusic())return false;
    const card=document.querySelector('#card.music-card-active');const launcher=card?.querySelector('.music-luxe-launcher');const identity=card?.querySelector('.music-identity-row');
    if(!card||card.hidden||!launcher||!identity)return false;
    mounting=true;
    try{
      await loadSettings();
      card.classList.add('music-artist-hub-v2');
      buildTagline();reorderTiles();releasePolish();polishInnerCircle();polishShow();buildProof();await refreshFollow();
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
      return true;
    }finally{mounting=false;}
  }

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    if(event.target?.closest?.('.music-luxe-tile'))setTimeout(()=>{reorderTiles();syncSocialFollow();},100);
  },true);

  let attempt=0;const timer=setInterval(()=>{attempt+=1;mount().then(done=>{if(done||attempt>=50)clearInterval(timer);}).catch(()=>{if(attempt>=50)clearInterval(timer);});},100);
  setTimeout(()=>mount().catch(()=>{}),0);
})();
