/* LIW Cards staging — Music/Artist performer type + modular home controls.
   Adds creator-type presets and optional Podcast/Call/Text controls without
   changing Classic/Flow or duplicating the existing Artist settings backend. */
(function(){
  'use strict';
  if(window.__LIW_ARTIST_PERFORMER_MODULES_EDITOR__)return;
  window.__LIW_ARTIST_PERFORMER_MODULES_EDITOR__=true;

  const TYPES=[
    ['','Choose performer / creator type'],
    ['rapper','Rapper / Hip-Hop Artist'],['singer','Singer / Vocalist'],['musician','Musician / Instrumentalist'],
    ['band','Band / Group'],['dj','DJ'],['producer','Producer / Beatmaker'],['comedian','Comedian'],
    ['podcaster','Podcaster'],['actor','Actor / Performer'],['creator','Creator / Influencer'],['other','Other Artist / Creator']
  ];
  const PRESETS={
    rapper:{tiles:['music','videos','shows','merch','fan_club','epk','book','social'],podcast:false},
    singer:{tiles:['music','videos','shows','merch','fan_club','epk','book','social'],podcast:false},
    musician:{tiles:['music','videos','shows','merch','gallery','fan_club','epk','book','social'],podcast:false},
    band:{tiles:['music','videos','shows','merch','gallery','fan_club','epk','book','social'],podcast:false},
    dj:{tiles:['music','videos','shows','merch','gallery','book','social'],podcast:false},
    producer:{tiles:['music','videos','merch','gallery','epk','book','social'],podcast:false},
    comedian:{tiles:['videos','shows','merch','gallery','fan_club','epk','book','social'],podcast:true},
    podcaster:{tiles:['videos','merch','gallery','fan_club','book','social'],podcast:true},
    actor:{tiles:['videos','shows','gallery','epk','book','social'],podcast:false},
    creator:{tiles:['videos','merch','gallery','fan_club','book','social'],podcast:false},
    other:{tiles:['music','videos','shows','merch','gallery','fan_club','epk','book','social'],podcast:false}
  };

  let settings={};
  let mounted=false;
  let loadingCore=false;

  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function experience(){return String(document.querySelector('[name="card_experience"]')?.value||'classic').toLowerCase();}
  function isMusic(){return experience()==='music';}
  function icon(name,size=17){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function ensureCore(){
    if(!isMusic()||document.getElementById('artist-dressing-room')||window.__LIW_ARTIST_DRESSING_ROOM__||loadingCore)return;
    loadingCore=true;
    if(!document.querySelector('link[data-liw-artist-dressing-room-core]')){
      const style=document.createElement('link');
      style.rel='stylesheet';style.href='css/editor-artist-dressing-room-staging.css?v=20260907-control-center-2';
      style.dataset.liwArtistDressingRoomCore='true';document.head.appendChild(style);
    }
    const script=document.createElement('script');
    script.src='js/editor-artist-dressing-room-staging.js?v=20260907-control-center-2';
    script.defer=true;script.dataset.liwArtistDressingRoomCore='true';
    script.addEventListener('load',()=>{loadingCore=false;setTimeout(mount,40);});
    script.addEventListener('error',()=>{loadingCore=false;});
    document.body.appendChild(script);
  }

  function ensureStyles(){
    if(document.getElementById('liw-performer-modules-editor-style'))return;
    const style=document.createElement('style');
    style.id='liw-performer-modules-editor-style';
    style.textContent=`
      #artist-dressing-room .liw-performer-builder{display:grid;gap:12px;padding:14px;border:1px solid #dfe5ee;border-radius:16px;background:linear-gradient(145deg,#fff,#f8fbff);box-shadow:0 7px 20px rgba(15,23,42,.045)}
      #artist-dressing-room .liw-performer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      #artist-dressing-room .liw-performer-head strong{display:block;color:#101828;font-size:.9rem}#artist-dressing-room .liw-performer-head span{display:block;margin-top:3px;color:#667085;font-size:.69rem;line-height:1.4}
      #artist-dressing-room .liw-performer-select-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      #artist-dressing-room .liw-performer-select-row label{display:grid;gap:5px;color:#344054;font-size:.69rem;font-weight:800}
      #artist-dressing-room .liw-performer-preset{min-height:42px;white-space:nowrap}
      #artist-dressing-room .liw-module-switches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #artist-dressing-room .liw-module-switch{display:flex;align-items:center;gap:8px;min-height:48px;padding:9px 10px;border:1px solid #e3e8ef;border-radius:13px;background:#fff;color:#23304a;font-size:.7rem;font-weight:800;cursor:pointer}
      #artist-dressing-room .liw-module-switch input{width:17px;height:17px;accent-color:#0b1438}
      #artist-dressing-room .liw-podcast-fields{display:grid;gap:8px;padding-top:2px}#artist-dressing-room .liw-podcast-fields[hidden]{display:none!important}
      #artist-dressing-room .liw-podcast-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}#artist-dressing-room .liw-podcast-fields label{display:grid;gap:5px;color:#475467;font-size:.67rem;font-weight:800}
      #artist-dressing-room .liw-contact-module-note{margin:0;color:#667085;font-size:.64rem;line-height:1.45}
      @media(max-width:640px){#artist-dressing-room .liw-performer-select-row{grid-template-columns:1fr}#artist-dressing-room .liw-performer-preset{width:100%}#artist-dressing-room .liw-module-switches{grid-template-columns:1fr}#artist-dressing-room .liw-podcast-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function loadSettings(){
    const id=safe(new URLSearchParams(location.search).get('id'),100);
    if(typeof supabaseClient==='undefined'||!supabaseClient)return {};
    try{
      if(id){
        const {data,error}=await supabaseClient.from('digital_cards').select('artist_settings').eq('id',id).maybeSingle();
        if(error)throw error;
        return data?.artist_settings&&typeof data.artist_settings==='object'?data.artist_settings:{};
      }
      const slug=safe(document.querySelector('[name="slug"]')?.value,160);
      if(slug){
        const {data,error}=await supabaseClient.from('digital_cards').select('artist_settings').eq('slug',slug).maybeSingle();
        if(error)throw error;
        return data?.artist_settings&&typeof data.artist_settings==='object'?data.artist_settings:{};
      }
    }catch(error){console.warn('[LIW Artist performer modules] settings load',error);}
    return {};
  }

  function setField(name,value){
    const field=document.querySelector(`#artist-dressing-room [data-artist-field="${name}"]`);
    if(!field)return;
    if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value??'';
    field.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function applyPreset(type){
    const preset=PRESETS[type];if(!preset)return;
    const room=document.getElementById('artist-dressing-room');if(!room)return;
    const visible=new Set(preset.tiles);
    room.querySelectorAll('[data-artist-tile-visible]').forEach(input=>{
      const next=visible.has(input.dataset.artistTileVisible);
      if(input.checked===next)return;
      input.checked=next;input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    setField('podcast_enabled',preset.podcast);
    const panel=room.querySelector('.liw-podcast-fields');if(panel)panel.hidden=!preset.podcast;
    if(typeof toast==='function')toast('Recommended Artist home buttons applied — you can still change any switch.');
  }

  function syncPodcastFields(){
    const root=document.getElementById('artist-dressing-room');if(!root)return;
    const enabled=root.querySelector('[data-artist-field="podcast_enabled"]')?.checked===true;
    const fields=root.querySelector('.liw-podcast-fields');if(fields)fields.hidden=!enabled;
  }

  function phoneNote(){
    const call=safe(document.querySelector('[name="phone"]')?.value,80);
    const text=safe(document.querySelector('[name="sms_phone"]')?.value,80)||call;
    if(call&&text)return 'Call and Text use the numbers already entered in the Contact step. Visitors only see the buttons you switch on here.';
    return 'Add a Call number or Text / SMS number in the Contact step. These switches control whether those actions appear on the Artist home screen.';
  }

  function markup(){
    const options=TYPES.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
    return `<section class="liw-performer-builder" data-liw-performer-builder>
      <div class="liw-performer-head"><div><strong>${icon('sparkles',16)} Build the right Artist Card</strong><span>Choose what kind of performer or creator this is, then decide exactly which fan actions belong on the home screen.</span></div></div>
      <div class="liw-performer-select-row"><label>Performer / creator type<select class="input" data-artist-field="performer_type" aria-label="Performer or creator type">${options}</select></label><button type="button" class="btn btn-light liw-performer-preset" data-apply-performer-preset>${icon('wand-sparkles',16)} Recommended setup</button></div>
      <div class="liw-module-switches" aria-label="Extra Artist home buttons">
        <label class="liw-module-switch"><input type="checkbox" data-artist-field="podcast_enabled">${icon('podcast',17)} Podcast</label>
        <label class="liw-module-switch"><input type="checkbox" data-artist-field="call_enabled">${icon('phone',17)} Call</label>
        <label class="liw-module-switch"><input type="checkbox" data-artist-field="text_enabled">${icon('message-square-text',17)} Text</label>
      </div>
      <p class="liw-contact-module-note" data-liw-contact-module-note>${esc(phoneNote())}</p>
      <div class="liw-podcast-fields" hidden>
        <div class="liw-podcast-grid"><label>Podcast / show name<input class="input" data-artist-field="podcast_title" placeholder="The Late Night Mic"></label><label>Podcast link<input class="input" type="url" data-artist-field="podcast_url" placeholder="https://open.spotify.com/show/... or your podcast page"></label></div>
        <label>Podcast room intro<textarea class="input" rows="3" data-artist-field="podcast_description" placeholder="Tell fans what the show is about and where new episodes drop."></textarea></label>
      </div>
    </section>`;
  }

  async function mount(){
    if(mounted||!isMusic())return false;
    const room=document.getElementById('artist-dressing-room');if(!room)return false;
    const home=room.querySelector('[data-artist-panel="home"]')||room.querySelector('.artist-control-panel');
    const tileList=room.querySelector('[data-artist-tile-list]');
    if(!home||!tileList)return false;
    ensureStyles();
    const host=tileList.closest('.artist-section-card')||tileList.parentElement;
    if(!host)return false;
    const node=document.createElement('div');node.innerHTML=markup();const builder=node.firstElementChild;
    host.insertAdjacentElement('beforebegin',builder);
    mounted=true;
    settings=await loadSettings();
    ['performer_type','podcast_title','podcast_url','podcast_description'].forEach(name=>{
      const el=builder.querySelector(`[data-artist-field="${name}"]`);if(el)el.value=safe(settings[name],name==='performer_type'?40:1800);
    });
    ['podcast_enabled','call_enabled','text_enabled'].forEach(name=>{
      const el=builder.querySelector(`[data-artist-field="${name}"]`);if(el)el.checked=settings[name]===true;
    });
    syncPodcastFields();
    builder.querySelector('[data-apply-performer-preset]')?.addEventListener('click',()=>{
      const type=builder.querySelector('[data-artist-field="performer_type"]')?.value||'';
      if(!type){if(typeof toast==='function')toast('Choose a performer or creator type first.');return;}
      applyPreset(type);
    });
    builder.querySelector('[data-artist-field="podcast_enabled"]')?.addEventListener('change',syncPodcastFields);
    document.querySelectorAll('[name="phone"],[name="sms_phone"]').forEach(el=>el.addEventListener('input',()=>{const note=builder.querySelector('[data-liw-contact-module-note]');if(note)note.textContent=phoneNote();}));
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  const observer=new MutationObserver(()=>{
    if(isMusic()){ensureCore();mount();}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  let attempts=0;const timer=setInterval(()=>{
    attempts+=1;
    if(isMusic()){ensureCore();mount();}
    if(mounted&&attempts>20)clearInterval(timer);
    if(attempts>240)clearInterval(timer);
  },250);
  ensureCore();mount();
})();