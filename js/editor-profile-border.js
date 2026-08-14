(function(){
  const ENTITLEMENT='profile_border_color';
  let mounted=false;

  function currentAccess(){
    try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}
  }

  function isAllowed(){
    const access=currentAccess();
    return Boolean(access&&((access.isAdmin&&!access.isPlanPreview)||access.has?.(ENTITLEMENT)));
  }

  function hex(value){
    const normalized=String(value||'').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized)?normalized:'';
  }

  function hiddenField(){return document.querySelector('[name="profile_border_color"]');}
  function picker(){return document.getElementById('profile-border-custom');}
  function designColor(){return hex(document.querySelector('[name="primary_color"]')?.value)||'#ffffff';}

  function refreshUi(){
    const root=document.getElementById('profile-border-color-control');
    const stored=hex(hiddenField()?.value);
    const allowed=isAllowed();
    if(!root)return;

    root.classList.toggle('locked',!allowed);
    root.dataset.allowed=allowed?'true':'false';
    root.querySelectorAll('button,input[type="color"]').forEach(control=>{control.disabled=!allowed;});
    const badge=root.querySelector('[data-profile-border-badge]');
    if(badge){
      badge.className=`entitlement-badge ${allowed?'included':'locked'}`;
      badge.innerHTML=allowed?'<i data-lucide="circle-check" size="14"></i> Pro+ included':'<i data-lucide="lock" size="14"></i> Pro+';
    }
    if(!allowed&&hiddenField())hiddenField().value='';

    const display=stored||designColor();
    if(picker())picker().value=display;
    root.querySelectorAll('[data-profile-border-color]').forEach(button=>{
      button.classList.toggle('active',Boolean(stored)&&hex(button.dataset.profileBorderColor)===stored);
    });
    root.querySelector('[data-profile-border-auto]')?.classList.toggle('active',!stored);
    const code=root.querySelector('[data-profile-border-hex]');
    if(code)code.textContent=stored?stored.toUpperCase():'MATCH DESIGN';
    const ring=root.querySelector('[data-profile-border-preview]');
    if(ring)ring.style.setProperty('--profile-border-preview',stored||designColor());
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function apply(value){
    if(!isAllowed()){
      if(typeof toast==='function')toast('Profile border color is included with Pro and Agency plans.');
      return;
    }
    const field=hiddenField();
    if(!field)return;
    field.value=hex(value);
    refreshUi();
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
  }

  function mount(){
    if(mounted)return true;
    const stack=document.querySelector('.design-advanced-details .advanced-design-stack');
    if(!stack)return false;

    const section=document.createElement('div');
    section.className='form-section premium-profile-border-control';
    section.id='profile-border-color-control';
    section.innerHTML=`
      <input type="hidden" name="profile_border_color" value="">
      <div class="profile-border-control-head">
        <div><h3>Profile photo border</h3><p>Keep the template border or choose a custom ring color.</p></div>
        <span class="entitlement-badge" data-profile-border-badge>Checking</span>
      </div>
      <div class="profile-border-picker-shell">
        <div class="profile-border-preview" data-profile-border-preview aria-hidden="true"><span></span></div>
        <div class="profile-border-options">
          <div class="profile-border-presets" role="group" aria-label="Profile photo border presets">
            <button class="profile-border-auto" type="button" data-profile-border-auto><i data-lucide="wand-sparkles" size="14"></i><span>Match design</span></button>
            <button class="profile-border-swatch" type="button" aria-label="White border" data-profile-border-color="#ffffff" style="--swatch:#ffffff"></button>
            <button class="profile-border-swatch" type="button" aria-label="Gold border" data-profile-border-color="#d4a84f" style="--swatch:#d4a84f"></button>
            <button class="profile-border-swatch" type="button" aria-label="Navy border" data-profile-border-color="#0b1438" style="--swatch:#0b1438"></button>
            <button class="profile-border-swatch" type="button" aria-label="Black border" data-profile-border-color="#111827" style="--swatch:#111827"></button>
          </div>
          <div class="profile-border-custom-row">
            <label for="profile-border-custom">Custom color</label>
            <div class="profile-border-custom-control"><input id="profile-border-custom" type="color" value="#ffffff" aria-label="Custom profile photo border color"><code data-profile-border-hex>MATCH DESIGN</code></div>
          </div>
        </div>
      </div>`;

    const styleSection=Array.from(stack.children).find(child=>child.querySelector?.('h3')?.textContent?.trim()==='Style details');
    if(styleSection)styleSection.insertAdjacentElement('afterend',section);
    else stack.prepend(section);

    section.querySelector('[data-profile-border-auto]')?.addEventListener('click',()=>apply(''));
    section.querySelectorAll('[data-profile-border-color]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.profileBorderColor)));
    picker()?.addEventListener('input',event=>apply(event.target.value));
    mounted=true;
    refreshUi();
    return true;
  }

  window.LIWProfileBorder={refresh:refreshUi,designColor};

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(mount())refreshUi();
    if(mounted&&currentAccess()){refreshUi();clearInterval(timer);}
    else if(attempts>80)clearInterval(timer);
  },150);
  mount();
})();
