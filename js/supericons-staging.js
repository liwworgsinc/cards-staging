/* LIW Cards staging — professional Supericons brand system.
   Brand marks use verified Supericons results. Generic LIW interface icons stay
   on the app's native Lucide set so actions and brand logos never get mixed. */
(() => {
  'use strict';
  if (window.__LIW_SUPERICONS_STAGING__) return;
  window.__LIW_SUPERICONS_STAGING__ = true;

  /* Exact SVGs below for Buy Me A Coffee, Ko-fi and GoFundMe were retrieved
     from Supericons' verified Simple Icons library. */
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
    stackoverflow:{ref:'simple-icons:stackoverflow',color:'#F58025'},
    buymeacoffee:{ref:'simpleicons:buymeacoffee',color:'#FFDD00',inline:'<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/></svg>'},
    kofi:{ref:'simpleicons:kofi',color:'#FF5E5B',inline:'<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298"/></svg>'},
    gofundme:{ref:'simpleicons:gofundme',color:'#02A95C',inline:'<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6236 4.0792l-4.2223 3.0705c-.6695.4892-.8127 1.4224-.3309 2.0922.4892.6698 1.4221.8128 2.0921.3312l4.2219-3.0706c.67-.4892.8127-1.4224.3313-2.0922a1.4883 1.4883 0 0 0-2.092-.3312zm-9.6483-1.1816c-.8278 0-1.4978.6698-1.4978 1.4976v2.5212c0 .8279.67 1.4977 1.4978 1.4977.8279 0 1.4974-.6698 1.4974-1.4977V4.3952c0-.8278-.6695-1.4976-1.4974-1.4976zM.2877 4.4103c-.4892.6698-.3387 1.603.3308 2.0922L4.841 9.573c.6695.4891 1.6029.3386 2.092-.3312.4893-.6698.3387-1.603-.3313-2.0922L2.3798 4.0792c-.6773-.4817-1.6107-.3387-2.092.331zm3.695 7.7893C6.1051 10.303 8.905 9.144 11.9753 9.144c3.0705 0 5.8702 1.159 7.9926 3.0555zm14.5556 1.6335c-1.3473 0-2.236.4433-2.8004.9926-.5948.587-1.0232 1.5058-1.0232 2.6497 0 1.302.5646 2.1445 1.0089 2.5885.843.843 1.926 1.0385 2.829 1.0385 1.4827 0 2.2804-.4586 2.7843-.9478.5043-.4892.7234-1.024.8284-1.4078H19.825c-.1056.2107-.279.3687-.4296.459-.3083.1656-.7368.1814-.797.1814-.5492 0-.8583-.1883-1.0088-.3388-.2933-.286-.4296-.7757-.4296-1.1445h5.095v-.2634c0-.7601-.12-1.9567-1.0833-2.8749-.8132-.7676-1.8358-.9325-2.6334-.9325zm.0601 1.5577c.241 0 .6845.0448 1.008.3684.1881.1882.3384.4744.399.7378h-2.77c.0455-.3085.2038-.5572.3694-.7378.2561-.2634.5797-.3684.9936-.3684zm-16.851-1.3549h2.446v.8279c.5795-.7 1.377-.9483 2.047-.9483.4893 0 .9482.1054 1.3171.3086.5044.2634.783.6397.948.9783.2786-.4892.6251-.7827.9335-.9482.4892-.2785.9632-.3387 1.4226-.3387.5038 0 1.3317.0753 1.8961.6247.61.5945.6397 1.4073.6397 1.8814v4.4553h-2.4459v-3.379c0-.7226-.0753-1.2117-.3533-1.4676-.1359-.1204-.324-.2258-.6397-.2258-.2786 0-.5044.0753-.7228.2785-.414.3988-.4437.9633-.4437 1.302v3.507H6.346v-3.3791c0-.6548-.0454-1.1816-.324-1.4676-.2106-.2258-.4891-.2784-.7374-.2784-.2634 0-.474.0451-.6695.2483-.429.414-.429 1.0687-.429 1.4977v3.3791H1.74v-6.856Z"/></svg>'}
  };

  function injectStyles(){
    if(document.getElementById('liw-supericons-staging-style'))return;
    const style=document.createElement('style');
    style.id='liw-supericons-staging-style';
    style.textContent=`
      .liw-supericon-mark{display:inline-grid;place-items:center;flex:0 0 auto;color:var(--brand,currentColor);line-height:0}
      .liw-supericon-inline svg{display:block;width:100%;height:100%;fill:currentColor}
      .liw-supericon-mask{display:inline-block;background:var(--brand,currentColor);-webkit-mask:var(--liw-icon) center/contain no-repeat;mask:var(--liw-icon) center/contain no-repeat}
    `;
    document.head.appendChild(style);
  }

  function key(value){return String(value||'').trim().toLowerCase().replace(/^brand-/,'').replace(/\s+/g,'-');}
  function iconUrl(ref){const [collection,name]=String(ref||'').split(':');return collection&&name?`https://api.iconify.design/${collection}/${name}.svg`:'';}
  function brandMark(platform,size=18){
    const item=brands[key(platform)]; if(!item)return '';
    if(item.inline){
      return `<span class="liw-supericon-mark liw-supericon-inline" data-supericon-ref="${item.ref}" aria-hidden="true" style="width:${size}px;height:${size}px">${item.inline.replace('<svg ',`<svg width="${size}" height="${size}" `)}</span>`;
    }
    return `<span class="liw-supericon-mark liw-supericon-mask" data-supericon-ref="${item.ref}" aria-hidden="true" style="width:${size}px;height:${size}px;--liw-icon:url('${iconUrl(item.ref)}')"></span>`;
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
  function patch(){queued=false;injectStyles();patchQuick();patchPicker();patchRows();patchRendered();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(patch);}

  injectStyles();
  window.LIWSupericons={brands,refresh:queue,brandMark};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(queue,120);
  setTimeout(queue,700);
})();