/* LIW Cards — STAGING ONLY mobile polish for Advanced Business Tools — 2026-08-14.
   Tightens spacing and control density on phones while preserving tap targets. */
(function(){
  const STYLE_ID='staging-business-tools-mobile-polish';

  function inject(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media(max-width:760px){
        /* Overall Advanced Tools rhythm */
        .editor-panel[data-panel="tools"]{padding-left:0!important;padding-right:0!important}
        .editor-panel[data-panel="tools"]>.panel-heading{padding:0 2px!important;margin-bottom:9px!important}
        .editor-panel[data-panel="tools"]>.panel-heading h2{font-size:1.02rem!important;line-height:1.15!important}
        .editor-panel[data-panel="tools"]>.panel-heading p{margin-top:4px!important;font-size:.68rem!important;line-height:1.35!important}
        .editor-panel[data-panel="tools"] .editor-entitlement-summary{margin-bottom:8px!important}
        .editor-panel[data-panel="tools"] .optional-step-gate{padding:11px!important;margin-bottom:9px!important;border-radius:14px!important}
        .editor-panel[data-panel="tools"] .optional-step-gate p{display:none!important}
        .editor-panel[data-panel="tools"] .optional-step-gate strong{font-size:.72rem!important}
        .editor-panel[data-panel="tools"] .optional-step-gate .btn{min-height:36px!important;padding:7px 10px!important;font-size:.65rem!important}
        #business-tools-content{gap:7px!important}

        /* Bulk style selector: short, scannable, still finger-friendly */
        .staging-bulk-style{margin:0 0 7px!important;border-radius:14px!important}
        .staging-bulk-style>summary{min-height:54px!important;padding:9px 10px!important;gap:8px!important}
        .staging-bulk-style-icon{width:30px!important;height:30px!important;border-radius:9px!important}
        .staging-bulk-style-summary-copy{gap:8px!important}
        .staging-bulk-style-summary-copy strong{font-size:.7rem!important;line-height:1.12!important}
        .staging-bulk-style-summary-copy small{display:none!important}
        .staging-bulk-style-state{font-size:.56rem!important}
        .staging-bulk-style-state>span{display:none!important}
        .staging-bulk-style-body{padding:9px 10px 11px!important}
        .staging-bulk-style-label{margin-bottom:5px!important;font-size:.56rem!important}
        .staging-bulk-tool-list{
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:5px!important;
          margin-bottom:9px!important;
        }
        .staging-bulk-tool-check{
          min-width:0!important;
          min-height:34px!important;
          justify-content:flex-start!important;
          padding:6px 7px!important;
          border-radius:10px!important;
          font-size:.58rem!important;
          line-height:1.1!important;
        }
        .staging-bulk-tool-check input{width:15px!important;height:15px!important;flex:0 0 auto!important}
        .staging-bulk-looks{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important}
        .staging-bulk-look{min-height:36px!important;padding:6px 3px!important;border-radius:9px!important;font-size:.58rem!important}
        .staging-bulk-note{margin-top:6px!important;font-size:.54rem!important}

        /* Entire business tool cards collapsed by default */
        .staging-business-card{
          margin:0!important;
          border-radius:13px!important;
        }
        .staging-business-card>.tool-editor-head{
          min-height:58px!important;
          padding:9px 10px!important;
          gap:8px!important;
          align-items:center!important;
        }
        .staging-business-card>.tool-editor-head .tool-editor-icon{
          width:31px!important;
          height:31px!important;
          min-width:31px!important;
          border-radius:9px!important;
        }
        .staging-business-card>.tool-editor-head .tool-editor-icon svg{width:16px!important;height:16px!important}
        .staging-business-card>.tool-editor-head h3{margin:0!important;font-size:.76rem!important;line-height:1.12!important}
        .staging-business-card>.tool-editor-head p{display:none!important}
        .staging-business-card>.tool-editor-head .entitlement-badge{
          padding:3px 5px!important;
          font-size:.49rem!important;
          line-height:1!important;
          white-space:nowrap!important;
        }
        .staging-tool-card-style-pill{display:inline-flex!important;margin-left:auto!important;padding:3px 5px!important;font-size:.48rem!important}
        .staging-tool-card-toggle{
          width:31px!important;
          min-width:31px!important;
          height:31px!important;
          margin-left:2px!important;
          border-radius:9px!important;
        }
        .staging-tool-card-toggle svg{width:15px!important;height:15px!important}

        /* Open card body */
        .staging-business-card.is-open{padding-bottom:9px!important}
        .staging-business-card.is-open>:not(.tool-editor-head){margin-left:9px!important;margin-right:9px!important}
        .staging-business-card.is-open>.staging-business-premium-options{margin-top:7px!important;margin-bottom:8px!important}
        .staging-business-card.is-open>.builder-list{margin-top:6px!important;margin-bottom:6px!important}
        .staging-business-card.is-open>.add-row{margin-top:4px!important}

        /* Style & Layout: same premium system, much more compact on mobile */
        .staging-business-premium-options{border-radius:12px!important}
        .staging-business-premium-options>summary{
          min-height:46px!important;
          padding:8px 9px!important;
          gap:7px!important;
        }
        .staging-business-premium-options>summary>span{gap:6px!important}
        .staging-business-premium-options>summary strong{font-size:.68rem!important}
        .staging-business-premium-options>summary small[data-business-style-summary]{
          max-width:120px!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
          font-size:.51rem!important;
        }
        .staging-business-premium-options .rich-premium-body{padding:9px!important}
        .staging-business-premium-options .rich-premium-label{margin-bottom:6px!important}
        .staging-business-premium-options .rich-premium-label strong{font-size:.68rem!important}
        .staging-business-premium-options .rich-premium-label span{font-size:.56rem!important;line-height:1.25!important}
        .staging-business-premium-options .rich-style-choices{
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:6px!important;
          margin-bottom:8px!important;
        }
        .staging-business-premium-options .rich-style-choice{
          min-height:54px!important;
          padding:7px!important;
          gap:7px!important;
          border-radius:10px!important;
        }
        .staging-business-premium-options .rich-style-swatch{
          width:29px!important;
          height:29px!important;
          min-width:29px!important;
          border-radius:8px!important;
        }
        .staging-business-premium-options .rich-style-choice strong{font-size:.64rem!important;line-height:1.05!important}
        .staging-business-premium-options .rich-style-choice small{font-size:.5rem!important;line-height:1.12!important;margin-top:1px!important}
        .staging-business-premium-options .rich-premium-fields{
          gap:7px!important;
          margin-top:7px!important;
        }
        .staging-business-premium-options .rich-field{gap:4px!important}
        .staging-business-premium-options .rich-field label{font-size:.6rem!important}
        .staging-business-premium-options .rich-field select,
        .staging-business-premium-options .rich-field input{
          min-height:40px!important;
          height:40px!important;
          padding:7px 9px!important;
          border-radius:10px!important;
          font-size:.67rem!important;
        }

        /* General controls inside opened tools */
        .staging-business-card.is-open .form-group{margin-bottom:8px!important}
        .staging-business-card.is-open .form-row{gap:7px!important;margin-bottom:7px!important}
        .staging-business-card.is-open .form-group>label,
        .staging-business-card.is-open>label.checkbox{font-size:.63rem!important}
        .staging-business-card.is-open .input,
        .staging-business-card.is-open input.input,
        .staging-business-card.is-open select.input{
          min-height:40px!important;
          padding:7px 9px!important;
          border-radius:10px!important;
          font-size:.67rem!important;
        }
        .staging-business-card.is-open .input-help,
        .staging-business-card.is-open small.input-help{font-size:.53rem!important;line-height:1.25!important}
        .staging-business-card.is-open .btn.btn-light,
        .staging-business-card.is-open .add-row{min-height:38px!important;padding:7px 10px!important;font-size:.63rem!important;border-radius:10px!important}

        /* Payment methods are especially long; tighten them */
        .staging-business-card.payment-sharing-editor .payment-method-card{padding:8px!important;margin-bottom:6px!important;border-radius:11px!important}
        .staging-business-card.payment-sharing-editor .payment-method-title{margin-bottom:6px!important}
        .staging-business-card.payment-sharing-editor .payment-method-title strong{font-size:.66rem!important}
        .staging-business-card.payment-sharing-editor .payment-method-title small{font-size:.52rem!important}

        /* Avoid giant gaps from nested rich/editor components */
        .staging-business-card.is-open details{margin-top:7px!important;margin-bottom:7px!important}
        .staging-business-card.is-open hr{margin:8px 0!important}
      }

      @media(max-width:390px){
        .staging-business-card>.tool-editor-head .entitlement-badge{display:none!important}
        .staging-tool-card-style-pill{font-size:.45rem!important}
        .staging-bulk-tool-list{grid-template-columns:1fr 1fr!important}
        .staging-business-premium-options>summary small[data-business-style-summary]{max-width:96px!important}
      }
    `;
    document.head.appendChild(style);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});
  else inject();
})();
