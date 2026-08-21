(function(){
  'use strict';

  const STORAGE_KEY='liw_agency_results_collapsed_v1';
  let frame=0;
  let observer=null;

  function getCollapsed(){
    try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(_){return false;}
  }

  function saveCollapsed(value){
    try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}catch(_){ }
  }

  function setWrapperHeight(wrapper,collapsed,instant=false){
    if(!wrapper)return;
    if(instant){
      wrapper.style.transition='none';
      wrapper.style.maxHeight=collapsed?'0px':`${wrapper.scrollHeight}px`;
      requestAnimationFrame(()=>wrapper.style.removeProperty('transition'));
      return;
    }
    if(collapsed){
      wrapper.style.maxHeight=`${wrapper.scrollHeight}px`;
      requestAnimationFrame(()=>wrapper.style.maxHeight='0px');
    }else{
      wrapper.style.maxHeight='0px';
      requestAnimationFrame(()=>wrapper.style.maxHeight=`${wrapper.scrollHeight}px`);
    }
  }

  function updateButton(button,collapsed){
    if(!button)return false;
    const nextState=collapsed?'collapsed':'expanded';
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'Show performance details':'Hide performance details');
    button.title=collapsed?'Show performance details':'Hide performance details';
    if(button.dataset.collapseState===nextState)return false;
    button.dataset.collapseState=nextState;
    button.innerHTML=`<span>${collapsed?'Show details':'Hide details'}</span><span class="agency-results-collapse-icon"><i data-lucide="chevron-${collapsed?'down':'up'}" size="15"></i></span>`;
    return true;
  }

  function applyState(shell,collapsed,instant=false){
    const wrapper=shell.querySelector('.agency-results-detail-wrap');
    const button=shell.querySelector('[data-results-collapse]');
    shell.classList.toggle('is-collapsed',collapsed);
    const buttonChanged=updateButton(button,collapsed);
    setWrapperHeight(wrapper,collapsed,instant);
    if(buttonChanged&&window.lucide)lucide.createIcons();
  }

  function enhance(){
    const host=document.querySelector('#results .agency-section-card');
    const shell=host?.querySelector('.agency-results-shell');
    if(!shell)return;

    const main=shell.querySelector(':scope > .agency-results-main-grid');
    const bottom=shell.querySelector(':scope > .agency-results-bottom-grid');
    let wrapper=shell.querySelector(':scope > .agency-results-detail-wrap');

    if(!wrapper&&(main||bottom)){
      wrapper=document.createElement('div');
      wrapper.className='agency-results-detail-wrap';
      wrapper.setAttribute('data-results-detail-wrap','true');
      if(main)main.before(wrapper);
      else if(bottom)bottom.before(wrapper);
      if(main)wrapper.appendChild(main);
      if(bottom)wrapper.appendChild(bottom);
    }

    const actions=shell.querySelector('.agency-results-actions');
    if(actions&&!actions.querySelector('[data-results-collapse]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='agency-results-collapse';
      button.dataset.resultsCollapse='true';
      const range=actions.querySelector('.agency-results-range');
      if(range)range.after(button);else actions.prepend(button);
      button.addEventListener('click',()=>{
        const next=!shell.classList.contains('is-collapsed');
        saveCollapsed(next);
        applyState(shell,next,false);
      });
    }

    applyState(shell,getCollapsed(),true);
  }

  function scheduleEnhance(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(enhance);
  }

  function boot(){
    const host=document.querySelector('#results .agency-section-card');
    if(!host)return;
    scheduleEnhance();
    observer=new MutationObserver(scheduleEnhance);
    observer.observe(host,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{
      const shell=host.querySelector('.agency-results-shell');
      const wrapper=shell?.querySelector('.agency-results-detail-wrap');
      if(wrapper&&!shell.classList.contains('is-collapsed'))wrapper.style.maxHeight=`${wrapper.scrollHeight}px`;
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
