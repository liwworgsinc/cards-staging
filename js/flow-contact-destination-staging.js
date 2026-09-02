(function(){
  const enhanced=new WeakSet();

  function labelDetail(label,href=''){
    const value=String(href||'');
    if(label==='Call'||label==='Text')return 'Reach out now';
    if(label==='Email')return 'Send a message';
    if(label==='Website')return 'Visit online';
    if(label==='Directions')return 'Open directions';
    return 'Connect';
  }

  function makeHead(name=''){
    const head=document.createElement('div');
    head.className='flow-contact-destination-head';
    head.innerHTML=`<div class="flow-contact-destination-eyebrow">Ready when you are</div><h2>Let’s connect</h2><p>${name?`Choose the easiest way to reach ${name.split(/\s+/)[0]}.`:'Choose the easiest way to connect.'} You can also send a quick inquiry below.</p>`;
    return head;
  }

  function makeChoiceFromLink(source){
    const label=(source.querySelector('span')?.textContent||source.textContent||'Connect').trim();
    const choice=document.createElement('a');
    choice.className='flow-contact-choice';
    choice.href=source.getAttribute('href')||'#';
    const target=source.getAttribute('target');
    if(target)choice.target=target;
    if(choice.target==='_blank')choice.rel='noopener';
    const iconSource=source.querySelector('svg,[data-lucide]');
    const iconWrap=document.createElement('span');
    iconWrap.className='flow-contact-choice-icon';
    if(iconSource)iconWrap.appendChild(iconSource.cloneNode(true));
    const copy=document.createElement('span');
    copy.className='flow-contact-choice-copy';
    copy.innerHTML=`<strong>${label}</strong><small>${labelDetail(label,choice.href)}</small>`;
    const chevron=document.createElement('i');
    chevron.className='flow-contact-choice-chevron';
    chevron.setAttribute('data-lucide','chevron-right');
    choice.append(iconWrap,copy,chevron);
    const eventName=source.dataset.event;
    if(eventName&&typeof window.track==='function')choice.addEventListener('click',()=>window.track(eventName));
    return choice;
  }

  function enhancePublic(card){
    if(enhanced.has(card))return;
    const panel=card.querySelector('.swipe-contact-panel');
    const actions=card.querySelector('#actions');
    if(!panel||!actions)return;
    enhanced.add(card);
    panel.classList.add('flow-contact-destination');

    const head=makeHead(card.querySelector('#name')?.textContent?.trim()||'');
    panel.prepend(head);

    const sources=[...actions.querySelectorAll('.action-tile')];
    if(sources.length){
      const grid=document.createElement('div');
      grid.className='flow-contact-choice-grid';
      sources.slice(0,6).forEach(source=>grid.appendChild(makeChoiceFromLink(source)));
      head.after(grid);
    }

    const lead=panel.querySelector('#lead-section');
    const leadTitle=lead?.querySelector('.public-section-heading h2');
    const leadMeta=lead?.querySelector('.public-section-heading span');
    if(leadTitle)leadTitle.textContent='Send a message';
    if(leadMeta)leadMeta.textContent='Quick inquiry';

    const saveSource=card.querySelector('#save');
    if(saveSource){
      const wrap=document.createElement('div');
      wrap.className='flow-contact-save-wrap';
      const note=document.createElement('span');
      note.className='flow-contact-save-note';
      note.textContent='Keep this card handy for later.';
      const button=document.createElement('button');
      button.type='button';
      button.className='flow-contact-save';
      button.innerHTML='<i data-lucide="user-round-plus"></i><span>Save contact</span>';
      button.addEventListener('click',()=>saveSource.click());
      wrap.append(note,button);
      panel.appendChild(wrap);
    }

    if(window.lucide)window.lucide.createIcons();
  }

  function demoChoice(source){
    const label=source.querySelector('.flow-action-label')?.textContent?.trim()||'Connect';
    const button=document.createElement('button');
    button.type='button';
    button.className='flow-contact-choice';
    const icon=source.querySelector('svg,[data-lucide]');
    const iconWrap=document.createElement('span');
    iconWrap.className='flow-contact-choice-icon';
    if(icon)iconWrap.appendChild(icon.cloneNode(true));
    const copy=document.createElement('span');
    copy.className='flow-contact-choice-copy';
    copy.innerHTML=`<strong>${label}</strong><small>${labelDetail(label)}</small>`;
    const chevron=document.createElement('i');
    chevron.className='flow-contact-choice-chevron';
    chevron.setAttribute('data-lucide','chevron-right');
    button.append(iconWrap,copy,chevron);
    button.addEventListener('click',()=>source.click());
    return button;
  }

  function enhanceDemo(card){
    if(enhanced.has(card))return;
    const track=card.querySelector('[data-flow-live-track]');
    const panels=track?[...track.children]:[];
    const panel=panels[panels.length-1];
    const actions=[...card.querySelectorAll('.flow-action[data-demo-action]')];
    if(!panel||!actions.length)return;
    enhanced.add(card);
    panel.classList.add('flow-demo-contact-destination');
    const head=makeHead('Maya Bennett');
    panel.prepend(head);
    const grid=document.createElement('div');
    grid.className='flow-contact-choice-grid';
    actions.slice(0,5).forEach(source=>grid.appendChild(demoChoice(source)));
    head.after(grid);

    const saveSource=card.querySelector('[data-demo-action="save"]');
    if(saveSource){
      const wrap=document.createElement('div');
      wrap.className='flow-contact-save-wrap';
      const note=document.createElement('span');
      note.className='flow-contact-save-note';
      note.textContent='Keep Maya’s card handy for later.';
      const button=document.createElement('button');
      button.type='button';
      button.className='flow-contact-save';
      button.innerHTML='<i data-lucide="user-round-plus"></i><span>Save contact</span>';
      button.addEventListener('click',()=>saveSource.click());
      wrap.append(note,button);
      panel.appendChild(wrap);
    }
    if(window.lucide)window.lucide.createIcons();
  }

  function scan(){
    document.querySelectorAll('.swipe-card-active').forEach(enhancePublic);
    document.querySelectorAll('.flow-live-card').forEach(enhanceDemo);
  }

  scan();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(()=>observer.disconnect(),15000);
})();
