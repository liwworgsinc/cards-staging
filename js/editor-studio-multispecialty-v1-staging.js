/* LIW Cards staging — Studio multi-specialty editor V1.
   Primary specialty controls the main public identity. Additional specialties are
   multi-select and travel with the same Studio card. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_MULTI_SPECIALTY_V1__)return;
  window.__LIW_STUDIO_MULTI_SPECIALTY_V1__=true;

  const TYPES={
    barber:{label:'Barber',group:'Hair & Grooming'},
    hair:{label:'Hair Stylist',group:'Hair & Grooming'},
    braider:{label:'Braider',group:'Hair & Grooming'},
    loctician:{label:'Loctician',group:'Hair & Grooming'},
    wig:{label:'Wig / Install Specialist',group:'Hair & Grooming'},
    nails:{label:'Nail Tech',group:'Nails & Beauty'},
    lashes:{label:'Lash Artist',group:'Nails & Beauty'},
    brows:{label:'Brow Artist',group:'Nails & Beauty'},
    makeup:{label:'Makeup Artist',group:'Nails & Beauty'},
    esthetician:{label:'Esthetician',group:'Skin & Wellness'},
    wax:{label:'Wax Specialist',group:'Skin & Wellness'},
    massage:{label:'Massage Therapist',group:'Skin & Wellness'},
    spa:{label:'Spa / Wellness',group:'Skin & Wellness'},
    spraytan:{label:'Spray Tan Artist',group:'Skin & Wellness'},
    pmu:{label:'Permanent Makeup Artist',group:'Body Art & Specialty'},
    tattoo:{label:'Tattoo Artist',group:'Body Art & Specialty'},
    piercing:{label:'Piercer',group:'Body Art & Specialty'},
    toothgem:{label:'Tooth Gem Artist',group:'Body Art & Specialty'},
    cosmetics:{label:'Beauty / Cosmetics',group:'Beauty Business'},
    salon:{label:'Salon / Multi-Service Studio',group:'Beauty Business'},
    other:{label:'Other Studio Professional',group:'Other'}
  };
  const GROUPS=['Hair & Grooming','Nails & Beauty','Skin & Wellness','Body Art & Specialty','Beauty Business','Other'];

  let primary='barber';
  let specialties=new Set(['barber']);
  let custom='';
  let loadedId='';
  let saveTimer=0;
  let saving=false;

  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=(s,scope=document)=>Array.from(scope.querySelectorAll(s));
  const field=name=>q('[name="'+name+'"]');
  const studioActive=()=>String(field('color_mode')?.value||'').toLowerCase()==='barbershop'&&String(field('card_experience')?.value||'classic').toLowerCase()!=='music';
  const cardId=()=>{try{return typeof currentId!=='undefined'?currentId:null;}catch(_){return null;}};

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function injectStyles(){
    if(q('#liw-studio-multi-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-multi-style';
    style.textContent=`
      .studio-business-picker{display:none!important}
      .studio-multi-drawer{margin:14px 0;border:1px solid #e2e6ee;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,.055)}
      .studio-multi-drawer>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;cursor:pointer;background:linear-gradient(145deg,#fbfcff,#f5f7fb)}
      .studio-multi-drawer>summary::-webkit-details-marker{display:none}
      .studio-multi-summary-copy{display:grid;gap:3px;min-width:0}.studio-multi-summary-copy strong{font-size:.82rem;color:#111827}.studio-multi-summary-copy span{font-size:.64rem;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .studio-multi-count{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#111827;color:#fff;font-size:.58rem;font-weight:900}
      .studio-multi-body{padding:15px;display:grid;gap:15px}.studio-multi-intro{margin:0;color:#667085;font-size:.7rem;line-height:1.5}
      .studio-multi-primary label{display:grid;gap:6px;color:#344054;font-size:.68rem;font-weight:850}.studio-multi-primary select,.studio-multi-custom input{width:100%;min-height:44px;border:1px solid #d7dce5;border-radius:12px;background:#fff;padding:9px 11px;font:inherit;color:#111827}
      .studio-multi-group{display:grid;gap:8px}.studio-multi-group>strong{font-size:.65rem;color:#475467;text-transform:uppercase;letter-spacing:.07em}
      .studio-multi-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .studio-multi-check{display:flex;align-items:center;gap:8px;min-height:42px;padding:9px 10px;border:1px solid #e3e7ef;border-radius:12px;background:#fafbfc;color:#344054;font-size:.66rem;font-weight:800;cursor:pointer}
      .studio-multi-check:has(input:checked){border-color:#111827;background:#f4f6fa;color:#111827;box-shadow:0 0 0 2px rgba(17,24,39,.06)}
      .studio-multi-check input{width:16px;height:16px;margin:0;accent-color:#111827}.studio-multi-check input:disabled{opacity:.55}
      .studio-multi-custom{display:grid;gap:6px}.studio-multi-custom label{font-size:.68rem;font-weight:850;color:#344054}.studio-multi-custom small{font-size:.6rem;color:#667085}
      .studio-multi-note{display:flex;gap:8px;align-items:flex-start;padding:10px 11px;border-radius:12px;background:#f7f8fb;color:#667085;font-size:.63rem;line-height:1.45}
      @media(max-width:520px){.studio-multi-options{grid-template-columns:1fr}.studio-multi-body{padding:13px}.studio-multi-drawer>summary{padding:13px}}
    `;
    document.head.appendChild(style);
  }

  function optionHtml(){
    return Object.entries(TYPES).map(([key,m])=>'<option value="'+key+'">'+esc(m.label)+'</option>').join('');
  }

  function groupHtml(group){
    const rows=Object.entries(TYPES).filter(([,m])=>m.group===group);
    if(!rows.length)return '';
    return '<div class="studio-multi-group"><strong>'+esc(group)+'</strong><div class="studio-multi-options">'+rows.map(([key,m])=>
      '<label class="studio-multi-check"><input type="checkbox" data-studio-specialty="'+key+'"><span>'+esc(m.label)+'</span></label>'
    ).join('')+'</div></div>';
  }

  function summaryText(){
    const primaryLabel=TYPES[primary]?.label||'Studio Professional';
    const extras=[...specialties].filter(x=>x!==primary).map(x=>x==='other'&&custom?custom:(TYPES[x]?.label||x));
    return extras.length?primaryLabel+' + '+extras.length+' more':primaryLabel;
  }

  function syncUi(){
    const root=q('[data-studio-multi-drawer]');
    if(!root)return;
    const select=q('[data-studio-primary]',root);
    if(select&&select.value!==primary)select.value=primary;
    qa('[data-studio-specialty]',root).forEach(input=>{
      const key=input.dataset.studioSpecialty;
      input.checked=specialties.has(key);
      input.disabled=key===primary;
      input.closest('.studio-multi-check')?.classList.toggle('is-primary',key===primary);
    });
    const customWrap=q('[data-studio-custom-wrap]',root);
    if(customWrap)customWrap.hidden=!specialties.has('other');
    const customInput=q('[data-studio-custom]',root);
    if(customInput&&document.activeElement!==customInput)customInput.value=custom;
    const summary=q('[data-studio-multi-summary]',root);
    if(summary)summary.textContent=summaryText();
    const count=q('[data-studio-multi-count]',root);
    if(count)count.textContent=String(specialties.size)+' selected';
    try{
      document.body.dataset.studioBusinessType=primary;
      document.body.dataset.studioSpecialties=[...specialties].join(',');
    }catch(_){}
  }

  function syncPrimaryAdapter(){
    try{
      if(window.LIWStudio?.businessType!==primary)window.LIWStudio?.setBusinessType?.(primary);
      else window.LIWStudio?.refresh?.();
    }catch(_){}
  }

  async function persist(){
    if(!studioActive()||saving)return;
    const id=cardId();
    if(!id||!window.supabaseClient?.rpc)return;
    saving=true;
    try{
      const payload=[...specialties];
      const {error}=await window.supabaseClient.rpc('set_studio_profile',{
        p_card_id:id,
        p_primary_type:primary,
        p_specialties:payload,
        p_custom_specialty:custom||null
      });
      if(error)throw error;
    }catch(error){
      console.warn('Studio multi-specialty save failed:',error);
      try{window.toast?.('Studio specialties will retry on your next save.');}catch(_){}
    }finally{saving=false;}
  }

  function queuePersist(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>void persist(),220);
  }

  function setPrimary(next){
    if(!TYPES[next])return;
    primary=next;
    specialties.add(primary);
    syncUi();
    syncPrimaryAdapter();
    queuePersist();
  }

  function toggleSpecialty(key,checked){
    if(!TYPES[key])return;
    if(key===primary){specialties.add(key);syncUi();return;}
    if(checked)specialties.add(key);else specialties.delete(key);
    if(key!=='other'&&!specialties.has('other'))custom='';
    syncUi();
    queuePersist();
  }

  function mount(){
    injectStyles();
    const center=q('#barber-control-center');
    if(!center)return false;
    const tabs=q('.barber-v5-tabs',center);
    if(!tabs)return false;
    let drawer=q('[data-studio-multi-drawer]',center);
    if(!drawer){
      drawer=document.createElement('details');
      drawer.className='studio-multi-drawer';
      drawer.dataset.studioMultiDrawer='true';
      drawer.open=true;
      drawer.innerHTML=`
        <summary>
          <span class="studio-multi-summary-copy"><strong>Studio specialties</strong><span data-studio-multi-summary>Choose what you do</span></span>
          <span class="studio-multi-count" data-studio-multi-count>1 selected</span>
        </summary>
        <div class="studio-multi-body">
          <p class="studio-multi-intro"><strong>Pick one primary specialty</strong> for the main card identity, then add every other service profession that applies. Customers can see all of them.</p>
          <div class="studio-multi-primary"><label>Primary specialty<select data-studio-primary>${optionHtml()}</select></label></div>
          ${GROUPS.map(groupHtml).join('')}
          <div class="studio-multi-custom" data-studio-custom-wrap hidden>
            <label>Custom specialty<input data-studio-custom maxlength="80" placeholder="Example: Henna Artist or Scalp Micropigmentation"></label>
            <small>This keeps Studio open to professionals we have not listed yet.</small>
          </div>
          <div class="studio-multi-note"><span>✦</span><span>Changing the primary specialty changes the main label and booking wording. Additional specialties stay on the same card.</span></div>
        </div>`;
      tabs.insertAdjacentElement('beforebegin',drawer);
      q('[data-studio-primary]',drawer)?.addEventListener('change',e=>setPrimary(e.target.value));
      drawer.addEventListener('change',e=>{
        const input=e.target.closest?.('[data-studio-specialty]');
        if(input)toggleSpecialty(input.dataset.studioSpecialty,input.checked);
      });
      q('[data-studio-custom]',drawer)?.addEventListener('input',e=>{
        custom=String(e.target.value||'').trimStart().slice(0,80);
        q('[data-studio-multi-summary]',drawer).textContent=summaryText();
        queuePersist();
      });
    }
    syncUi();
    return true;
  }

  async function load(){
    const id=cardId();
    if(!id||!window.supabaseClient?.rpc||loadedId===String(id))return;
    loadedId=String(id);
    try{
      const {data,error}=await window.supabaseClient.rpc('public_studio_profile',{p_card_id:id});
      if(error)throw error;
      if(data){
        const nextPrimary=TYPES[data.primary_type]?data.primary_type:'barber';
        const nextList=Array.isArray(data.specialties)?data.specialties.filter(x=>TYPES[x]):[];
        primary=nextPrimary;
        specialties=new Set(nextList.length?nextList:[nextPrimary]);
        specialties.add(primary);
        custom=String(data.custom_specialty||'').slice(0,80);
        syncUi();
        syncPrimaryAdapter();
      }
    }catch(error){console.warn('Studio profile load skipped:',error);}
  }

  function refresh(){if(mount())void load();}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-card-experience="barbershop"]'))setTimeout(refresh,40);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('[name="card_experience"],[name="color_mode"]'))setTimeout(refresh,40);
  },true);

  const timer=setInterval(()=>{if(mount()){void load();if(q('[data-studio-multi-drawer]'))clearInterval(timer);}},120);
  setTimeout(()=>clearInterval(timer),7000);

  const expose=()=>{
    if(!window.LIWStudio)return;
    try{
      Object.defineProperty(window.LIWStudio,'specialties',{configurable:true,get:()=>[...specialties]});
      Object.defineProperty(window.LIWStudio,'customSpecialty',{configurable:true,get:()=>custom});
      window.LIWStudio.setProfile=(nextPrimary,nextSpecialties,nextCustom='')=>{
        primary=TYPES[nextPrimary]?nextPrimary:'other';
        specialties=new Set((Array.isArray(nextSpecialties)?nextSpecialties:[]).filter(x=>TYPES[x]));
        specialties.add(primary);
        custom=String(nextCustom||'').slice(0,80);
        syncUi();syncPrimaryAdapter();queuePersist();
      };
    }catch(_){}
  };
  setTimeout(expose,300);
  setTimeout(expose,1200);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();