/* LIW Cards staging — Artist Hub fan-first professional composition.
   Music-only, no document-wide observer. Reuses the real room buttons and LIW follow RPCs. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_ARTIST_HUB_V3__)return;
  window.__LIW_MUSIC_ARTIST_HUB_V3__=true;

  const FOLLOW_STORAGE='liw_artist_follower_key_v1';
  const PRIMARY=['music','videos','shows','merch','fan_club','social'];
  const SECONDARY=['gallery','book','epk'];
  const LABEL_TO_KEY={music:'music',videos:'videos',shows:'shows',merch:'merch',gallery:'gallery','fan club':'fan_club','inner circle':'fan_club',epk:'epk','book me':'book',social:'social'};
  let settings=null;
  let settingsPromise=null;
  let followerKeyMemory='';
  let mounting=false;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function slug(){return safe(data()?.slug||new URLSearchParams(location.search).get('slug'),160);}

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
      }catch(error){console.warn('[LIW Artist Hub] settings unavailable',error);settings={};}
      return settings;
    })();
    return settingsPromise;
  }

  function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));}
  function makeUuid(){
    try{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();}catch(_){ }
    const bytes=new Uint8Array(16);try{globalThis.crypto.getRandomValues(bytes);}catch(_){for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);}
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

  function tileKey(tile){
    if(!tile)return '';
    const stored=safe(tile.dataset.artistHubKey,40);if(stored)return stored;
    const key=LABEL_TO_KEY[safe(tile.querySelector('strong')?.textContent,40).toLowerCase()]||'';
    if(key)tile.dataset.artistHubKey=key;return key;
  }
  function allTiles(){return [...document.querySelectorAll('#card.music-card-active .music-luxe-tile')];}

  function navGroups(){
    const launcher=document.querySelector('#card.music-card-active .music-luxe-launcher');
    const grid=launcher?.querySelector('.music-luxe-grid');if(!launcher||!grid)return false;
    const map=new Map();allTiles().forEach(tile=>{const key=tileKey(tile);if(key)map.set(key,tile);});

    let primaryTitle=launcher.querySelector('.music-hub-nav-title');
    if(!primaryTitle){primaryTitle=document.createElement('span');primaryTitle.className='music-hub-nav-title';primaryTitle.textContent='Explore the artist';launcher.insertBefore(primaryTitle,grid);}
    PRIMARY.forEach(key=>{const tile=map.get(key);if(tile&&tile.parentNode!==grid)grid.appendChild(tile);});

    let more=launcher.querySelector('.music-hub-more');
    if(!more){
      more=document.createElement('section');more.className='music-hub-more';more.innerHTML='<span class="music-hub-more-title">More from the artist</span><div class="music-hub-more-grid"></div>';launcher.appendChild(more);
    }
    const moreGrid=more.querySelector('.music-hub-more-grid');
    SECONDARY.forEach(key=>{const tile=map.get(key);if(tile&&tile.parentNode!==moreGrid)moreGrid.appendChild(tile);});
    more.hidden=!moreGrid.children.length;

    const fan=map.get('fan_club');if(fan){const label=fan.querySelector('strong');if(label)label.textContent='Inner Circle';fan.dataset.artistHubKey='fan_club';}
    const merch=map.get('merch');if(merch){
      merch.querySelector('.music-hub-tile-badge')?.remove();
      const products=[...document.querySelectorAll('#products .public-product-card')].filter(node=>safe(node.textContent));
      if(products.length){const badge=document.createElement('span');badge.className='music-hub-tile-badge';badge.textContent=products.length>1?`${products.length} ITEMS`:'NEW DROP';merch.appendChild(badge);}
    }
    return true;
  }

  function configuredReleaseTitle(){return safe(settings?.featured_release_title,140);}
  function hasAudio(){return Boolean(safe(settings?.spotify_url)||safe(settings?.soundcloud_url)||safe(settings?.listen_url)||safe(settings?.apple_music_url)||safe(settings?.audiomack_url)||safe(settings?.tidal_url));}
  function usefulHeadline(){
    const value=safe(data()?.headline,180);if(!value)return '';
    const normalized=value.toLowerCase().replace(/["'“”]/g,'').trim();
    if(['latest release','new release','featured release'].includes(normalized))return '';
    return value;
  }

  function identityPolish(){
    const copy=document.querySelector('#card.music-card-active .music-identity-copy');if(!copy)return false;
    let tag=copy.querySelector('.music-hub-tagline');if(!tag){tag=document.createElement('p');tag.className='music-hub-tagline';copy.appendChild(tag);}
    const release=configuredReleaseTitle();const genre=safe(settings?.genre,80);const custom=usefulHeadline();
    let text=custom;
    if(!text&&release)text=[genre?`${genre} artist`:'',`“${release}” out now`].filter(Boolean).join(' • ');
    tag.textContent=text;tag.hidden=!text;
    return true;
  }

  function releasePolish(){
    const card=document.querySelector('#card.music-card-active .music-release-card');if(!card)return false;
    card.classList.add('music-hub-release');
    const release=configuredReleaseTitle();const playable=hasAudio();
    card.classList.toggle('music-hub-no-release',!release&&!playable);
    if(!release&&!playable)return true;
    const small=card.querySelector('.music-release-copy small');if(small)small.textContent='FEATURED MUSIC · PLAY ON LIW';
    const strong=card.querySelector('.music-release-copy strong');if(strong)strong.textContent=release||'Featured music';
    const play=card.querySelector('.music-release-play');if(play){play.innerHTML=icon('play',18);play.setAttribute('aria-label','Play featured music on LIW');}
    let providers=card.querySelector('.music-hub-release-providers');
    const names=[];if(safe(settings?.spotify_url))names.push('Spotify');if(safe(settings?.soundcloud_url))names.push('SoundCloud');if(!names.length&&safe(settings?.apple_music_url))names.push('Apple Music');
    if(names.length){if(!providers){providers=document.createElement('span');providers.className='music-hub-release-providers';card.querySelector('.music-release-copy')?.appendChild(providers);}providers.textContent=names.join(' + ');}
    else providers?.remove();
    return true;
  }

  function innerCirclePolish(){
    const node=document.querySelector('#card.music-card-active .music-inner-circle');if(!node)return false;
    const strong=node.querySelector('.music-inner-copy strong');if(strong)strong.textContent=safe(settings?.inner_circle_label,90)||'Join the Inner Circle';
    const small=node.querySelector('.music-inner-copy small');if(small)small.textContent='Exclusive drops, presales & artist updates.';
    const button=node.querySelector('.music-inner-action button');if(button)button.textContent='JOIN';
    return true;
  }

  function showPolish(){
    const show=document.querySelector('#card.music-card-active .music-upcoming-show');if(!show)return false;
    const small=show.querySelector('.music-show-copy small');if(small)small.textContent='NEXT SHOW';
    const link=show.querySelector('.music-show-link');if(link)link.textContent=safe(settings?.ticket_url)?'GET TICKETS':'VIEW DATES';
    const count=[...document.querySelectorAll('#services .public-service-card,#services > *')].filter(el=>safe(el.textContent)).length;
    let more=show.querySelector('.music-hub-more-shows');
    if(count>1){if(!more){more=document.createElement('em');more.className='music-hub-more-shows';show.querySelector('.music-show-copy')?.appendChild(more);}more.textContent=`+ ${count-1} more ${count-1===1?'date':'dates'}`;}
    else more?.remove();
    return true;
  }

  function buildFollow(){
    const copy=document.querySelector('#card.music-card-active .music-identity-copy');if(!copy)return null;
    let node=copy.querySelector('.music-hub-follow');if(node)return node;
    node=document.createElement('div');node.className='music-hub-follow';node.dataset.following='false';
    node.innerHTML=`<button type="button" class="music-hub-follow-btn" aria-pressed="false">${icon('user-plus',14)}<span class="music-hub-follow-label">Follow on LIW</span><span class="music-hub-follow-divider">·</span><span class="music-hub-follow-number" data-hub-follow-count>0</span></button>`;
    node.querySelector('button').addEventListener('click',async()=>{
      if(node.dataset.loading==='true')return;node.dataset.loading='true';const button=node.querySelector('button');button.disabled=true;
      try{paintFollow(node,await setFollow(node.dataset.following!=='true'));syncSocialFollow();}
      catch(error){console.warn('[LIW Artist Hub] follow update failed',error);}
      finally{node.dataset.loading='false';button.disabled=false;}
    });
    copy.appendChild(node);return node;
  }
  function paintFollow(node,state){
    if(!node)return;node.dataset.following=state.following?'true':'false';
    const button=node.querySelector('.music-hub-follow-btn');const label=node.querySelector('.music-hub-follow-label');const count=node.querySelector('[data-hub-follow-count]');
    if(button){button.setAttribute('aria-pressed',state.following?'true':'false');button.classList.toggle('is-following',state.following);}
    if(label)label.textContent=state.following?'Following ✓':'Follow on LIW';if(count)count.textContent=formatCount(state.count);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  async function refreshFollow(){const node=buildFollow();if(!node)return;try{paintFollow(node,await followStatus());}catch(error){console.warn('[LIW Artist Hub] follow status failed',error);}}
  function syncSocialFollow(){
    const front=document.querySelector('.music-hub-follow');const social=document.querySelector('.music-liw-follow');if(!front||!social)return;
    const n=front.querySelector('[data-hub-follow-count]')?.textContent||'0';const target=social.querySelector('[data-liw-follow-count]');if(target)target.textContent=`${n} ${n==='1'?'follower':'followers'}`;
  }

  function removeOldProof(){document.querySelectorAll('#card.music-card-active .music-hub-proof').forEach(node=>node.remove());}

  async function mount(){
    if(mounting||!isMusic())return false;
    const card=document.querySelector('#card.music-card-active');const launcher=card?.querySelector('.music-luxe-launcher');const identity=card?.querySelector('.music-identity-row');
    if(!card||card.hidden||!launcher||!identity)return false;
    mounting=true;
    try{
      await loadSettings();
      card.classList.remove('music-artist-hub-v2');card.classList.add('music-artist-hub-v3');
      removeOldProof();identityPolish();releasePolish();navGroups();innerCirclePolish();showPolish();await refreshFollow();
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
      return true;
    }finally{mounting=false;}
  }

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    if(event.target?.closest?.('.music-luxe-tile'))setTimeout(()=>{navGroups();syncSocialFollow();},90);
  },true);

  let attempts=0;const timer=setInterval(()=>{attempts+=1;mount().then(done=>{if(done||attempts>=50)clearInterval(timer);}).catch(()=>{if(attempts>=50)clearInterval(timer);});},100);
  setTimeout(()=>mount().catch(()=>{}),0);
})();
