(function(){
  const ROOT_ID='business-tools-content';
  const SOURCE_CLASS='liw-toolkit-source-vault';
  const META={
    services:{title:'Services',category:'sell',icon:'list-checks',description:'Show what you offer, pricing, and the next step for customers.'},
    booking:{title:'Appointment booking',category:'customer',icon:'calendar-check-2',description:'Give customers a direct way to book time with you.'},
    leads:{title:'Lead capture',category:'customer',icon:'inbox',description:'Collect customer details and inquiries directly from your card.'},
    products:{title:'Product showcase',category:'sell',icon:'shopping-bag',description:'Feature products with images, prices, and buy links.'},
    paymentSharing:{title:'Share payment information',category:'payments',icon:'hand-coins',description:'Share Cash App, Venmo, PayPal, or Zelle details.'},
    paymentLink:{title:'Payment link',category:'payments',icon:'badge-dollar-sign',description:'Send customers to your checkout or invoice link.'},
    beef:{title:'Beef Your Card Up',category:'enhance',icon:'sparkles',description:'Add hours, reviews, galleries, FAQs, locations, credentials, and more.'}
  };
  const CATEGORIES=[['all','All tools','layout-grid'],['customer','Connect','messages-square'],['sell','Sell','store'],['payments','Payments','wallet-cards'],['enhance','Enhance','sparkles']];
  let root=null,vault=null,grid=null,drawer=null,drawerBody=null,backdrop=null,activeKey=null,previousFocus=null;
  const icon=(name,size=18)=>`<i data-lucide="${name}" size="${size}"></i>`;
  const text=el=>(el?.textContent||'').trim();

  function sources(){
    if(!root)return {};
    const cards=Array.from(root.querySelectorAll(':scope > .tool-editor-card, .'+SOURCE_CLASS+' > .tool-editor-card'));
    const byTitle=needle=>cards.find(card=>text(card.querySelector('.tool-editor-head h3')).toLowerCase().includes(needle));
    return {
      services:byTitle('services'),booking:byTitle('appointment booking'),leads:byTitle('lead capture'),products:byTitle('product showcase'),
      paymentSharing:cards.find(card=>card.classList.contains('payment-sharing-editor'))||byTitle('share payment'),paymentLink:byTitle('payment link'),beef:document.getElementById('rich-card-builder')
    };
  }

  function status(key,source){
    if(!source)return {label:'Unavailable',tone:'muted'};
    if(key==='beef'){
      const count=source.querySelectorAll('.rich-section-editor[data-enabled="true"]').length;
      return count?{label:`${count} active`,tone:'active'}:{label:'Optional',tone:'ready'};
    }
    const locked=source.classList.contains('locked')||source.querySelector('.entitlement-badge.locked');
    if(locked)return {label:text(source.querySelector('.entitlement-badge.locked'))||'Upgrade',tone:'locked'};
    const toggle=source.querySelector('input[type="checkbox"]');
    if(toggle?.checked)return {label:'Active',tone:'active'};
    if(key==='paymentLink'&&source.querySelector('[name="payment_url"]')?.value?.trim())return {label:'Active',tone:'active'};
    const badge=source.querySelector('.entitlement-badge');
    const badgeText=text(badge);
    if(badgeText&&badgeText.toLowerCase()!=='checking')return {label:badgeText,tone:'ready'};
    return {label:'Ready',tone:'ready'};
  }

  function buildDrawer(){
    backdrop=document.createElement('div');backdrop.className='liw-toolkit-backdrop';backdrop.hidden=true;
    drawer=document.createElement('aside');drawer.className='liw-toolkit-drawer';drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML=`<div class="liw-toolkit-drawer-head"><div class="liw-toolkit-drawer-title"><span class="liw-toolkit-drawer-icon"></span><div><small>Configure tool</small><strong>Business tool</strong></div></div><button class="liw-toolkit-close" type="button" aria-label="Close configuration">${icon('x',19)}</button></div><div class="liw-toolkit-drawer-body"></div>`;
    drawerBody=drawer.querySelector('.liw-toolkit-drawer-body');document.body.append(backdrop,drawer);
    backdrop.addEventListener('click',closeDrawer);drawer.querySelector('.liw-toolkit-close').addEventListener('click',closeDrawer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeKey)closeDrawer();});
  }

  function buildShell(){
    if(root.querySelector('.liw-toolkit-shell'))return;
    vault=document.createElement('div');vault.className=SOURCE_CLASS;vault.hidden=true;
    Array.from(root.children).filter(el=>el.classList?.contains('tool-editor-card')).forEach(el=>vault.appendChild(el));
    const shell=document.createElement('section');shell.className='liw-toolkit-shell';
    shell.innerHTML=`<div class="liw-toolkit-hero"><div class="liw-toolkit-hero-icon">${icon('wand-sparkles',21)}</div><div><h3>Choose what your card can do</h3><p>Add only the tools your business needs. Powerful settings stay organized here instead of making the editor one long page.</p></div><div class="liw-toolkit-summary"><strong data-liw-active-count>0</strong><span>active</span></div></div><div class="liw-toolkit-nav" role="tablist">${CATEGORIES.map(([key,label,ic],i)=>`<button type="button" class="liw-toolkit-filter ${i===0?'active':''}" data-filter="${key}" aria-selected="${i===0?'true':'false'}">${icon(ic,16)}<span>${label}</span></button>`).join('')}</div><div class="liw-toolkit-grid"></div>`;
    root.append(shell,vault);grid=shell.querySelector('.liw-toolkit-grid');buildDrawer();
    shell.querySelectorAll('.liw-toolkit-filter').forEach(btn=>btn.addEventListener('click',()=>{
      shell.querySelectorAll('.liw-toolkit-filter').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false');});btn.classList.add('active');btn.setAttribute('aria-selected','true');applyFilter(btn.dataset.filter);
    }));
  }

  function tile(key,source){
    const meta=META[key],s=status(key,source),locked=s.tone==='locked';
    return `<button class="liw-toolkit-tile" type="button" data-tool="${key}" data-category="${meta.category}" ${source?'':'disabled'}><span class="liw-toolkit-tile-top"><span class="liw-toolkit-icon">${icon(meta.icon,20)}</span><span class="liw-toolkit-status ${s.tone}">${s.label}</span></span><span class="liw-toolkit-tile-copy"><strong>${meta.title}</strong><small>${meta.description}</small></span><span class="liw-toolkit-tile-action"><span>${locked?'View access':'Configure'}</span>${icon('arrow-right',16)}</span></button>`;
  }

  function render(){
    if(!grid)return;const current=root.querySelector('.liw-toolkit-filter.active')?.dataset.filter||'all',all=sources();
    grid.innerHTML=Object.keys(META).map(key=>tile(key,all[key])).join('');
    grid.querySelectorAll('.liw-toolkit-tile').forEach(btn=>btn.addEventListener('click',()=>openDrawer(btn.dataset.tool)));
    applyFilter(current);refreshCount();if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function applyFilter(filter){grid?.querySelectorAll('.liw-toolkit-tile').forEach(btn=>btn.hidden=filter!=='all'&&btn.dataset.category!==filter);}
  function refreshCount(){const all=sources(),counter=root?.querySelector('[data-liw-active-count]');if(counter)counter.textContent=String(Object.entries(all).filter(([k,v])=>status(k,v).tone==='active').length);}

  function openDrawer(key){
    const source=sources()[key];if(!source)return;if(activeKey)closeDrawer(false);previousFocus=document.activeElement;activeKey=key;
    source.hidden=false;source.classList.add('liw-toolkit-config-source');
    if(key==='beef'){source.classList.add('liw-beef-in-drawer');const stack=source.querySelector('#rich-section-stack');if(stack)stack.hidden=false;}
    drawerBody.appendChild(source);drawer.querySelector('.liw-toolkit-drawer-icon').innerHTML=icon(META[key].icon,19);drawer.querySelector('.liw-toolkit-drawer-title strong').textContent=META[key].title;
    drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;requestAnimationFrame(()=>backdrop.classList.add('open'));document.body.classList.add('liw-toolkit-lock');if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function closeDrawer(returnFocus=true){
    if(!activeKey)return;const source=drawerBody.firstElementChild;if(source){source.classList.remove('liw-toolkit-config-source','liw-beef-in-drawer');source.hidden=true;vault.appendChild(source);}drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.classList.remove('open');setTimeout(()=>backdrop.hidden=true,180);document.body.classList.remove('liw-toolkit-lock');activeKey=null;render();if(returnFocus&&previousFocus?.focus)previousFocus.focus({preventScroll:true});
  }

  function absorbBeef(){const beef=document.getElementById('rich-card-builder');if(!beef||beef.parentElement===vault||beef.parentElement===drawerBody)return false;beef.hidden=true;vault.appendChild(beef);render();return true;}
  function polishGate(){
    const gate=document.getElementById('business-tools-gate');if(!gate)return;gate.classList.add('liw-toolkit-gate');const strong=gate.querySelector('strong'),copy=gate.querySelector('p'),button=gate.querySelector('#show-business-tools');
    if(strong)strong.textContent='Your business toolkit is optional';if(copy)copy.textContent='Open it when you want booking, products, payments, leads, or extra card sections.';if(button)button.innerHTML=`${icon('wand-sparkles',16)} Open Business Toolkit`;
    button?.addEventListener('click',()=>setTimeout(()=>{button.innerHTML=root.hidden?`${icon('wand-sparkles',16)} Open Business Toolkit`:`${icon('chevron-up',16)} Hide Business Toolkit`;if(window.lucide)lucide.createIcons();},0));
  }

  function boot(){
    root=document.getElementById(ROOT_ID);const panel=document.querySelector('.editor-panel[data-panel="tools"]');if(!root||!panel)return;
    const h=panel.querySelector('.panel-heading h2'),p=panel.querySelector('.panel-heading p');if(h)h.textContent='Advanced Business Tools';if(p)p.textContent='Turn your digital card into a business tool without turning the editor into a long setup form.';
    polishGate();buildShell();render();absorbBeef();
    const observer=new MutationObserver(()=>{absorbBeef();refreshCount();});observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-enabled']});
    let tries=0;const timer=setInterval(()=>{tries++;absorbBeef();render();if(document.getElementById('rich-card-builder')||tries>30)clearInterval(timer);},300);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();