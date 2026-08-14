/* LIW Cards — STAGING ONLY mobile refinement — 2026-08-14.
   Removes leftover desktop card padding/margins on phones, improves spacing,
   increases business-tool title legibility, and defensively removes duplicate
   tool cards if a staging script ever mounts the same tool twice. */
(function(){
  const STYLE_ID='staging-business-tools-mobile-refine';

  function removeDuplicateToolCards(){
    const content=document.getElementById('business-tools-content');
    if(!content)return;
    const seen=new Set();
    content.querySelectorAll(':scope > .tool-editor-card').forEach(card=>{
      const title=String(card.querySelector(':scope > .tool-editor-head h3')?.textContent||'').trim().toLowerCase();
      const entitlement=String(card.getAttribute('data-entitlement-card')||'');
      if(!title)return;
      const key=`${title}::${entitlement}`;
      if(seen.has(key))card.remove();
      else seen.add(key);
    });
  }

  function inject(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media(max-width:760px){
        /* Give the tool stack a visible, even gutter around every card. */
        #business-tools-content:not([hidden]){
          display:grid!important;
          grid-template-columns:minmax(0,1fr)!important;
          gap:9px!important;
          padding:9px!important;
          margin-top:0!important;
          border:1px solid #e7eaf0!important;
          border-radius:16px!important;
          background:#f3f5f9!important;
        }

        /* Remove desktop padding/margins that were leaving large white empty areas. */
        #business-tools-content>.staging-business-card{
          width:100%!important;
          min-width:0!important;
          min-height:0!important;
          height:auto!important;
          margin:0!important;
          padding:0!important;
          overflow:hidden!important;
          border:1px solid #e0e4eb!important;
          border-radius:14px!important;
          background:#fff!important;
          box-shadow:0 3px 10px rgba(11,20,56,.035)!important;
        }

        #business-tools-content>.staging-business-card:not(.is-open){
          min-height:0!important;
        }

        #business-tools-content>.staging-business-card>.tool-editor-head{
          width:100%!important;
          min-height:64px!important;
          margin:0!important;
          padding:11px 12px!important;
          column-gap:9px!important;
          row-gap:0!important;
          align-items:center!important;
        }

        /* Stronger, more readable section names. */
        #business-tools-content>.staging-business-card>.tool-editor-head h3{
          margin:0!important;
          font-size:.93rem!important;
          line-height:1.15!important;
          font-weight:850!important;
          letter-spacing:-.025em!important;
          color:#111827!important;
        }

        #business-tools-content>.staging-business-card>.tool-editor-head>div{
          min-width:0!important;
          align-self:center!important;
        }

        #business-tools-content>.staging-business-card>.tool-editor-head>.tool-editor-icon{
          width:35px!important;
          height:35px!important;
          min-width:35px!important;
          border-radius:10px!important;
        }

        #business-tools-content>.staging-business-card>.tool-editor-head>.tool-editor-icon svg{
          width:18px!important;
          height:18px!important;
        }

        #business-tools-content>.staging-business-card .staging-tool-card-toggle{
          width:34px!important;
          min-width:34px!important;
          height:34px!important;
          border-radius:10px!important;
        }

        /* Keep positive status compact but visible. */
        #business-tools-content>.staging-business-card>.tool-editor-head .entitlement-badge.staging-mobile-status-ok{
          width:27px!important;
          min-width:27px!important;
          height:27px!important;
        }

        /* Services toggle stays usable without dominating the row. */
        #business-tools-content>.staging-business-card>.tool-editor-head>.switch{
          transform:scale(.76)!important;
          transform-origin:center right!important;
          margin-right:-3px!important;
        }

        /* Bulk/multi-section control should align with the same card gutter. */
        #business-tools-content>.staging-bulk-style{
          margin:0!important;
          border-radius:14px!important;
          box-shadow:0 3px 10px rgba(11,20,56,.03)!important;
        }

        #business-tools-content>.staging-bulk-style>summary{
          min-height:58px!important;
          padding:10px 11px!important;
        }

        #business-tools-content>.staging-bulk-style .staging-bulk-style-summary-copy strong{
          font-size:.82rem!important;
          line-height:1.15!important;
          font-weight:850!important;
        }

        /* Open tools use the same inner gutter, no sudden width jump. */
        #business-tools-content>.staging-business-card.is-open{
          padding-bottom:10px!important;
        }
        #business-tools-content>.staging-business-card.is-open>:not(.tool-editor-head){
          margin-left:10px!important;
          margin-right:10px!important;
        }

        /* Keep style text readable after increasing section title hierarchy. */
        .staging-business-premium-options>summary strong{font-size:.75rem!important}
        .staging-business-premium-options>summary small[data-business-style-summary]{font-size:.57rem!important}
        .staging-business-premium-options .rich-style-choice strong{font-size:.7rem!important}
        .staging-business-premium-options .rich-style-choice small{font-size:.55rem!important}
        .staging-business-premium-options .rich-field label{font-size:.65rem!important}
        .staging-business-premium-options .rich-field select,
        .staging-business-premium-options .rich-field input{font-size:.72rem!important}
      }

      @media(max-width:390px){
        #business-tools-content:not([hidden]){padding:7px!important;gap:8px!important}
        #business-tools-content>.staging-business-card>.tool-editor-head{
          min-height:61px!important;
          padding:10px!important;
          grid-template-columns:33px minmax(0,1fr) auto 32px!important;
        }
        #business-tools-content>.staging-business-card>.tool-editor-head h3{font-size:.88rem!important}
        #business-tools-content>.staging-business-card>.tool-editor-head>.tool-editor-icon{width:33px!important;height:33px!important;min-width:33px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function boot(){
    inject();
    removeDuplicateToolCards();
    const content=document.getElementById('business-tools-content');
    if(content){
      const observer=new MutationObserver(()=>removeDuplicateToolCards());
      observer.observe(content,{childList:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
