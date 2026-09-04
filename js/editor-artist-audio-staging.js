(function(){
  'use strict';
  if(window.__LIW_ARTIST_AUDIO_EDITOR__)return;
  window.__LIW_ARTIST_AUDIO_EDITOR__=true;

  const MAX_BYTES=15*1024*1024;
  const ACCEPTED=new Set(['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg']);
  let root=null;
  let cardId=new URLSearchParams(location.search).get('id')||'';
  let ownerId='';
  let settings={};

  function safe(value,max=2000){return String(value??'').trim().slice(0,max);}
  function status(text,state='ready'){
    const el=root?.querySelector('[data-artist-audio-status]');
    if(!el)return;el.textContent=text;el.dataset.state=state;
  }
  function ensureStyles(){
    if(document.getElementById('liw-artist-audio-editor-style'))return;
    const style=document.createElement('style');
    style.id='liw-artist-audio-editor-style';
    style.textContent=`
      .artist-audio-preview{display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:#090c15}
      .artist-audio-preview-icon{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(157,55,255,.19),rgba(55,100,255,.14));color:#c16bff}
      .artist-audio-preview-copy{display:grid;gap:3px;min-width:0}.artist-audio-preview-copy strong{color:#fff;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.artist-audio-preview-copy span{color:#8f98af;font-size:.64rem;line-height:1.4}
      .artist-audio-preview audio{width:100%;max-width:360px;height:36px;margin-top:7px}
      .artist-audio-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.artist-audio-file{display:none}
      .artist-audio-status{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:#98a0b5;font-size:.6rem;font-weight:850}.artist-audio-status[data-state="saving"]{color:#d8caff;border-color:rgba(165,105,255,.25)}.artist-audio-status[data-state="error"]{color:#ffb8c4;border-color:rgba(255,91,119,.26)}
      @media(max-width:620px){.artist-audio-preview{grid-template-columns:44px minmax(0,1fr)}.artist-audio-preview-icon{width:44px;height:44px}.artist-audio-actions{grid-column:1/-1;justify-content:stretch}.artist-audio-actions .btn{flex:1}.artist-audio-preview audio{max-width:none}}
    `;
    document.head.appendChild(style);
  }
  async function resolveCard(){
    if(typeof supabaseClient==='undefined'||!supabaseClient)return null;
    if(cardId){
      const {data,error}=await supabaseClient.from('digital_cards').select('id,user_id,artist_settings').eq('id',cardId).maybeSingle();
      if(!error&&data){ownerId=data.user_id;settings=data.artist_settings&&typeof data.artist_settings==='object'?data.artist_settings:{};return data;}
    }
    const slug=safe(document.querySelector('[name="slug"]')?.value,160);
    if(!slug)return null;
    const {data,error}=await supabaseClient.from('digital_cards').select('id,user_id,artist_settings').eq('slug',slug).maybeSingle();
    if(error||!data)return null;
    cardId=data.id;ownerId=data.user_id;settings=data.artist_settings&&typeof data.artist_settings==='object'?data.artist_settings:{};return data;
  }
  function render(){
    if(!root)return;
    const url=safe(settings.audio_preview_url);
    const name=safe(settings.audio_preview_name,180)||'Native artist audio preview';
    const player=root.querySelector('audio');
    const copy=root.querySelector('[data-artist-audio-name]');
    const remove=root.querySelector('[data-artist-audio-remove]');
    if(copy)copy.textContent=url?name:'No audio preview uploaded';
    if(player){
      if(url){if(player.src!==url)player.src=url;player.hidden=false;}
      else{player.removeAttribute('src');player.load();player.hidden=true;}
    }
    if(remove)remove.hidden=!url;
    status(url?'Ready — Listen Now will play this audio':'Add an MP3/M4A/WAV preview to enable one-tap playback');
  }
  async function saveSettings(next){
    if(!cardId)throw new Error('Save the card once before adding audio.');
    const {data,error}=await supabaseClient.rpc('save_artist_settings',{p_card_id:cardId,p_settings:next});
    if(error)throw error;
    settings=data&&typeof data==='object'?data:next;
  }
  async function removeStored(path){
    path=safe(path);if(!path)return;
    try{await supabaseClient.storage.from('artist-audio').remove([path]);}catch(_){ }
  }
  async function upload(file){
    if(!file)return;
    if(!ACCEPTED.has(file.type)){throw new Error('Use MP3, M4A, WAV, WebM, or OGG audio.');}
    if(file.size>MAX_BYTES){throw new Error('Audio preview must be 15 MB or smaller.');}
    const card=await resolveCard();
    if(!card||!cardId||!ownerId)throw new Error('Save the card once before adding audio.');
    const clean=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'artist-preview';
    const path=`${ownerId}/${cardId}/${Date.now()}-${clean}`;
    status('Uploading audio…','saving');
    const {error}=await supabaseClient.storage.from('artist-audio').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=supabaseClient.storage.from('artist-audio').getPublicUrl(path);
    const url=data?.publicUrl;
    if(!url){await removeStored(path);throw new Error('Audio upload finished but no playback URL was returned.');}
    const oldPath=safe(settings.audio_preview_path);
    const next={...settings,audio_preview_url:url,audio_preview_path:path,audio_preview_name:file.name};
    try{await saveSettings(next);}catch(error){await removeStored(path);throw error;}
    if(oldPath&&oldPath!==path)await removeStored(oldPath);
    render();
    if(typeof toast==='function')toast('Audio preview added — Listen Now will play it on the card.');
  }
  async function removeAudio(){
    const oldPath=safe(settings.audio_preview_path);
    status('Removing audio…','saving');
    const next={...settings};delete next.audio_preview_url;delete next.audio_preview_path;delete next.audio_preview_name;
    await saveSettings(next);await removeStored(oldPath);render();
    if(typeof toast==='function')toast('Native audio preview removed.');
  }
  function mount(){
    const dressing=document.getElementById('artist-dressing-room');
    if(!dressing)return false;
    ensureStyles();
    if(dressing.querySelector('[data-artist-audio-editor]')){root=dressing.querySelector('[data-artist-audio-editor]');return true;}
    const releaseField=dressing.querySelector('[data-artist-field="featured_release_title"]');
    const releaseBlock=releaseField?.closest('.artist-dressing-block');
    if(!releaseBlock)return false;
    root=document.createElement('div');
    root.className='artist-dressing-block';root.dataset.artistAudioEditor='true';
    root.innerHTML=`
      <div class="artist-dressing-block-head"><div><strong>Native audio preview</strong><span>Fans hear the song immediately on the card. Streaming links stay optional.</span></div><i data-lucide="audio-lines" size="19"></i></div>
      <div class="artist-audio-preview">
        <div class="artist-audio-preview-icon"><i data-lucide="music" size="23"></i></div>
        <div class="artist-audio-preview-copy"><strong data-artist-audio-name>No audio preview uploaded</strong><span>MP3, M4A, WAV, WebM or OGG · up to 15 MB</span><audio controls preload="metadata" hidden></audio></div>
        <div class="artist-audio-actions"><label class="btn btn-light btn-sm"><i data-lucide="upload" size="15"></i> Upload audio<input class="artist-audio-file" type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg"></label><button class="btn btn-ghost btn-sm" type="button" data-artist-audio-remove hidden>Remove</button></div>
      </div>
      <div style="margin-top:9px"><span class="artist-audio-status" data-artist-audio-status>Loading…</span></div>`;
    releaseBlock.insertAdjacentElement('afterend',root);
    root.querySelector('.artist-audio-file')?.addEventListener('change',async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      try{await upload(file);}catch(error){status(error?.message||'Upload failed','error');if(typeof toast==='function')toast(error?.message||'Unable to upload audio.');}
    });
    root.querySelector('[data-artist-audio-remove]')?.addEventListener('click',async()=>{
      try{await removeAudio();}catch(error){status(error?.message||'Remove failed','error');if(typeof toast==='function')toast(error?.message||'Unable to remove audio.');}
    });
    resolveCard().then(render).catch(()=>render());
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries+=1;if(mount()&&tries>8)clearInterval(timer);if(tries>80)clearInterval(timer);},250);mount();
})();
