(function(){
  'use strict';

  function renderer(){
    return location.hostname==='liwworgsinc.github.io'
      ? 'https://liwworgsinc.github.io/cards-staging/card.html'
      : 'https://cards.liwworgs.com/card.html';
  }

  function buildFile(card){
    const title=(card.company?card.name+' · '+card.company:card.name).replace(/[<>]/g,'');
    const src=renderer()+'?slug='+encodeURIComponent(card.slug);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}body{overflow:hidden}</style></head><body><iframe title="'+title+'" src="'+src+'"></iframe></body></html>';
  }

  window.addEventListener('click',event=>{
    if(event.target?.id!=='agency-hosting-v2-download')return;
    const select=document.getElementById('agency-hosting-v2-select');
    const slug=select?.value||'';
    const option=select?.selectedOptions?.[0];
    if(!slug||!option)return;
    const card={slug,name:option.textContent||'Client Card',company:''};
    const blob=new Blob([buildFile(card)],{type:'text/html;charset=utf-8'});
    const href=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=href;
    link.download='index.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1000);
  });
})();
