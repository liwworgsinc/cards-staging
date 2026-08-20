/* LIW Cards staging — professional Supericons brand system.
   Brand marks use verified Supericons refs. Generic LIW interface icons stay on
   the app's native Lucide set so contact actions remain visually consistent. */
(() => {
  'use strict';
  if (window.__LIW_SUPERICONS_STAGING__) return;
  window.__LIW_SUPERICONS_STAGING__ = true;

  const brands = {
    instagram:{ref:'simple-icons:instagram',color:'#E4405F'},
    facebook:{ref:'simple-icons:facebook',color:'#1877F2'},
    whatsapp:{ref:'simple-icons:whatsapp',color:'#25D366'},
    linkedin:{ref:'bootstrap:linkedin',color:'#0A66C2',inline:'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>'},
    tiktok:{ref:'simple-icons:tiktok',color:'#111111'},
    youtube:{ref:'simple-icons:youtube',color:'#FF0000'},
    x:{ref:'simple-icons:x',color:'#111111'},
    twitter:{ref:'simple-icons:x',color:'#111111'},
    threads:{ref:'simple-icons:threads',color:'#111111'},
    pinterest:{ref:'simple-icons:pinterest',color:'#BD081C'},
    reddit:{ref:'simple-icons:reddit',color:'#FF4500'},
    telegram:{ref:'simple-icons:telegram',color:'#26A5E4'},
    github:{ref:'simple-icons:github',color:'#181717'},
    gitlab:{ref:'simple-icons:gitlab',color:'#FC6D26'},
    spotify:{ref:'simple-icons:spotify',color:'#1DB954'},
    soundcloud:{ref:'simple-icons:soundcloud',color:'#FF5500'},
    discord:{ref:'simple-icons:discord',color:'#5865F2'},
    twitch:{ref:'simple-icons:twitch',color:'#9146FF'},
    calendly:{ref:'simple-icons:calendly',color:'#006BFF'},
    linktree:{ref:'simple-icons:linktree',color:'#43E55E'},
    patreon:{ref:'simple-icons:patreon',color:'#111111'},
    behance:{ref:'simple-icons:behance',color:'#1769FF'},
    dribbble:{ref:'simple-icons:dribbble',color:'#EA4C89'},
    medium:{ref:'simple-icons:medium',color:'#111111'},
    upwork:{ref:'simple-icons:upwork',color:'#14A800'},
    fiverr:{ref:'simple-icons:fiverr',color:'#1DBF73'},
    replit:{ref:'simple-icons:replit',color:'#F26207'},
    snapchat:{ref:'simple-icons:snapchat',color:'#D6B800'},
    stackoverflow:{ref:'simple-icons:stackoverflow',color:'#F58025'}
  };

  function key(value){return String(value||'').trim().toLowerCase().replace(/^brand-/,'').replace(/\s+/g,'-');}
  function iconUrl(ref){const [collection,name]=String(ref||'').split(':');return collection&&name?`https://api.iconify.design/${collection}/${name}.svg`:'';}
  function brandMark(platform,size=18){
    const item=brands[key(platform)]; if(!item)return '';
    if(item.inline){
      return `<span class="liw-supericon-mark liw-supericon-inline" aria-hidden="true" style="width:${size}px;height:${size}px">${item.inline.replace('<svg ',`<svg width="${size}" height="${size}" `)}</span>`;
    }
    return `<span class="liw-supericon-mark liw-supericon-mask" aria-hidden="true" style="width:${size}px;height:${size}px;--liw-icon:url('${iconUrl(item.ref)}')"></span>`;
  }
  function brandHolder(platform,size=18){
    const name=key(platform),item=brands[name]; if(!item)return null;
    const holder=document.createElement('span');
    holder.className=`social-brand-icon liw-supericon social-brand-${name}`;
    holder.dataset.supericonReady='true';
    holder.dataset.supericonRef=item.ref;
    holder.style.setProperty('--brand',item.color);
    holder.innerHTML=brandMark(name,size);
    return holder;
  }

  function patchQuick(){
    document.querySelectorAll('[data-quick-social]').forEach(button=>{
      const platform=key(button.dataset.quickSocial),item=brands[platform];
      if(!item||button.dataset.supericonProfessional==='true')return;
      button.querySelectorAll(':scope > i[data-lucide],:scope > svg,:scope > .social-brand-icon,:scope > .liw-supericon-mark').forEach(el=>el.remove());
      button.insertAdjacentHTML('afterbegin',brandMark(platform,17));
      button.dataset.supericonProfessional='true';
      button.style.setProperty('--brand',item.color);
    });
  }
  function patchPicker(){
    document.querySelectorAll('.social-app-tile[data-social-app]').forEach(tile=>{
      const holder=brandHolder(tile.dataset.socialApp,18);if(!holder)return;
      tile.dataset.supericonReady='true';
      tile.classList.remove('has-connect-abbr');
      tile.querySelectorAll(':scope > .connect-platform-abbr').forEach(el=>el.remove());
      const old=tile.querySelector(':scope > .social-brand-icon,:scope > svg,:scope > i[data-lucide]');
      if(old?.dataset?.supericonRef===holder.dataset.supericonRef)return;
      if(old)old.replaceWith(holder);else tile.prepend(holder);
    });
  }
  function patchRows(){
    document.querySelectorAll('.social-row[data-social-index]').forEach(row=>{
      const platform=key(row.querySelector('select')?.value),slot=row.querySelector('.social-row-icon');
      const holder=brandHolder(platform,18);if(!slot||!holder)return;
      if(slot.firstElementChild?.dataset?.supericonRef===holder.dataset.supericonRef)return;
      slot.replaceChildren(holder);
    });
  }
  function patchRendered(){
    document.querySelectorAll('.social-brand-icon').forEach(current=>{
      if(current.dataset.supericonReady==='true')return;
      const cls=[...current.classList].find(c=>c.startsWith('social-brand-')&&c!=='social-brand-icon');
      const platform=cls?key(cls.replace('social-brand-','')):'';
      const holder=brandHolder(platform,18);if(holder)current.replaceWith(holder);
    });
  }

  let queued=false;
  function patch(){queued=false;patchQuick();patchPicker();patchRows();patchRendered();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(patch);}

  window.LIWSupericons={brands,refresh:queue,brandMark};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(queue,120);
  setTimeout(queue,700);
})();