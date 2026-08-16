/* LIW Cards staging only — industry-specific cover presets. */
(function(){
  const INDUSTRY_COVERS=[
    {name:'Barber',url:'assets/covers/industry-barber.svg'},
    {name:'Realtor',url:'assets/covers/industry-realtor.svg'},
    {name:'Tax Pro',url:'assets/covers/industry-tax.svg'},
    {name:'Mechanic',url:'assets/covers/industry-mechanic.svg'},
    {name:'Beauty / Salon',url:'assets/covers/industry-salon.svg'},
    {name:'Restaurant',url:'assets/covers/industry-restaurant.svg'}
  ];
  const field=name=>document.querySelector(`[name="${name}"]`);
  const locked=()=>document.getElementById('cover-image-section')?.classList.contains('locked');
  function notify(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function currentCover(){return String(field('cover_image_url')?.value||'');}
  function sync(){
    const value=currentCover();
    document.querySelectorAll('[data-liw-industry-cover]').forEach(btn=>{
      btn.classList.toggle('active',value===btn.dataset.coverUrl||value.endsWith(btn.dataset.coverUrl));
      btn.disabled=locked();
    });
  }
  function apply(url){
    if(locked())return;
    const hidden=field('cover_image_url');
    if(!hidden)return;
    try{coverUrl=url;}catch(_){ }
    hidden.value=url;
    notify(hidden);
    const summary=document.getElementById('template-selected-summary');if(summary)summary.textContent='Customized';
    try{updateCoverPreview();}catch(_){ }
    try{render();}catch(_){ }
    try{scheduleSave();}catch(_){ }
    sync();
  }
  function mount(){
    const studio=document.getElementById('premium-cover-studio');
    const artwork=studio?.querySelector('.premium-cover-gallery');
    if(!studio||!artwork)return false;
    if(studio.querySelector('[data-liw-industry-gallery]')){sync();return true;}
    const label=document.createElement('div');
    label.className='premium-cover-label';
    label.textContent='Industry covers';
    const gallery=document.createElement('div');
    gallery.className='premium-cover-gallery';
    gallery.dataset.liwIndustryGallery='true';
    gallery.innerHTML=INDUSTRY_COVERS.map(item=>`<button type="button" class="premium-cover-card" data-liw-industry-cover="true" data-cover-url="${item.url}" aria-label="Use ${item.name} cover"><span class="premium-cover-art" style="background-image:url('${item.url}')"></span><strong>${item.name}</strong></button>`).join('');
    artwork.after(label,gallery);
    gallery.querySelectorAll('[data-liw-industry-cover]').forEach(btn=>btn.addEventListener('click',()=>apply(btn.dataset.coverUrl)));
    field('cover_image_url')?.addEventListener('change',sync);
    document.getElementById('remove-cover')?.addEventListener('click',()=>setTimeout(sync,0));
    sync();
    return true;
  }
  let attempts=0;const timer=setInterval(()=>{attempts+=1;if(mount()||attempts>=50)clearInterval(timer);},300);
})();
