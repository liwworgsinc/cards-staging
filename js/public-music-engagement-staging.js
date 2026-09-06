/* LIW Cards staging — Music-only fan/booking/social engagement rooms. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_ENGAGEMENT__)return;
  window.__LIW_MUSIC_ENGAGEMENT__=true;

  function data(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function artistName(){
    return String(document.getElementById('name')?.textContent||data()?.full_name||'the artist').trim()||'the artist';
  }
  function closeRoom(){document.querySelector('.music-artist-room.open .music-artist-room-close')?.click();}
  function roomMode(room){
    const title=String(room?.querySelector('[data-music-room-title]')?.textContent||'').trim().toLowerCase();
    if(title==='book me')return 'book';
    if(title==='fan club')return 'fan';
    if(title==='social')return 'social';
    return '';
  }
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function addBackFooter(section,copy){
    section.querySelector('.music-engagement-retain')?.remove();
    const footer=document.createElement('div');
    footer.className='music-engagement-retain';
    footer.innerHTML=`<div>${icon('sparkles',16)}<span>${copy}</span></div><button type="button">${icon('arrow-left',16)} Back to Artist Card</button>`;
    footer.querySelector('button').addEventListener('click',closeRoom);
    section.appendChild(footer);
  }

  function hero(mode){
    const node=document.createElement('div');
    node.className=`music-engagement-hero music-engagement-hero-${mode}`;
    if(mode==='social'){
      node.innerHTML=`<span class="music-engagement-orb">${icon('radio',24)}</span><div><small>STAY IN THE ORBIT</small><h2>Follow <span data-artist-name></span></h2><p>Pick your platform. Social links open in a new tab, so this LIW Artist Card stays waiting for you.</p></div>`;
    }else if(mode==='fan'){
      node.innerHTML=`<span class="music-engagement-orb">${icon('crown',24)}</span><div><small>INNER CIRCLE</small><h2>Get closer to <span data-artist-name></span></h2><p>Choose what you want to hear about and leave the best way to reach you.</p></div>`;
    }else{
      node.innerHTML=`<span class="music-engagement-orb">${icon('calendar-check-2',24)}</span><div><small>BOOKING REQUEST</small><h2>Bring <span data-artist-name></span> to your stage</h2><p>Send the essentials to the artist or management without leaving the LIW experience.</p></div>`;
    }
    const name=node.querySelector('[data-artist-name]');if(name)name.textContent=artistName();
    return node;
  }

  function ensureInterest(select,value){
    if(!select)return;
    let option=Array.from(select.options).find(item=>item.value===value);
    if(!option){option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option);}
    select.value=value;
    select.hidden=true;
  }

  function chipRow(mode,textarea){
    const wrap=document.createElement('div');
    wrap.className='music-engagement-chips';
    const labels=mode==='fan'?['New drops','Shows','Merch','Everything']:['Performance','Appearance','Collaboration','Other'];
    const title=document.createElement('span');
    title.className='music-engagement-chip-label';
    title.textContent=mode==='fan'?'Keep me posted about':'What are you planning?';
    wrap.appendChild(title);
    const row=document.createElement('div');row.className='music-engagement-chip-row';wrap.appendChild(row);
    labels.forEach(label=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.addEventListener('click',()=>{
        row.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));
        if(!textarea)return;
        if(mode==='fan')textarea.value=`I'd like updates about ${label.toLowerCase()}.`;
        else if(!textarea.value.trim()||/^\[(Performance|Appearance|Collaboration|Other)\]/.test(textarea.value.trim()))textarea.value=`[${label}] `;
        textarea.focus();textarea.setSelectionRange(textarea.value.length,textarea.value.length);
      });
      row.appendChild(button);
    });
    return wrap;
  }

  function enhanceLead(section,mode){
    if(!section)return;
    section.dataset.musicEngagementMode=mode;
    section.classList.add('music-engagement-lead');
    section.classList.toggle('music-engagement-fan',mode==='fan');
    section.classList.toggle('music-engagement-book',mode==='book');
    section.querySelector('.music-engagement-hero')?.remove();
    section.querySelector('.music-engagement-chips')?.remove();
    section.prepend(hero(mode));

    const form=section.querySelector('#lead-form');if(!form)return;
    const name=form.elements.namedItem('name');
    const phone=form.elements.namedItem('phone');
    const email=form.elements.namedItem('email');
    const message=form.elements.namedItem('message');
    const interest=form.elements.namedItem('service_interest');
    const submit=form.querySelector('button[type="submit"]');
    const note=form.querySelector('small');

    if(mode==='fan'){
      if(name){name.placeholder='Your name';name.setAttribute('aria-label','Your name');}
      if(email){email.placeholder='Best email';email.setAttribute('aria-label','Best email');}
      if(phone){phone.placeholder='Phone (optional)';phone.setAttribute('aria-label','Phone optional');}
      if(message){message.placeholder='Tell the artist what you want more of…';message.setAttribute('aria-label','What you want updates about');}
      ensureInterest(interest,'Inner Circle');
      if(submit)submit.innerHTML=`${icon('crown',17)} Join the Inner Circle`;
      if(note)note.textContent='No account required. Your info goes directly to the artist or team.';
      form.before(chipRow('fan',message));
      addBackFooter(section,'Join, then keep exploring the artist card.');
    }else{
      if(name){name.placeholder='Your name / organization';name.setAttribute('aria-label','Your name or organization');}
      if(email){email.placeholder='Work email';email.setAttribute('aria-label','Work email');}
      if(phone){phone.placeholder='Phone';phone.setAttribute('aria-label','Phone');}
      if(message){message.placeholder='Event date, city, venue, budget, audience size, and what you need…';message.setAttribute('aria-label','Booking details');}
      ensureInterest(interest,'Artist Booking');
      if(submit)submit.innerHTML=`${icon('send',17)} Send Booking Request`;
      if(note)note.textContent='Sent directly to the artist or management. No account required.';
      form.before(chipRow('book',message));
      addBackFooter(section,'Your Artist Card stays here after you send the request.');
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function enhanceSocial(section){
    if(!section)return;
    section.dataset.musicEngagementMode='social';
    section.classList.add('music-engagement-social');
    section.querySelector('.music-engagement-hero')?.remove();
    section.prepend(hero('social'));
    section.querySelectorAll('#socials a.social-chip').forEach(link=>{
      link.target='_blank';link.rel='noopener';link.classList.add('music-social-destination');
      link.setAttribute('aria-label',`${String(link.textContent||'Social').trim()} — opens in a new tab`);
    });
    addBackFooter(section,'Open a platform, come back, and keep exploring.');
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function enhance(){
    if(!isMusic())return false;
    const room=document.querySelector('.music-artist-room.open');if(!room)return false;
    const mode=roomMode(room);if(!mode)return false;
    const body=room.querySelector('[data-music-room-body]');if(!body)return false;
    if(room.dataset.musicEngagementMode===mode){
      const expected=mode==='social'?body.querySelector('#social-section'):body.querySelector('#lead-section');
      if(expected&&expected.dataset.musicEngagementMode===mode)return true;
    }
    room.dataset.musicEngagementMode=mode;
    if(mode==='social')enhanceSocial(body.querySelector('#social-section'));
    else enhanceLead(body.querySelector('#lead-section'),mode);
    return true;
  }

  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
  let attempts=0;const timer=setInterval(()=>{attempts+=1;enhance();if(attempts>120)clearInterval(timer);},100);
  enhance();
})();