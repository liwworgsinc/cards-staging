/* LIW Cards staging — Music Dressing Room uses the selected LIW template design. */
(function(){
  'use strict';
  if(window.__LIW_ARTIST_TEMPLATE_BRIDGE__)return;
  window.__LIW_ARTIST_TEMPLATE_BRIDGE__=true;

  function val(name,fallback=''){const el=document.querySelector(`[name="${name}"]`);const value=String(el?.value??'').trim();return value||fallback;}
  function templateName(){const text=String(document.getElementById('template-selected-summary')?.textContent||'').trim();return text&&text.toLowerCase()!=='custom design'?text:'Custom design';}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  function design(){return {
    name:templateName(),
    primary:val('primary_color','#7c3aed'),
    secondary:val('secondary_color','#2563eb'),
    background:val('background_color','#090b14'),
    text:val('text_color','#ffffff'),
    button:val('button_color',val('primary_color','#7c3aed')),
    buttonText:val('button_text_color','#ffffff'),
    font:val('font_family','DM Sans'),
    buttonStyle:val('button_style','filled')
  };}

  function legacyBlock(root){return Array.from(root.querySelectorAll('.artist-dressing-block')).find(block=>/glitz\s*&\s*glamour/i.test(block.querySelector('.artist-dressing-block-head strong')?.textContent||''));}

  function render(node){
    const d=design();
    const badge=node.querySelector('[data-artist-template-name]');if(badge)badge.textContent=d.name;
    const colors=[d.primary,d.secondary,d.button,d.background];
    node.querySelectorAll('[data-artist-template-color]').forEach((el,i)=>{el.style.background=colors[i]||'#111';el.title=colors[i]||'';});
    const font=node.querySelector('[data-artist-template-font]');if(font)font.textContent=d.font;
    const button=node.querySelector('[data-artist-template-button-style]');if(button)button.textContent=d.buttonStyle.replace(/\b\w/g,m=>m.toUpperCase());
    const colorCopy=node.querySelector('[data-artist-template-colors]');if(colorCopy)colorCopy.textContent=`${d.primary} · ${d.secondary}`;
  }

  function mount(){
    const root=document.getElementById('artist-dressing-room');if(!root)return false;
    const old=legacyBlock(root);if(old)old.dataset.legacyMusicGlam='true';
    let node=root.querySelector('[data-artist-template-bridge]');
    if(!node){
      node=document.createElement('section');node.className='artist-template-bridge';node.dataset.artistTemplateBridge='true';
      node.innerHTML=`
        <div class="artist-template-bridge-head"><div><strong>${icon('palette',18)} Template styling</strong><p>Music keeps the colors, font and button character from the LIW template selected above. The artist experience changes the layout — not your design.</p></div><span class="artist-template-badge" data-artist-template-name>Custom design</span></div>
        <div class="artist-template-preview">
          <div class="artist-template-palette" aria-label="Selected template colors"><i class="artist-template-color" data-artist-template-color></i><i class="artist-template-color" data-artist-template-color></i><i class="artist-template-color" data-artist-template-color></i><i class="artist-template-color" data-artist-template-color></i></div>
          <div class="artist-template-meta"><div class="artist-template-meta-row"><span>Font</span><strong data-artist-template-font>DM Sans</strong></div><div class="artist-template-meta-row"><span>Buttons</span><strong data-artist-template-button-style>Filled</strong></div><div class="artist-template-meta-row"><span>Core colors</span><strong data-artist-template-colors></strong></div></div>
        </div>
        <div class="artist-template-note">${icon('sparkles',16)}<span>No separate Music theme to fight your template. Pick Noir & Gold, Rose Atelier, Nightlife Neon, Electric Studio or any LIW template and Music will carry that same visual identity.</span></div>
        <div class="artist-template-actions"><button class="btn btn-light btn-sm" type="button" data-artist-change-template>${icon('layout-template',15)} Change template</button></div>`;
      if(old)old.insertAdjacentElement('beforebegin',node);else root.querySelector('.artist-dressing-savebar')?.insertAdjacentElement('beforebegin',node);
      node.querySelector('[data-artist-change-template]')?.addEventListener('click',()=>{document.getElementById('template-grid')?.scrollIntoView({behavior:'smooth',block:'start'});});
      const heading=root.querySelector('.artist-dressing-room-heading p');if(heading)heading.textContent='Build the artist experience here. Your selected LIW template controls the colors, typography and button style; Music adds releases, shows, merch, booking and full-screen artist rooms.';
    }
    render(node);if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  document.addEventListener('input',event=>{if(event.target?.matches?.('[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="text_color"],[name="button_color"],[name="button_text_color"],[name="font_family"],[name="button_style"]'))setTimeout(()=>{const n=document.querySelector('[data-artist-template-bridge]');if(n)render(n);},0);},true);
  document.addEventListener('click',event=>{if(event.target?.closest?.('.template-card'))setTimeout(()=>{mount();const n=document.querySelector('[data-artist-template-bridge]');if(n)render(n);},120);},true);
  let tries=0;const timer=setInterval(()=>{tries++;if(mount()&&tries>12)clearInterval(timer);if(tries>100)clearInterval(timer);},250);mount();
})();
