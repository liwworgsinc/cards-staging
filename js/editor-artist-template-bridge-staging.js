/* LIW Cards staging — Artist Card inherits the selected LIW template design. */
(function(){
  'use strict';
  if(window.__LIW_ARTIST_TEMPLATE_BRIDGE__)return;
  window.__LIW_ARTIST_TEMPLATE_BRIDGE__=true;

  function val(name,fallback=''){const el=document.querySelector(`[name="${name}"]`);const value=String(el?.value??'').trim();return value||fallback;}
  function templateName(){const text=String(document.getElementById('template-selected-summary')?.textContent||'').trim();return text&&text.toLowerCase()!=='custom design'?text:'Custom design';}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function design(){return {name:templateName(),primary:val('primary_color','#0b1438'),secondary:val('secondary_color','#d4a84f'),background:val('background_color','#ffffff'),font:val('font_family','DM Sans'),buttonStyle:val('button_style','filled')};}

  function render(node){
    const d=design();
    const badge=node.querySelector('[data-artist-template-name]');if(badge)badge.textContent=d.name;
    const colors=[d.primary,d.secondary,d.background];
    node.querySelectorAll('[data-artist-template-color]').forEach((el,i)=>{el.style.background=colors[i]||'#fff';el.title=colors[i]||'';});
    const font=node.querySelector('[data-artist-template-font]');if(font)font.textContent=d.font;
    const button=node.querySelector('[data-artist-template-button-style]');if(button)button.textContent=String(d.buttonStyle||'filled').replace(/\b\w/g,m=>m.toUpperCase());
  }

  function mount(){
    const root=document.getElementById('artist-dressing-room');if(!root)return false;
    const profile=root.querySelector('[data-artist-panel="profile"]');if(!profile)return false;
    let node=root.querySelector('[data-artist-template-bridge]');
    if(!node){
      node=document.createElement('section');node.className='artist-template-bridge';node.dataset.artistTemplateBridge='true';
      node.innerHTML=`
        <div class="artist-template-bridge-head"><div><strong>${icon('palette',18)} Template styling</strong><p>The Artist Card keeps the LIW template colors, font and button style you selected above.</p></div><span class="artist-template-badge" data-artist-template-name>Custom design</span></div>
        <div class="artist-template-preview">
          <div class="artist-template-palette"><i class="artist-template-color" data-artist-template-color></i><i class="artist-template-color" data-artist-template-color></i><i class="artist-template-color" data-artist-template-color></i></div>
          <div class="artist-template-meta"><div class="artist-template-meta-row"><span>Font</span><strong data-artist-template-font>DM Sans</strong></div><div class="artist-template-meta-row"><span>Buttons</span><strong data-artist-template-button-style>Filled</strong></div></div>
        </div>
        <div class="artist-template-note">${icon('sparkles',16)}<span>Showtime changes the artist layout, not the brand identity. Switch templates anytime and the Artist Card follows it.</span></div>
        <div class="artist-template-actions"><button class="btn btn-light btn-sm" type="button" data-artist-change-template>${icon('layout-template',15)} Change template</button></div>`;
      profile.appendChild(node);
      node.querySelector('[data-artist-change-template]')?.addEventListener('click',()=>{document.getElementById('template-grid')?.scrollIntoView({behavior:'smooth',block:'start'});});
    }else if(node.parentElement!==profile){profile.appendChild(node);}
    render(node);if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  document.addEventListener('input',event=>{if(event.target?.matches?.('[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="font_family"],[name="button_style"]'))setTimeout(()=>{const n=document.querySelector('[data-artist-template-bridge]');if(n)render(n);},0);},true);
  document.addEventListener('click',event=>{if(event.target?.closest?.('.template-card'))setTimeout(mount,120);},true);
  let tries=0;const timer=setInterval(()=>{tries++;if(mount()&&tries>16)clearInterval(timer);if(tries>100)clearInterval(timer);},250);mount();
})();