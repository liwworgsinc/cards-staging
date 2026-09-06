/* LIW Cards staging — real Music Artist Follow on LIW.
   Anonymous browser follow key + locked Supabase RPCs; no account required. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_FOLLOW__)return;
  window.__LIW_MUSIC_FOLLOW__=true;

  const STORAGE_KEY='liw_artist_follower_key_v1';
  let memoryKey='';
  let mountTimer=0;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=240){return String(value??'').trim().slice(0,max);}
  function slug(){return safe(data()?.slug||new URLSearchParams(location.search).get('slug'),160);}
  function artistName(){return safe(document.getElementById('name')?.textContent||data()?.full_name||'this artist',120)||'this artist';}
  function icon(name,size=17){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));}

  function makeUuid(){
    try{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();}catch(_){ }
    try{
      const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);
      bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
      const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }catch(_){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
        const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);
      });
    }
  }

  function followerKey(){
    if(validUuid(memoryKey))return memoryKey;
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      if(validUuid(saved)){memoryKey=saved;return saved;}
    }catch(_){ }
    memoryKey=makeUuid();
    try{localStorage.setItem(STORAGE_KEY,memoryKey);}catch(_){ }
    return memoryKey;
  }

  function rpc(){return typeof supabaseClient!=='undefined'&&supabaseClient?supabaseClient:null;}
  function first(row){return Array.isArray(row)?row[0]||null:row||null;}
  function countText(count){
    const n=Math.max(0,Number(count)||0);
    let formatted=String(n);try{formatted=new Intl.NumberFormat().format(n);}catch(_){ }
    return `${formatted} ${n===1?'follower':'followers'}`;
  }

  async function status(){
    const client=rpc(),cardSlug=slug();
    if(!client||!cardSlug)throw new Error('Follow service unavailable');
    const {data:row,error}=await client.rpc('public_artist_follow_status',{p_slug:cardSlug,p_follower_key:followerKey()});
    if(error)throw error;
    const result=first(row)||{};
    return {following:result.following===true,count:Number(result.follower_count)||0};
  }

  async function setFollow(follow){
    const client=rpc(),cardSlug=slug();
    if(!client||!cardSlug)throw new Error('Follow service unavailable');
    const {data:row,error}=await client.rpc('public_artist_follow_set',{p_slug:cardSlug,p_follower_key:followerKey(),p_follow:Boolean(follow)});
    if(error)throw error;
    const result=first(row)||{};
    return {following:result.following===true,count:Number(result.follower_count)||0};
  }

  function paint(node,state){
    const button=node.querySelector('.music-liw-follow-button');
    const count=node.querySelector('[data-liw-follow-count]');
    if(!button||!count)return;
    node.dataset.following=state.following?'true':'false';
    button.classList.toggle('is-following',state.following);
    button.setAttribute('aria-pressed',state.following?'true':'false');
    button.innerHTML=state.following?`${icon('check',16)} Following ✓`:`${icon('user-plus',16)} Follow on LIW`;
    count.textContent=countText(state.count);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function message(node,text,error=false){
    const status=node.querySelector('.music-liw-follow-status');if(!status)return;
    status.textContent=text||'';status.classList.toggle('error',Boolean(error));
  }

  async function refresh(node){
    if(!node||node.dataset.loading==='true')return;
    const button=node.querySelector('.music-liw-follow-button');
    node.dataset.loading='true';if(button)button.disabled=true;
    message(node,'Checking your LIW follow…');
    try{
      const current=await status();paint(node,current);message(node,current.following?`You’re following ${artistName()} on LIW.`:'Follow here and keep the Artist Card open.');
    }catch(error){
      console.warn('[LIW Follow] status failed',error);message(node,'Follow is temporarily unavailable. Please try again.',true);
    }finally{
      node.dataset.loading='false';if(button)button.disabled=false;
    }
  }

  async function toggle(node){
    if(!node||node.dataset.loading==='true')return;
    const button=node.querySelector('.music-liw-follow-button');
    const next=node.dataset.following!=='true';
    node.dataset.loading='true';if(button)button.disabled=true;
    message(node,next?'Following…':'Updating…');
    try{
      const result=await setFollow(next);paint(node,result);
      message(node,result.following?`Following ${artistName()} on LIW ✓`:'You are no longer following this artist.');
      try{if(typeof window.track==='function')window.track(result.following?'music_artist_follow':'music_artist_unfollow',slug(),{experience:'music',follower_count:result.count});}catch(_){ }
    }catch(error){
      console.warn('[LIW Follow] update failed',error);message(node,'Could not update your follow. Try again.',true);
    }finally{
      node.dataset.loading='false';if(button)button.disabled=false;
    }
  }

  function build(section){
    let node=section.querySelector('.music-liw-follow');
    if(node){refresh(node);return node;}
    node=document.createElement('section');node.className='music-liw-follow';
    node.innerHTML=`<div class="music-liw-follow-copy"><span class="music-liw-follow-mark">${icon('heart',20)}</span><div><small>FOLLOW ON LIW</small><strong>Stay connected without leaving the card</strong><p>Follow ${artistName()} here on LIW. Social platforms are still below.</p></div></div><div class="music-liw-follow-action"><button type="button" class="music-liw-follow-button" aria-pressed="false">${icon('user-plus',16)} Follow on LIW</button><span class="music-liw-follow-count"><b data-liw-follow-count>0 followers</b></span></div><p class="music-liw-follow-status" aria-live="polite"></p>`;
    node.querySelector('.music-liw-follow-button').addEventListener('click',()=>toggle(node));
    const socials=section.querySelector('#socials');
    if(socials)socials.before(node);else section.appendChild(node);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    refresh(node);return node;
  }

  function mount(){
    if(!isMusic())return false;
    const room=document.querySelector('.music-artist-room.open');if(!room)return false;
    const title=safe(room.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();if(title!=='social')return false;
    const section=room.querySelector('[data-music-room-body] #social-section');if(!section)return false;
    build(section);return true;
  }

  function scheduleMount(){
    clearTimeout(mountTimer);
    let attempt=0;
    const run=()=>{
      attempt+=1;
      if(mount()||attempt>=8)return;
      mountTimer=setTimeout(run,attempt<4?70:150);
    };
    mountTimer=setTimeout(run,0);
  }

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    const tile=event.target?.closest?.('.music-luxe-tile');if(!tile)return;
    const label=safe(tile.querySelector('strong')?.textContent,40).toLowerCase();
    if(label==='social')scheduleMount();
  });

  setTimeout(mount,0);
})();
