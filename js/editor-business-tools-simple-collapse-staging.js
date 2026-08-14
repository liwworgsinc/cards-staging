/* LIW Cards — STAGING ONLY reliable card collapse — 2026-08-14.
   Keeps the current expanded card design intact. Only adds dependable
   collapse/expand behavior so Advanced Tools stays short on mobile. */
(function(){
  const STYLE_ID='staging-simple-business-collapse-style';
  const CARD_SELECTOR='#business-tools-content > .tool-editor-card';

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Preserve the current card design when open. */
      ${CARD_SELECTOR}.staging-simple-collapse{position:relative}
      ${CARD_SELECTOR}.staging-simple-collapse>.tool-editor-head{cursor:pointer;user-select:none}
      ${CARD_SELECTOR}.staging-simple-collapse:not(.is-open)>:not(.tool-editor-head){display:none!important}

      .staging-simple-collapse-chevron{
        flex:0 0 auto;
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        margin-left:auto;
        border:1px solid #dfe4eb;
        border-radius:10px;
        background:#fff;
        color:#475569;
        pointer-events:none;
      }
      .staging-simple-collapse-chevron svg{transition:transform .18s ease}
      ${CARD_SELECTOR}.staging-simple-collapse.is-open .staging-simple-collapse-chevron svg{transform:rotate(180deg)}

      @media(max-width:760px){
        /* Do not restyle the content. Just make the collapsed header compact. */
        ${CARD_SELECTOR}.staging-simple-collapse:not(.is-open){padding-bottom:0!important}
        ${CARD_SELECTOR}.staging-simple-collapse:not(.is-open)>.tool-editor-head{margin-bottom:0!important}
        .staging-simple-collapse-chevron{width:32px;height:32px;border-radius:9px}
      }
    `;
    document.head.appendChild(style);
  }

  function titleOf(card){
    return String(card.querySelector(':scope > .tool-editor-head h3')?.textContent||'Business tool').trim();
  }

  function setOpen(card,open){
    card.classList.toggle('is-open',open);
    card.dataset.stagingSimpleOpen=String(open);
    const head=card.querySelector(':scope > .tool-editor-head');
    if(head)head.setAttribute('aria-expanded',String(open));
    const oldToggle=card.querySelector(':scope > .tool-editor-head .staging-tool-card-toggle');
    if(oldToggle)oldToggle.style.display='none';
    const chevron=card.querySelector(':scope > .tool-editor-head .staging-simple-collapse-chevron');
    if(chevron)chevron.setAttribute('aria-label',`${open?'Collapse':'Expand'} ${titleOf(card)}`);
  }

  function mountCard(card){
    if(!card||card.dataset.stagingSimpleCollapse==='true')return;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;

    card.dataset.stagingSimpleCollapse='true';
    card.classList.add('staging-simple-collapse');

    /* Hide the older experimental arrow if present; use one reliable chevron. */
    card.querySelectorAll(':scope > .tool-editor-head .staging-tool-card-toggle').forEach(el=>el.style.display='none');

    const chevron=document.createElement('span');
    chevron.className='staging-simple-collapse-chevron';
    chevron.innerHTML='<i data-lucide="chevron-down" size="17"></i>';
    head.appendChild(chevron);

    /* Every tool starts collapsed for a short, scannable list. */
    setOpen(card,false);

    head.addEventListener('click',event=>{
      /* Let switches, checkboxes, links, and other true controls work normally. */
      if(event.target.closest('input,label.switch,a,select,textarea,.entitlement-badge'))return;
      event.preventDefault();
      const opening=!card.classList.contains('is-open');

      /* Accordion: one open tool at a time keeps scrolling under control. */
      document.querySelectorAll(`${CARD_SELECTOR}.staging-simple-collapse.is-open`).forEach(other=>{
        if(other!==card)setOpen(other,false);
      });
      setOpen(card,opening);
    });
  }

  function mount(){
    injectStyles();
    document.querySelectorAll(CARD_SELECTOR).forEach(mountCard);
    if(window.lucide)window.lucide.createIcons();
  }

  function boot(){
    mount();
    const content=document.getElementById('business-tools-content');
    if(content){
      const observer=new MutationObserver(()=>mount());
      observer.observe(content,{childList:true});
    }
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump]'))setTimeout(mount,40);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
