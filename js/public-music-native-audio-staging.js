(function(){
  'use strict';
  if(window.__LIW_PUBLIC_MUSIC_NATIVE_AUDIO__)return;
  window.__LIW_PUBLIC_MUSIC_NATIVE_AUDIO__=true;

  let audio=null;
  let settings={};
  let ready=false;
  let playing=false;
  let loaded=false;
  let loading=false;

  function safe(value,max=2000){return String(value??'').trim().slice(0,max);}
  function isMusic(){return document.body.classList.contains('music-page-active')||document.getElementById('card')?.classList.contains('music-card-active');}
  function controls(){return {cta:document.querySelector('.music-primary-cta'),release:document.querySelector('.music-release-card')};}
  function iconMarkup(name,size=19){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function refreshIcons(){if(window.lucide)try{lucide.createIcons();}catch(_){ }}
  function ensureStyles(){
    if(document.getElementById('liw-public-music-native-audio-style'))return;
    const style=document.createElement('style');style.id='liw-public-music-native-audio-style';
    style.textContent=`
      .music-card-active.music-audio-ready .music-primary-cta,.music-card-active.music-audio-ready .music-release-card{cursor:pointer}
      .music-card-active.music-audio-playing .music-primary-cta{box-shadow:inset 0 1px 0 rgba(255,255,255,.34),0 0 0 2px rgba(174,86,255,.13),0 12px 34px rgba(91,42,237,.42),0 0 38px rgba(126,58,255,.28)!important}
      .music-card-active.music-audio-playing .music-waveform span{animation:liwMusicWave .72s ease-in-out infinite alternate;animation-delay:calc(var(--wave-index,0)*-24ms)}
      .music-card-active.music-audio-playing .music-release-play{background:linear-gradient(135deg,#9a2cff,#395eff)!important;border-color:rgba(213,177,255,.7)!important;box-shadow:0 0 20px rgba(122,65,255,.35)!important}
      .music-native-progress{position:absolute;left:0;bottom:0;height:2px;width:var(--music-progress,0%);background:linear-gradient(90deg,#c23fff,#3e7cff);box-shadow:0 0 8px rgba(120,65,255,.45);transition:width .15s linear;pointer-events:none}
      .music-release-card{position:relative;overflow:hidden}
      @keyframes liwMusicWave{from{transform:scaleY(.42);opacity:.62}to{transform:scaleY(1.08);opacity:1}}
      @media(prefers-reduced-motion:reduce){.music-card-active.music-audio-playing .music-waveform span{animation:none!important}}
    `;
    document.head.appendChild(style);
  }
  function syncUi(){
    const card=document.getElementById('card');const {cta,release}=controls();
    card?.classList.toggle('music-audio-ready',ready);card?.classList.toggle('music-audio-playing',playing);
    if(cta){
      const label=ready?(playing?'PAUSE':'LISTEN NOW'):'STREAM MUSIC';
      cta.innerHTML=`${iconMarkup(playing?'pause':'play',19)}<span>${label}</span>`;
      cta.setAttribute('aria-pressed',playing?'true':'false');
      cta.title=ready?'Play or pause the artist preview':'Open streaming options';
    }
    const play=release?.querySelector('.music-release-play');if(play)play.innerHTML=iconMarkup(playing?'pause':'play',19);
    if(release&&!release.querySelector('.music-native-progress')){const p=document.createElement('span');p.className='music-native-progress';release.appendChild(p);}
    refreshIcons();
  }
  function updateProgress(){
    const release=controls().release;if(!release||!audio)return;
    const pct=Number.isFinite(audio.duration)&&audio.duration>0?Math.min(100,(audio.currentTime/audio.duration)*100):0;
    release.style.setProperty('--music-progress',`${pct}%`);
  }
  async function toggle(){
    if(!audio||!ready)return false;
    try{if(audio.paused)await audio.play();else audio.pause();return true;}
    catch(error){console.warn('[LIW Music] native audio playback failed',error);return false;}
  }
  async function load(){
    if(loaded||loading||typeof supabaseClient==='undefined'||!supabaseClient)return;
    const slug=safe(new URLSearchParams(location.search).get('slug'),160);if(!slug)return;
    loading=true;
    try{
      const {data,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
      if(error)throw error;settings=data&&typeof data==='object'?data:{};
      const src=safe(settings.audio_preview_url);ready=Boolean(src);
      if(ready){
        audio=new Audio();audio.preload='metadata';audio.src=src;audio.playsInline=true;
        audio.addEventListener('play',()=>{playing=true;syncUi();});
        audio.addEventListener('pause',()=>{playing=false;syncUi();});
        audio.addEventListener('ended',()=>{playing=false;audio.currentTime=0;updateProgress();syncUi();});
        audio.addEventListener('timeupdate',updateProgress);audio.addEventListener('loadedmetadata',updateProgress);
      }
    }catch(error){console.warn('[LIW Music] native audio settings unavailable',error);ready=false;}
    finally{loaded=true;loading=false;syncUi();}
  }
  function intercept(event){
    if(!isMusic()||!ready)return;
    const target=event.target.closest?.('.music-primary-cta,.music-release-card');if(!target)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();toggle();
  }
  function assignWaveIndexes(){document.querySelectorAll('.music-waveform span').forEach((bar,index)=>bar.style.setProperty('--wave-index',index));}

  ensureStyles();document.addEventListener('click',intercept,true);
  let tries=0;const timer=setInterval(()=>{
    tries+=1;
    if(isMusic()){
      assignWaveIndexes();syncUi();
      if(!loaded&&!loading)load();
      if(tries>10&&loaded&&document.querySelector('.music-primary-cta'))clearInterval(timer);
    }
    if(tries>80)clearInterval(timer);
  },250);
  load();
})();
