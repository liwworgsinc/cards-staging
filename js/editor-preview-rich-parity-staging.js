/* LIW Cards — STAGING ONLY — rich-section WYSIWYG parity for the editor phone. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_RICH_PREVIEW_PARITY__) return;
  window.__LIW_EDITOR_RICH_PREVIEW_PARITY__=true;

  const defaults={
    hours:{appearance:'luxe',layout:'compact'},
    gallery:{appearance:'luxe',layout:'mosaic'},
    testimonials:{appearance:'luxe',layout:'spotlight'},
    faq:{appearance:'luxe',layout:'accordion'},
    location:{appearance:'luxe',layout:'map-first'},
    cta:{appearance:'luxe',layout:'split'},
    credentials:{appearance:'luxe',layout:'badges'},
    featured_links:{appearance:'luxe',layout:'cards'}
  };

  function editorFor(type){
    return document.querySelector(`.rich-section-editor[data-rich-section="${type}"]`);
  }

  function controlValue(type,path,fallback=''){
    const editor=editorFor(type);
    if(!editor) return fallback;
    const controls=[...editor.querySelectorAll(`[data-rich-type="${type}"][data-rich-path="${path}"]`)];
    if(!controls.length) return fallback;
    const first=controls[0];
    if(first.type==='radio') return controls.find(control=>control.checked)?.value||fallback;
    return first.value||fallback;
  }

  function accentValue(value){
    if(value==='brand') return 'var(--card-primary,#0b1438)';
    if(value==='dark') return '#0b1438';
    return '#d4a84f';
  }

  function apply(){
    const container=document.getElementById('preview-public-mirror');
    if(!container) return;

    container.querySelectorAll('.public-rich-section[data-preview-rich]').forEach(section=>{
      const type=section.dataset.previewRich;
      const fallback=defaults[type]||{appearance:'luxe',layout:'classic'};
      const appearance=controlValue(type,'appearance',fallback.appearance);
      const layout=controlValue(type,'layout',fallback.layout);
      const align=controlValue(type,'heading_align','left');
      const accent=controlValue(type,'accent','gold');
      const displayTitle=controlValue(type,'display_title','').trim();
      const displayKicker=controlValue(type,'display_kicker','').trim();

      section.dataset.publicRich=type;
      section.dataset.richStyle=appearance;
      section.dataset.richLayout=layout;
      section.dataset.richAlign=align;
      section.style.setProperty('--rich-accent',accentValue(accent));

      const heading=section.querySelector('.public-rich-head h2');
      const kicker=section.querySelector('.public-rich-head span');
      if(heading&&displayTitle) heading.textContent=displayTitle;
      if(kicker&&displayKicker) kicker.textContent=displayKicker;
    });
  }

  function wrapMirror(){
    const mirror=window.LIWStagingPreviewMirror;
    if(!mirror?.refresh||mirror.__richParityWrapped) return false;
    const original=mirror.refresh.bind(mirror);
    mirror.refresh=(...args)=>{
      const result=original(...args);
      apply();
      return result;
    };
    mirror.__richParityWrapped=true;
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(wrapMirror()){
      clearInterval(timer);
      try{window.LIWStagingPreviewMirror.refresh();}catch(_){apply();}
    }else if(attempts>40){
      clearInterval(timer);
      apply();
    }
  },100);

  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[data-rich-type][data-rich-path]')) requestAnimationFrame(apply);
  });
  document.addEventListener('input',event=>{
    if(event.target?.matches?.('[data-rich-type][data-rich-path]')) requestAnimationFrame(apply);
  });

  window.LIWEditorRichPreviewParity={apply};
})();
