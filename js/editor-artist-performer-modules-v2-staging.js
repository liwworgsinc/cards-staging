/* LIW Cards staging — Music/Artist performer selector + modular home actions v2.
   Mobile-safe: no document-wide MutationObserver. Reuses Artist Dressing Room
   artist_settings state/save events and leaves Classic/Flow untouched. */
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
    rapper:['music','videos','shows','merch','fan_club','epk','book','social'],
    singer:['music','videos','shows','merch','fan_club','epk','book','social'],
    musician:['music','videos','shows','merch','gallery','fan_club','epk','book','social'],
    band:['music','videos','shows','merch','gallery','fan_club','epk','book','social'],
    dj:['music','videos','shows','merch','gallery','book','social'],
    producer:['music','videos','merch','gallery','epk','book','social'],
    comedian:['videos','shows','merch','gallery','fan_club','epk','book','social'],
    podcaster:['videos','merch','gallery','fan_club','book','social'],
    actor:['videos','shows','gallery','epk','book','social'],
    creator:['videos','merch','gallery','fan_club','book','social'],
    other:['music','videos','shows','merch','gallery','fan_club','epk','book','social']
  };

  let mounted=false;
  let hydrateStarted=false;

  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function isMusic(){return String(document.querySelector('[name="card_experience"]')?.value||'classic').toLowerCase()==='music';}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function styles(){
    if(document.getElementById('liw-artist-performer-v2-style'))return;
    const style=document.createElement('style');style.id='liw-artist-performer-v2-style';
    style.textContent=`
      #artist-dressing-room .liw-performer-v2{display:grid;gap:10px;margin:0 0 12px;padding:13px;border:1px solid #dfe5ee;border-radius:16px;background:linear-gradient(145deg,#fff,#f8fbff);box-shadow:0 7px 20px rgba(15,23,42,.045)}
      #artist-dressing-room .liw-performer-v2-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #artist-dressing-room .liw-performer-v2-head strong{display:block;color:#101828;font-size:.86rem}#artist-dressing-room .liw-performer-v2-head span{display:block;margin-top:2px;color:#667085;font-size:.65rem;line-height:1.35}
      #artist-dressing-room .liw-performer-v2-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      #artist-dressing-room .liw-performer-v2-row label{display:grid;gap:4px;color:#344054;font-size:.65rem;font-weight:850}
      #artist-dressing-room .liw-performer-v2-row .btn{min-height:42px;white-space:nowrap}
      #artist-dressing-room .liw-extra-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #artist-dressing-room .liw-extra-action{display:flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:7px;border:1px solid #e3e8ef;border-radius:12px;background:#fff;color:#23304a;font-size:.67rem;font-weight:850;cursor:pointer}
      #artist-dressing-room .liw-extra-action input{width:16px;height:16px;accent-color:#0b1438}
      #artist-dressing-room .liw-home-routing-note{margin:0;color:#667085;font-size:.62rem;line-height:1.4}
      #artist-dressing-room .liw-podcast-v2-fields{display:grid;gap:7px;padding-top:2px}#artist-dressing-room .liw-podcast-v2-fields[hidden]{display:none!important}
      #artist-dressing-room .liw-podcast-v2-fields label{display:grid;gap:4px;color:#475467;font-size:.64rem;font-weight:800}
      #artist-dressing-room .liw-podcast-v2-pair{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      @media(max-width:560px){#artist-dressing-room .liw-performer-v2-row{grid-template-columns:1fr}#artist-dressing-room .liw-performer-v2-row .btn{width:100%}#artist-dressing-room .liw-podcast-v2-pair{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  function phoneNote(){
    const call=safe(document.querySelector('[name="phone"]')?.value,80);
    const text=safe(document.querySelector('[name="sms_phone"]')?.value,80)||call;
    return call||text
      ? 'Call/Text use the Contact numbers already on this card. Main home stays 3×3; extra enabled actions go to More · Swipe.'
      : 'Add a Call or Text/SMS number in Contact. Main home stays 3×3; extra enabled actions go to More · Swipe.';
  }

  function markup(){
    const options=TYPES.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
    return `<section class="liw-performer-v2" data-liw-performer-v2>
      <div class="liw-performer-v2-head"><div><strong>${icon('sparkles')} Artist type & home actions</strong><span>Pick what they are, then turn rooms/actions on or off.</span></div><span>${icon('layout-grid',17)}</span></div>
      <div class="liw-performer-v2-row"><label>Performer / creator type<select class="input" data-artist-field="performer_type" aria-label="Performer or creator type">${options}</select></label><button class="btn btn-light" type="button" data-liw-apply-preset>${icon('wand-sparkles')} Recommended setup</button></div>
      <div class="liw-extra-action-grid" aria-label="Extra Artist home actions">
        <label class="liw-extra-action"><input type="checkbox" data-artist-field="podcast_enabled">${icon('podcast')} Podcast</label>
        <label class="liw-extra-action"><input type="checkbox" data-artist-field="call_enabled">${icon('phone')} Call</label>
        <label class="liw-extra-action"><input type="checkbox" data-artist-field="text_enabled">${icon('message-square-text')} Text</label>
      </div>
      <p class="liw-home-routing-note" data-liw-home-routing-note>${esc(phoneNote())}</p>
      <div class="liw-podcast-v2-fields" hidden>
        <div class="liw-podcast-v2-pair"><label>Podcast / show name<input class="input" data-artist-field="podcast_title" placeholder="The Late Night Mic"></label><label>Podcast link<input class="input" type="url" data-artist-field="podcast_url" placeholder="https://..."></label></div>
        <label>Podcast room intro<textarea class="input" rows="2" data-artist-field="podcast_description" placeholder="What is the show about?"></textarea></label>
      </div>
    </section>`;
  }

  function syncPodcast(root){
    const enabled=root.querySelector('[data-artist-field="podcast_enabled"]')?.checked===true;
    const fields=root.querySelector('.liw-podcast-v2-fields');if(fields)fields.hidden=!enabled;
  }

  async function hydrate(builder){
    if(hydrateStarted)return;hydrateStarted=true;
    const id=safe(new URLSearchParams(location.search).get('id'),100);
    if(!id||typeof supabaseClient==='undefined'||!supabaseClient)return;
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('artist_settings').eq('id',id).maybeSingle();if(error)throw error;
      const settings=data?.artist_settings&&typeof data.artist_settings==='object'?data.artist_settings:{};
      ['performer_type','podcast_title','podcast_url','podcast_description'].forEach(name=>{const el=builder.querySelector(`[data-artist-field="${name}"]`);if(el)el.value=safe(settings[name],name==='performer_type'?40:1800);});
      ['podcast_enabled','call_enabled','text_enabled'].forEach(name=>{const el=builder.querySelector(`[data-artist-field="${name}"]`);if(el)el.checked=settings[name]===true;});
      syncPodcast(builder);
    }catch(error){console.warn('[LIW Artist performer v2] hydrate',error);}
  }

  function setExtra(builder,name,value){
    const el=builder.querySelector(`[data-artist-field="${name}"]`);if(!el)return;el.checked=Boolean(value);el.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function applyPreset(builder){
    const type=builder.querySelector('[data-artist-field="performer_type"]')?.value||'';const preset=PRESETS[type];
    if(!preset){window.toast?.('Choose a performer or creator type first.');return;}
    const room=document.getElementById('artist-dressing-room');const visible=new Set(preset);
    room?.querySelectorAll('[data-artist-tile-visible]').forEach(input=>{const next=visible.has(input.dataset.artistTileVisible);if(input.checked!==next){input.checked=next;input.dispatchEvent(new Event('change',{bubbles:true}));}});
    setExtra(builder,'podcast_enabled',type==='comedian'||type==='podcaster');syncPodcast(builder);
    window.toast?.('Recommended setup applied — every button can still be changed.');
  }

  function mount(){
    if(mounted||!isMusic())return false;
    const room=document.getElementById('artist-dressing-room');const tileList=room?.querySelector('[data-artist-tile-list]');if(!room||!tileList)return false;
    styles();const host=tileList.closest('.artist-section-card')||tileList.parentElement;if(!host)return false;
    const wrap=document.createElement('div');wrap.innerHTML=markup();const builder=wrap.firstElementChild;host.insertAdjacentElement('beforebegin',builder);mounted=true;
    builder.querySelector('[data-liw-apply-preset]')?.addEventListener('click',()=>applyPreset(builder));
    builder.querySelector('[data-artist-field="podcast_enabled"]')?.addEventListener('change',()=>syncPodcast(builder));
    document.querySelectorAll('[name="phone"],[name="sms_phone"]').forEach(el=>el.addEventListener('input',()=>{const note=builder.querySelector('[data-liw-home-routing-note]');if(note)note.textContent=phoneNote();}));
    hydrate(builder);if(window.lucide)try{lucide.createIcons();}catch(_){ }return true;
  }

  function schedule(){[0,120,300,650,1100,1800,2800,4200,6500].forEach(delay=>setTimeout(mount,delay));}
  document.addEventListener('click',event=>{if(event.target?.closest?.('[data-card-experience="music"]'))schedule();},true);
  document.querySelector('[name="card_experience"]')?.addEventListener('change',schedule);
  window.addEventListener('pageshow',schedule,{once:true});
  schedule();
})();
