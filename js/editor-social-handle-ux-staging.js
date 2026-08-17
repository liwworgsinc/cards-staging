/* LIW Cards — cards-staging only: handle-first social link editor.
   Customers type a username/handle for common platforms; LIW stores a valid URL. */
(function(){
  'use strict';
  if(window.__LIW_SOCIAL_HANDLE_UX__) return;
  window.__LIW_SOCIAL_HANDLE_UX__ = true;

  const STYLE_ID='liw-social-handle-ux-style';
  const HANDLE_RULES={
    instagram:{label:'Instagram username',prefix:'@',placeholder:'damionthomas',build:h=>`https://instagram.com/${h}`},
    facebook:{label:'Facebook username or page',prefix:'@',placeholder:'yourbusiness',build:h=>`https://facebook.com/${h}`},
    linkedin:{label:'LinkedIn handle',prefix:'@',placeholder:'yourname',build:h=>/^((in|company|school)\/)/i.test(h)?`https://linkedin.com/${h}`:`https://linkedin.com/in/${h}`},
    tiktok:{label:'TikTok username',prefix:'@',placeholder:'yourname',build:h=>`https://tiktok.com/@${h}`},
    youtube:{label:'YouTube handle',prefix:'@',placeholder:'yourchannel',build:h=>`https://youtube.com/@${h}`},
    x:{label:'X username',prefix:'@',placeholder:'yourname',build:h=>`https://x.com/${h}`},
    twitter:{label:'X / Twitter username',prefix:'@',placeholder:'yourname',build:h=>`https://x.com/${h}`},
    threads:{label:'Threads username',prefix:'@',placeholder:'yourname',build:h=>`https://threads.net/@${h}`},
    snapchat:{label:'Snapchat username',prefix:'@',placeholder:'yourname',build:h=>`https://snapchat.com/add/${h}`},
    pinterest:{label:'Pinterest username',prefix:'@',placeholder:'yourname',build:h=>`https://pinterest.com/${h}`},
    github:{label:'GitHub username',prefix:'@',placeholder:'yourname',build:h=>`https://github.com/${h}`},
    twitch:{label:'Twitch username',prefix:'@',placeholder:'yourname',build:h=>`https://twitch.tv/${h}`},
    telegram:{label:'Telegram username',prefix:'@',placeholder:'yourname',build:h=>`https://t.me/${h}`},
    whatsapp:{label:'WhatsApp number',prefix:'+',placeholder:'1 347 555 0123',mode:'phone',build:h=>`https://wa.me/${String(h||'').replace(/\D/g,'')}`}
  };

  const esc=value=>{
    if(typeof escapeHtml==='function') return escapeHtml(String(value??''));
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  };
  const key=value=>{
    try{return typeof socialKey==='function'?socialKey(value):String(value||'').trim().toLowerCase();}
    catch(_){return String(value||'').trim().toLowerCase();}
  };
  const metaFor=platform=>{
    try{return typeof socialMeta==='function'?socialMeta(platform):{key:key(platform),label:String(platform||'Social'),placeholder:'https://'};}
    catch(_){return {key:key(platform),label:String(platform||'Social'),placeholder:'https://'};}
  };
  const iconFor=(platform,size=18)=>{
    try{return typeof socialIconHtml==='function'?socialIconHtml(platform,{size}):'';}
    catch(_){return '';}
  };

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .liw-social-helper{display:flex;align-items:flex-start;gap:10px;margin:0 0 12px;padding:11px 12px;border:1px solid #dfe6ef;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#fff);color:#4a5870;font-size:.72rem;line-height:1.4}
      .liw-social-helper-icon{width:30px;height:30px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;background:#0b1438;color:#fff}
      .liw-social-helper strong{display:block;color:#0b1438;font-size:.76rem;margin-bottom:2px}
      .liw-social-handle-row{display:grid!important;grid-template-columns:38px minmax(116px,148px) minmax(0,1fr) 38px!important;gap:9px!important;align-items:start!important;padding:10px!important;border:1px solid #e3e8f0!important;border-radius:14px!important;background:#fff!important;box-shadow:0 4px 12px rgba(11,20,56,.035)}
      .liw-social-handle-row .social-row-icon{margin-top:4px}.liw-social-entry{display:grid;gap:5px;min-width:0}
      .liw-social-input-shell{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;min-height:42px;border:1px solid #d7deea;border-radius:11px;background:#fbfcfe;overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
      .liw-social-input-shell:focus-within{border-color:#7d8fb0;box-shadow:0 0 0 3px rgba(11,20,56,.08);background:#fff}
      .liw-social-prefix{padding:0 0 0 11px;color:#6b7890;font-weight:900;font-size:.86rem;user-select:none}
      .liw-social-handle-input{width:100%;min-width:0;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;padding:10px 8px!important;font:750 .78rem/1.2 inherit!important;color:#17233a!important}
      .liw-social-handle-input::placeholder{color:#9aa5b6;font-weight:650}
      .liw-social-ready{display:grid;place-items:center;width:27px;height:27px;margin-right:6px;border-radius:999px;background:#e9f8ef;color:#168547;font-weight:950;font-size:.74rem;opacity:0;transform:scale(.85);transition:.15s ease}.liw-social-input-shell.is-ready .liw-social-ready{opacity:1;transform:scale(1)}
      .liw-social-hint{display:flex;align-items:center;gap:5px;min-width:0;color:#778399;font-size:.6rem;line-height:1.25}.liw-social-hint strong{color:#4f5e78;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .liw-social-handle-row>select.input{min-height:42px;font-size:.72rem;padding:8px 9px}.liw-social-handle-row>.icon-btn{margin-top:4px}
      .liw-social-handle-row[data-entry-mode="url"] .liw-social-prefix{display:none}.liw-social-handle-row[data-entry-mode="url"] .liw-social-handle-input{padding-left:11px!important}.liw-social-handle-row[data-entry-mode="phone"] .liw-social-prefix{color:#168547}
      @media(max-width:700px){.liw-social-handle-row{grid-template-columns:34px minmax(0,1fr) 36px!important}.liw-social-handle-row>select.input{grid-column:2/3;grid-row:1}.liw-social-handle-row .liw-social-entry{grid-column:2/3;grid-row:2}.liw-social-handle-row>.icon-btn{grid-column:3;grid-row:1;margin-top:3px}.liw-social-handle-row .social-row-icon{grid-column:1;grid-row:1/3}}
    `;
    document.head.appendChild(style);
  }

  function cleanHandle(raw){let value=String(raw||'').trim();if(/^https?:\/\//i.test(value)) return value;return value.replace(/^@+/,'').replace(/^\/+/, '').replace(/\s+/g,'');}
  function normalizeFullUrl(raw){const value=String(raw||'').trim();if(!value)return '';if(/^https?:\/\//i.test(value))return value;return `https://${value.replace(/^\/+/, '')}`;}
  function buildStoredUrl(platform,raw){const platformKey=key(platform);const rule=HANDLE_RULES[platformKey];const value=String(raw||'').trim();if(!value)return '';if(/^https?:\/\//i.test(value))return value;if(!rule)return normalizeFullUrl(value);if(rule.mode==='phone'){const digits=value.replace(/\D/g,'');return digits?rule.build(digits):'';}const handle=cleanHandle(value);return handle?rule.build(handle):'';}
  function displayValue(platform,url){const platformKey=key(platform);const rule=HANDLE_RULES[platformKey];const value=String(url||'').trim();if(!value)return '';if(!/^https?:\/\//i.test(value))return rule?.mode==='phone'?value.replace(/\D/g,''):cleanHandle(value);if(!rule)return value;try{const parsed=new URL(value);let path=parsed.pathname.replace(/^\/+|\/+$/g,'');if(rule.mode==='phone')return path.replace(/\D/g,'');if(platformKey==='linkedin'){path=path.replace(/^(in|company|school)\//i,m=>m.toLowerCase());return path;}if(platformKey==='snapchat')path=path.replace(/^add\//i,'');if(platformKey==='tiktok'||platformKey==='youtube'||platformKey==='threads')path=path.replace(/^@/,'');return cleanHandle(path.split('/')[0]||path);}catch(_){return value;}}
  function entryMode(platform){const rule=HANDLE_RULES[key(platform)];return rule?.mode||(rule?'handle':'url');} function ruleFor(platform){return HANDLE_RULES[key(platform)]||null;}
  function hintText(platform,storedUrl){const rule=ruleFor(platform);if(!rule)return storedUrl?'Full link ready':'Paste the full profile link for this platform';if(rule.mode==='phone')return storedUrl?`Link ready · ${storedUrl.replace(/^https?:\/\//,'')}`:'Enter the number with country code';return storedUrl?`Link ready · ${storedUrl.replace(/^https?:\/\//,'')}`:'Just type the username — no full URL needed';}
  function ensureIntro(){const list=document.getElementById('social-list');if(!list||document.querySelector('.liw-social-helper'))return;const helper=document.createElement('div');helper.className='liw-social-helper';helper.innerHTML='<span class="liw-social-helper-icon"><i data-lucide="at-sign" size="16"></i></span><div><strong>No full social URLs to memorize</strong><span>Pick a platform and type the username. LIW Cards builds the link automatically. Pasting a full link still works too.</span></div>';list.before(helper);if(window.lucide)try{lucide.createIcons();}catch(_){}}

  function renderRows(){injectStyles();ensureIntro();const list=document.getElementById('social-list');if(!list)return;let links;try{links=socialLinks;}catch(_){return;}const options=(window.DOTCO_SOCIALS||[]).map(item=>`<option value="${esc(item.key)}">${esc(item.label)}</option>`).join('');if(!links.length){list.innerHTML='<div class="social-empty-state"><i data-lucide="share-2" size="18"></i><span>No social links yet. Tap a platform above or add one below.</span></div>';if(window.lucide)try{lucide.createIcons();}catch(_){}return;}
    list.innerHTML=links.map((link,index)=>{const meta=metaFor(link.platform);const mode=entryMode(link.platform);const rule=ruleFor(link.platform);const display=displayValue(link.platform,link.url);const prefix=mode==='url'?'':(rule?.prefix||'@');const placeholder=rule?.placeholder||meta.placeholder||'https://your-profile-link';const inputMode=mode==='phone'?'tel':'text';const stored=buildStoredUrl(link.platform,display||link.url||'');return `<div class="social-row liw-social-handle-row" data-social-index="${index}" data-entry-mode="${mode}"><div class="social-row-icon">${iconFor(meta.key,18)}</div><select class="input liw-social-platform" aria-label="Social platform">${options}</select><div class="liw-social-entry"><label class="liw-social-input-shell ${stored?'is-ready':''}"><span class="liw-social-prefix">${esc(prefix)}</span><input class="liw-social-handle-input" type="text" inputmode="${inputMode}" autocapitalize="none" autocomplete="off" spellcheck="false" aria-label="${esc(rule?.label||`${meta.label} profile link`)}" placeholder="${esc(placeholder)}" value="${esc(display)}"><span class="liw-social-ready" aria-hidden="true">✓</span></label><small class="liw-social-hint"><i data-lucide="${stored?'link-2':'circle-help'}" size="11"></i><strong>${esc(hintText(link.platform,stored))}</strong></small></div><button type="button" class="icon-btn" aria-label="Remove ${esc(meta.label)}"><i data-lucide="trash-2" size="16"></i></button></div>`;}).join('');
    list.querySelectorAll('[data-social-index]').forEach(row=>{const index=Number(row.dataset.socialIndex);const select=row.querySelector('.liw-social-platform');const input=row.querySelector('.liw-social-handle-input');const remove=row.querySelector('.icon-btn');select.value=key(links[index].platform);function syncRow({save=true,rerender=false}={}){const platform=select.value;links[index].platform=platform;links[index].url=buildStoredUrl(platform,input.value);const shell=row.querySelector('.liw-social-input-shell');const hint=row.querySelector('.liw-social-hint strong');const icon=row.querySelector('.liw-social-hint i');shell?.classList.toggle('is-ready',Boolean(links[index].url));if(hint)hint.textContent=hintText(platform,links[index].url);if(icon)icon.setAttribute('data-lucide',links[index].url?'link-2':'circle-help');if(typeof render==='function')render();if(save&&typeof scheduleSave==='function')scheduleSave();if(window.lucide)try{lucide.createIcons();}catch(_){}if(rerender)setTimeout(renderRows,0);}select.addEventListener('change',()=>{const oldValue=input.value;const platform=select.value;links[index].platform=platform;row.dataset.entryMode=entryMode(platform);input.value=displayValue(platform,buildStoredUrl(platform,oldValue));syncRow({save:true,rerender:true});});input.addEventListener('input',()=>syncRow({save:true,rerender:false}));input.addEventListener('blur',()=>{const platform=select.value;const stored=buildStoredUrl(platform,input.value);input.value=displayValue(platform,stored);syncRow({save:true,rerender:false});});remove.addEventListener('click',()=>{links.splice(index,1);renderRows();if(typeof render==='function')render();if(typeof scheduleSave==='function')scheduleSave();});});if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function install(){injectStyles();let ready=false;try{ready=typeof renderSocialRows==='function'&&typeof socialLinks!=='undefined';}catch(_){ready=false;}if(!ready)return false;if(!renderSocialRows.__liwHandleUx){const enhanced=function(){renderRows();};enhanced.__liwHandleUx=true;renderSocialRows=enhanced;}renderRows();return true;}
  document.addEventListener('click',event=>{if(event.target.closest('[data-quick-social],#add-social,.editor-tab[data-tab="links"]'))setTimeout(renderRows,0);});
  let attempts=0;const timer=setInterval(()=>{attempts+=1;if(install()||attempts>=80)clearInterval(timer);},250);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50),{once:true});else setTimeout(install,50);
  window.LIWSocialHandleUX={refresh:renderRows,buildUrl:buildStoredUrl};
})();