(function(){
  const ROOT_ID='business-tools-content';
  const SOURCE_CLASS='liw-toolkit-source-vault';
  const META={
    services:{title:'Services',category:'sell',icon:'list-checks',description:'Show what you offer, pricing, and the next step for customers.'},
    booking:{title:'Appointment booking',category:'customer',icon:'calendar-check-2',description:'Use LIW service requests and live scheduling without an external booking link.'},
    leads:{title:'Lead capture',category:'customer',icon:'inbox',description:'Collect customer details and inquiries directly from your card.'},
    products:{title:'Product showcase',category:'sell',icon:'shopping-bag',description:'Feature products with images, prices, and buy links.'},
    paymentSharing:{title:'Share payment information',category:'payments',icon:'hand-coins',description:'Share Cash App, Venmo, PayPal, or Zelle details.'},
    paymentLink:{title:'Payment link',category:'payments',icon:'badge-dollar-sign',description:'Send customers to your checkout or invoice link.'},
    beef:{title:'Beef Your Card Up',category:'enhance',icon:'sparkles',description:'Add hours, reviews, galleries, FAQs, locations, credentials, and more.'}
  };
  const CATEGORIES=[['all','All tools','layout-grid'],['customer','Connect','messages-square'],['sell','Sell','store'],['payments','Payments','wallet-cards'],['enhance','Enhance','sparkles']];
  let root=null,vault=null,grid=null,drawer=null,drawerBody=null,backdrop=null,activeKey=null,previousFocus=null;
  let beefAttached=false;
  const icon=(name,size=18)=>`<i data-lucide="${name}" size="${size}"></i>`;
  const text=el=>(el?.textContent||'').trim();

  function editorCardId(){
    try{if(typeof currentId!=='undefined'&&currentId)return String(currentId);}catch(_){}
    return new URLSearchParams(location.search).get('id')||'';
  }
  function editorPlan(){
    try{return String(typeof currentPlan!=='undefined'&&currentPlan?currentPlan:'starter').toLowerCase();}catch(_){return 'starter';}
  }
  function requestOnlyPlan(){return ['starter','free'].includes(editorPlan());}
  function nativeBookingCopy(){
    return requestOnlyPlan()
      ? 'Free includes a native service request form. Clients choose a service and preferred date/time, then you confirm it.'
      : 'Clients can reserve open LIW time slots. Services, hours, reminders, blackout time and Google Calendar are managed in Appointments.';
  }
  function nativeBookingState(source){return source?.dataset?.liwNativeBookingState||'setup';}
  function nativeBookingButtonLabel(source){
    if(!editorCardId())return 'Save card & set up';
    return nativeBookingState(source)==='active'?'Manage LIW Appointments':'Set up LIW Appointments';
  }
  function nativeBookingModeLabel(){return requestOnlyPlan()?'Service requests':'Live scheduling';}

  function sources(){
    if(!root)return {};
    const cards=Array.from(root.querySelectorAll(':scope > .tool-editor-card, .'+SOURCE_CLASS+' > .tool-editor-card'));
    const byTitle=needle=>cards.find(card=>text(card.querySelector('.tool-editor-head h3')).toLowerCase().includes(needle));
    return {
      services:byTitle('services'),booking:byTitle('appointment booking'),leads:byTitle('lead capture'),products:byTitle('product showcase'),
      paymentSharing:cards.find(card=>card.classList.contains('payment-sharing-editor'))||byTitle('share payment'),paymentLink:byTitle('payment link'),beef:document.getElementById('rich-card-builder')
    };
  }

  function updateNativeBookingPanel(source){
    if(!source)return;
    const panel=source.querySelector('[data-liw-native-booking-panel]');
    if(!panel)return;
    const state=nativeBookingState(source);
    const active=state==='active';
    const checking=state==='loading';
    const status=panel.querySelector('[data-liw-native-booking-status]');
    if(status){
      status.className=`liw-native-booking-status ${active?'active':checking?'loading':'setup'}`;
      status.innerHTML=active?`${icon('circle-check',13)} Active on this card`:checking?`${icon('loader-circle',13)} Checking setup`:`${icon('circle-dashed',13)} Ready to set up`;
    }
    const mode=panel.querySelector('[data-liw-native-booking-mode]');
    if(mode)mode.textContent=nativeBookingModeLabel();
    const copy=panel.querySelector('[data-liw-native-booking-copy]');
    if(copy)copy.textContent=nativeBookingCopy();
    const button=panel.querySelector('[data-liw-native-booking-open]');
    if(button){
      button.disabled=checking;
      button.innerHTML=`${icon(active?'settings-2':'calendar-plus',16)} ${nativeBookingButtonLabel(source)}`;
    }
    const note=panel.querySelector('[data-liw-native-booking-note]');
    if(note)note.textContent=editorCardId()?'No Calendly or external booking URL required.':'Your card will save first, then LIW Appointments will open on this card.';
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function prepareNativeBookingSource(source){
    if(!source)return;
    source.dataset.liwNativeBooking='true';
    source.classList.remove('locked');
    const headCopy=source.querySelector('.tool-editor-head p');
    if(headCopy)headCopy.textContent='Use LIW’s built-in requests and scheduling—no external booking link needed.';
    const badge=source.querySelector('.entitlement-badge');
    if(badge){badge.classList.remove('locked');badge.textContent='Included';badge.dataset.liwNativeBookingBadge='true';}

    const legacyToggle=source.querySelector('[name="booking_enabled"]')?.closest('label');
    const legacyUrl=source.querySelector('[name="booking_url"]')?.closest('.form-group');
    [legacyToggle,legacyUrl].filter(Boolean).forEach(element=>{element.hidden=true;element.classList.add('liw-native-booking-legacy');element.setAttribute('aria-hidden','true');});

    let panel=source.querySelector('[data-liw-native-booking-panel]');
    if(!panel){
      panel=document.createElement('div');
      panel.className='liw-native-booking-panel';
      panel.dataset.liwNativeBookingPanel='true';
      panel.innerHTML=`<div class="liw-native-booking-top"><div><span class="liw-native-booking-kicker">Native LIW Appointments</span><strong>Booking lives inside LIW now</strong></div><span class="liw-native-booking-status setup" data-liw-native-booking-status>${icon('circle-dashed',13)} Ready to set up</span></div><div class="liw-native-booking-mode"><span>Current plan mode</span><strong data-liw-native-booking-mode>${nativeBookingModeLabel()}</strong></div><p data-liw-native-booking-copy>${nativeBookingCopy()}</p><div class="liw-native-booking-features"><span>${icon('briefcase-business',14)} Services</span><span>${icon('clock-3',14)} Availability</span><span>${icon('bell-ring',14)} Reminders</span><span>${icon('calendar-sync',14)} Calendar sync</span></div><button class="btn btn-primary liw-native-booking-open" type="button" data-liw-native-booking-open>${icon('calendar-plus',16)} ${nativeBookingButtonLabel(source)}</button><small data-liw-native-booking-note>${editorCardId()?'No Calendly or external booking URL required.':'Your card will save first, then LIW Appointments will open on this card.'}</small>`;
      const anchor=legacyToggle||legacyUrl;
      if(anchor)source.insertBefore(panel,anchor);else source.appendChild(panel);
    }
    updateNativeBookingPanel(source);
  }

  async function refreshNativeBookingStatus(source){
    if(!source)return;
    prepareNativeBookingSource(source);
    const id=editorCardId();
    if(!id){source.dataset.liwNativeBookingState='setup';updateNativeBookingPanel(source);render();return;}
    source.dataset.liwNativeBookingState='loading';updateNativeBookingPanel(source);
    try{
      if(typeof supabaseClient==='undefined')throw new Error('Supabase unavailable');
      const {data,error}=await supabaseClient.from('booking_settings').select('enabled').eq('card_id',id).maybeSingle();
      if(error)throw error;
      source.dataset.liwNativeBookingState=data?.enabled===true?'active':'setup';
    }catch(error){
      console.warn('LIW native Appointments status unavailable:',error);
      source.dataset.liwNativeBookingState='setup';
    }
    updateNativeBookingPanel(source);render();
  }

  async function ensureSavedCardId(){
    let id=editorCardId();
    if(id)return id;
    try{
      if(typeof flushSave==='function')await flushSave({force:true,silent:true});
      else if(typeof save==='function')await save({silent:true});
    }catch(error){console.warn('LIW native Appointments save before open:',error);}
    for(let attempt=0;attempt<20;attempt+=1){
      id=editorCardId();
      if(id)return id;
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    return '';
  }

  async function openNativeAppointments(button){
    const source=button.closest('.tool-editor-card');
    const original=button.innerHTML;
    button.disabled=true;button.innerHTML=`${icon('loader-circle',16)} Opening Appointments…`;
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    const id=await ensureSavedCardId();
    if(!id){
      button.disabled=false;button.innerHTML=original;if(window.lucide)try{lucide.createIcons();}catch(_){}
      if(typeof toast==='function')toast('Save this card first, then open LIW Appointments.');
      return;
    }
    try{location.href=`appointments.html?card=${encodeURIComponent(id)}`;}catch(_){button.disabled=false;updateNativeBookingPanel(source);}
  }

  function status(key,source){
    if(!source)return {label:'Unavailable',tone:'muted'};
    if(key==='booking'){
      prepareNativeBookingSource(source);
      const state=nativeBookingState(source);
      if(state==='active')return {label:'Active',tone:'active'};
      if(state==='loading')return {label:'Checking',tone:'ready'};
      return {label:'Included',tone:'ready'};
    }
    if(key==='beef'){
      const count=source.querySelectorAll('.rich-section-editor[data-enabled="true"]').length;
      return count?{label:`${count} active`,tone:'active'}:{label:'Optional',tone:'ready'};
    }
    const locked=source.classList.contains('locked')||source.querySelector('.entitlement-badge.locked');
    if(locked)return {label:text(source.querySelector('.entitlement-badge.locked'))||'Upgrade',tone:'locked'};
    const toggle=source.querySelector('input[type="checkbox"]');
    if(toggle?.checked)return {label:'Active',tone:'active'};
    if(key==='paymentLink'&&source.querySelector('[name="payment_url"]')?.value?.trim())return {label:'Active',tone:'active'};
    const badgeText=text(source.querySelector('.entitlement-badge'));
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
      shell.querySelectorAll('.liw-toolkit-filter').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false');});
      btn.classList.add('active');btn.setAttribute('aria-selected','true');applyFilter(btn.dataset.filter);
    }));
  }

  function tile(key,source){
    const meta=META[key],s=status(key,source),locked=s.tone==='locked';
    return `<button class="liw-toolkit-tile" type="button" data-tool="${key}" data-category="${meta.category}" ${source?'':'disabled'}><span class="liw-toolkit-tile-top"><span class="liw-toolkit-icon">${icon(meta.icon,20)}</span><span class="liw-toolkit-status ${s.tone}">${s.label}</span></span><span class="liw-toolkit-tile-copy"><strong>${meta.title}</strong><small>${meta.description}</small></span><span class="liw-toolkit-tile-action"><span>${locked?'View access':'Configure'}</span>${icon('arrow-right',16)}</span></button>`;
  }

  function render(){
    if(!grid)return;
    const current=root.querySelector('.liw-toolkit-filter.active')?.dataset.filter||'all',all=sources();
    if(all.booking)prepareNativeBookingSource(all.booking);
    grid.innerHTML=Object.keys(META).map(key=>tile(key,all[key])).join('');
    grid.querySelectorAll('.liw-toolkit-tile').forEach(btn=>btn.addEventListener('click',()=>openDrawer(btn.dataset.tool)));
    applyFilter(current);refreshCount();if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function applyFilter(filter){grid?.querySelectorAll('.liw-toolkit-tile').forEach(btn=>btn.hidden=filter!=='all'&&btn.dataset.category!==filter);}
  function refreshCount(){
    const counter=root?.querySelector('[data-liw-active-count]');if(!counter)return;
    const next=String(Object.entries(sources()).filter(([k,v])=>status(k,v).tone==='active').length);
    if(counter.textContent!==next)counter.textContent=next;
  }

  function openDrawer(key){
    const source=sources()[key];if(!source)return;if(activeKey)closeDrawer(false);previousFocus=document.activeElement;activeKey=key;
    if(key==='booking'){prepareNativeBookingSource(source);setTimeout(()=>refreshNativeBookingStatus(source),20);}
    source.hidden=false;source.classList.add('liw-toolkit-config-source');
    if(key==='beef'){source.classList.add('liw-beef-in-drawer');const stack=source.querySelector('#rich-section-stack');if(stack)stack.hidden=false;}
    drawerBody.appendChild(source);drawer.querySelector('.liw-toolkit-drawer-icon').innerHTML=icon(META[key].icon,19);drawer.querySelector('.liw-toolkit-drawer-title strong').textContent=META[key].title;
    drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;requestAnimationFrame(()=>backdrop.classList.add('open'));document.body.classList.add('liw-toolkit-lock');if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function closeDrawer(returnFocus=true){
    if(!activeKey)return;const source=drawerBody.firstElementChild;
    if(source){source.classList.remove('liw-toolkit-config-source','liw-beef-in-drawer');source.hidden=true;vault.appendChild(source);}
    drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.classList.remove('open');setTimeout(()=>backdrop.hidden=true,180);document.body.classList.remove('liw-toolkit-lock');activeKey=null;render();if(returnFocus&&previousFocus?.focus)previousFocus.focus({preventScroll:true});
  }

  function absorbBeef(){
    const beef=document.getElementById('rich-card-builder');
    if(!beef||beefAttached||beef.parentElement===vault||beef.parentElement===drawerBody)return false;
    beef.hidden=true;vault.appendChild(beef);beefAttached=true;render();return true;
  }

  function polishGate(){
    const gate=document.getElementById('business-tools-gate');if(!gate)return;gate.classList.add('liw-toolkit-gate');
    const strong=gate.querySelector('strong'),copy=gate.querySelector('p'),button=gate.querySelector('#show-business-tools');
    if(strong)strong.textContent='Your business toolkit is optional';
    if(copy)copy.textContent='Open it when you want booking, products, payments, leads, or extra card sections.';
    if(button)button.innerHTML=`${icon('wand-sparkles',16)} Open Business Toolkit`;
    button?.addEventListener('click',()=>setTimeout(()=>{button.innerHTML=root.hidden?`${icon('wand-sparkles',16)} Open Business Toolkit`:`${icon('chevron-up',16)} Hide Business Toolkit`;if(window.lucide)lucide.createIcons();},0));
  }

  function wireSafeRefresh(){
    const relevant='[name="services_enabled"],[name="booking_enabled"],[name="lead_form_enabled"],[name="products_enabled"],[name="payment_sharing_enabled"],[name="payment_url"]';
    document.addEventListener('change',event=>{if(event.target.matches(relevant))requestAnimationFrame(render);});
    document.addEventListener('input',event=>{if(event.target.matches('[name="payment_url"]'))requestAnimationFrame(render);});
    document.addEventListener('click',event=>{
      const button=event.target instanceof Element?event.target.closest('[data-liw-native-booking-open]'):null;
      if(!button)return;
      event.preventDefault();openNativeAppointments(button);
    });
  }

  function boot(){
    root=document.getElementById(ROOT_ID);const panel=document.querySelector('.editor-panel[data-panel="tools"]');if(!root||!panel)return;
    const h=panel.querySelector('.panel-heading h2'),p=panel.querySelector('.panel-heading p');if(h)h.textContent='Advanced Business Tools';if(p)p.textContent='Turn your digital card into a business tool without turning the editor into a long setup form.';
    const booking=sources().booking;if(booking)prepareNativeBookingSource(booking);
    polishGate();buildShell();render();absorbBeef();wireSafeRefresh();
    if(booking)setTimeout(()=>refreshNativeBookingStatus(booking),650);
    let tries=0;const timer=setInterval(()=>{
      tries+=1;
      const currentBooking=sources().booking;if(currentBooking)prepareNativeBookingSource(currentBooking);
      if(absorbBeef()||document.getElementById('rich-card-builder')||tries>=12)clearInterval(timer);
    },350);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();