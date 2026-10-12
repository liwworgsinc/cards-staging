/* LIW Cards staging — Super Studio public completion layer.
   Uses the exact saved Super Studio state to finish public-only presentation reliably. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PUBLIC_ENHANCEMENTS__)return;
  window.__LIW_SUPER_STUDIO_PUBLIC_ENHANCEMENTS__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let lastCardId='';

  function client(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||null;}
  }

  function depositLabel(meta){
    if(!meta||meta.depositType==='none'||!meta.depositType)return '';
    const raw=String(meta.depositValue||'').trim();
    if(meta.depositType==='percent')return raw?`Deposit: ${raw.replace(/%$/,'')}%`:'Percentage deposit required';
    if(meta.depositType==='flat')return raw?`Deposit: ${raw.startsWith('$')?raw:`$${raw}`}`:'Deposit required';
    return '';
  }

  function setVideoPlaying(root,video,playing){
    root.classList.toggle('ss-hero-video-playing',!!playing);
    const fallback=q('.ss-hero-video-poster',root);
    if(fallback)fallback.style.opacity=playing?'0':'';
    const play=q('.ss-video-play-toggle',root);
    if(play)play.classList.toggle('is-visible',!playing);
    if(video)video.dataset.ssPublicVideoState=playing?'playing':'waiting';
  }

  function ensureVideo(host,data){
    const url=String(data?.videoCoverUrl||'').trim();
    if(!url)return true;
    const root=q('.super-studio-experience',host);
    const hero=q('.ss-hero',root);
    if(!root||!hero)return false;

    let video=q('.ss-hero-video',hero);
    if(!video){
      video=document.createElement('video');
      video.className='ss-hero-video';
      const shade=q('.ss-hero-shade',hero);
      if(shade)hero.insertBefore(video,shade);else hero.prepend(video);
    }

    video.muted=true;
    video.defaultMuted=true;
    video.loop=true;
    video.playsInline=true;
    video.autoplay=true;
    video.preload='auto';
    video.controls=false;
    video.setAttribute('muted','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('autoplay','');
    video.setAttribute('loop','');
    video.setAttribute('preload','auto');

    const profile=q('.ss-avatar img',root)?.src||'';
    if(profile&&!video.poster)video.poster=profile;

    const current=String(video.currentSrc||video.getAttribute('src')||'').trim();
    if(current!==url){
      video.setAttribute('src',url);
      video.removeAttribute('hidden');
      try{video.load();}catch(_){}
    }

    if(video.dataset.ssPublicVideoWired!=='true'){
      video.dataset.ssPublicVideoWired='true';
      video.addEventListener('playing',()=>setVideoPlaying(root,video,true));
      video.addEventListener('loadeddata',()=>{
        video.removeAttribute('hidden');
        try{const p=video.play();if(p&&typeof p.catch==='function')p.catch(()=>setVideoPlaying(root,video,false));}catch(_){setVideoPlaying(root,video,false);}
      });
      video.addEventListener('canplay',()=>{
        video.removeAttribute('hidden');
        try{const p=video.play();if(p&&typeof p.catch==='function')p.catch(()=>setVideoPlaying(root,video,false));}catch(_){setVideoPlaying(root,video,false);}
      });
      video.addEventListener('error',()=>setVideoPlaying(root,video,false));
    }

    video.removeAttribute('hidden');
    try{
      const play=video.play();
      if(play&&typeof play.then==='function')play.then(()=>setVideoPlaying(root,video,true)).catch(()=>setVideoPlaying(root,video,false));
    }catch(_){setVideoPlaying(root,video,false);}

    return String(video.getAttribute('src')||'').trim()===url;
  }

  function beforeAfterMarkup(pairs){
    return pairs.map((item,index)=>`<article class="ss-ba" data-ss-public-ba="${index}">
      <div class="ss-ba-stage">
        <img src="${esc(item.beforeUrl)}" alt="Before">
        <div class="ss-ba-after"><img src="${esc(item.afterUrl)}" alt="After"></div>
        <span class="ss-ba-label before">Before</span><span class="ss-ba-label after">After</span>
      </div>
      <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
    </article>`).join('');
  }

  function wireBeforeAfter(section){
    qa('.ss-ba',section).forEach(card=>{
      if(card.dataset.ssBaWired==='true')return;
      card.dataset.ssBaWired='true';
      const range=q('input[type="range"]',card),after=q('.ss-ba-after',card);
      const sync=()=>{if(after&&range)after.style.clipPath=`inset(0 0 0 ${range.value}%)`;};
      range?.addEventListener('input',sync);
      sync();
    });
  }

  function ensureBeforeAfter(host,data){
    const pairs=(Array.isArray(data?.beforeAfter)?data.beforeAfter:[]).filter(item=>item?.beforeUrl&&item?.afterUrl);
    if(!pairs.length)return true;
    const root=q('.super-studio-experience',host);
    const work=q('.ss-app-screen[data-ss-screen="work"]',root);
    if(!root||!work)return false;

    let list=q('.ss-ba-list',root);
    let section=list?.closest('.ss-section')||null;
    if(!section){
      section=document.createElement('section');
      section.className='ss-section ss-before-after-section';
      section.dataset.ssSection='work-transformations';
      section.innerHTML=`<div class="ss-section-head"><div><span>Transformations</span><h2>Before &amp; After</h2></div><small>${pairs.length} transformation${pairs.length===1?'':'s'}</small></div><div class="ss-ba-list">${beforeAfterMarkup(pairs)}</div>`;
      list=q('.ss-ba-list',section);
    }else if(!list.children.length){
      list.innerHTML=beforeAfterMarkup(pairs);
    }

    if(section.parentElement!==work)work.appendChild(section);
    qa('.ss-work-empty',work).forEach(node=>node.remove());
    wireBeforeAfter(section);
    return !!q('.ss-ba-list',work);
  }

  function apply(data){
    const host=q('#super-studio-public');
    if(!host||!data)return false;

    const hours=String(data.studioInfo?.hours||'').trim();
    const info=q('.ss-info > div',host);
    if(hours&&info&&!q('[data-ss-public-hours]',info)){
      const row=document.createElement('p');
      row.dataset.ssPublicHours='true';
      row.innerHTML=`<strong>Hours:</strong> ${esc(hours)}`;
      info.prepend(row);
    }

    const metas=Array.isArray(data.serviceMeta)?data.serviceMeta:[];
    qa('.ss-service-card',host).forEach((card,index)=>{
      if(q('[data-ss-public-deposit]',card))return;
      const name=String(q('h3',card)?.textContent||'').trim();
      const meta=metas.find(item=>String(item?.serviceName||'').trim().toLowerCase()===name.toLowerCase())||metas[index];
      const label=depositLabel(meta);
      if(!label)return;
      const bottom=q('.ss-service-bottom',card);
      if(!bottom)return;
      const note=document.createElement('small');
      note.dataset.ssPublicDeposit='true';
      note.textContent=label;
      note.style.display='block';
      note.style.gridColumn='1 / -1';
      note.style.color='#667085';
      note.style.fontSize='.56rem';
      bottom.insertAdjacentElement('afterend',note);
    });

    const videoReady=ensureVideo(host,data);
    const workReady=ensureBeforeAfter(host,data);
    return videoReady&&workReady;
  }

  async function load(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio')return;
    if(lastCardId===card.id&&q('[data-ss-public-enhanced]'))return;
    const c=client();if(!c)return;
    try{
      const {data,error}=await c.from('super_studio_state_staging').select('data').eq('card_id',card.id).maybeSingle();
      if(error)throw error;
      const state=data?.data||{};
      let tries=0;
      const timer=setInterval(()=>{
        tries+=1;
        if(apply(state)){
          lastCardId=card.id;
          q('#super-studio-public')?.setAttribute('data-ss-public-enhanced','true');
          clearInterval(timer);
        }else if(tries>60)clearInterval(timer);
      },100);
    }catch(error){console.warn('Super Studio public enhancement load:',error);}
  }

  document.addEventListener('liw:public-card-rendered',event=>void load(event.detail?.card));
  setTimeout(()=>{try{const card=typeof publicCard!=='undefined'?publicCard:null;if(card)void load(card);}catch(_){}},0);
})();
