(function(){
'use strict';

if (typeof LIW_IS_GITHUB_STAGING === 'undefined' || !LIW_IS_GITHUB_STAGING) return;
if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
if (typeof loadCard !== 'function' || typeof saveEditorStateToServer !== 'function') {
  console.error('LIW designer editor bridge loaded before editor core.');
  return;
}

let assignedDesignerContext = null;
const originalLoadCard = loadCard;
const originalSaveEditorStateToServer = saveEditorStateToServer;

function designerPlanHas(feature, addonKeys) {
  const definition = addonDefinitions.find(item => item.entitlement_key === feature || item.addon_key === feature);
  return Boolean(
    definition?.included_plans?.includes(currentPlan) ||
    (definition?.addon_key && addonKeys.includes(definition.addon_key))
  );
}

function installDesignerUi(context) {
  document.body.classList.add('liw-assigned-designer-editor');
  const back = document.querySelector('.editor-topbar-left a[aria-label="Back to dashboard"]');
  const brand = document.querySelector('.editor-topbar-left a.brand');
  if (back) {
    back.href = 'designer-team.html';
    back.setAttribute('aria-label', 'Back to My Design Jobs');
  }
  if (brand) brand.href = 'designer-team.html';

  const workspace = document.querySelector('.editor-workspace');
  if (workspace && !document.getElementById('liw-designer-editor-notice')) {
    const notice = document.createElement('div');
    notice.id = 'liw-designer-editor-notice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'margin:0 0 14px;padding:12px 14px;border:1px solid rgba(212,168,79,.45);border-radius:14px;background:#fffaf0;color:#1a2742;display:flex;align-items:flex-start;gap:10px;font-size:.82rem;line-height:1.45';
    notice.innerHTML = '<span style="display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:#0b1438;color:#fff">✦</span><div><strong style="display:block;margin-bottom:2px">Assigned LIW design job</strong><span>You are editing only this customer card. Changes save to the customer project. Publishing stays locked until the customer review/approval workflow is complete.</span></div>';
    workspace.prepend(notice);
  }

  ['publish-button','panel-publish-button'].forEach(id => {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = true;
    button.title = 'Customer approval is required before publishing';
    button.setAttribute('aria-disabled', 'true');
  });

  const publishCopy = document.getElementById('publish-copy');
  if (publishCopy) publishCopy.textContent = 'LIW designer mode: save and preview here, then return to My Design Jobs to submit the project for customer review.';

  const topbar = document.querySelector('.editor-topbar-right');
  if (topbar && !document.getElementById('liw-designer-return')) {
    const link = document.createElement('a');
    link.id = 'liw-designer-return';
    link.className = 'btn btn-light';
    link.href = `designer-team.html?order=${encodeURIComponent(context.order_id)}`;
    link.textContent = 'My Design Jobs';
    topbar.insertBefore(link, topbar.firstChild);
  }
}

loadCard = async function() {
  assignedDesignerContext = null;
  const originalAdminState = isAdmin;

  if (currentId && user && !isAdmin) {
    const { data: context, error } = await supabaseClient.rpc('designer_card_access_context', { p_card_id: currentId });
    if (!error && context?.order_id && context?.owner_user_id && context.owner_user_id !== user.id) {
      assignedDesignerContext = context;
      // The legacy editor only knows owner/admin/workspace membership. Temporarily bypass
      // that front-end branch after Supabase has verified this card-specific assignment.
      // RLS still controls every card/child-row read below.
      isAdmin = true;
    }
  }

  try {
    await originalLoadCard();
  } finally {
    isAdmin = originalAdminState;
  }

  if (!assignedDesignerContext) return;

  const addonKeys = Array.isArray(assignedDesignerContext.addon_keys) ? assignedDesignerContext.addon_keys : [];
  currentTeamRole = 'designer';
  canEditCurrentCard = true;
  currentCardOwnerId = assignedDesignerContext.owner_user_id;
  currentPlan = assignedDesignerContext.plan_key || 'starter';
  activeAddons = addonKeys.map(addon_key => ({ addon_key, status: 'active' }));
  templatePurchases = Array.isArray(assignedDesignerContext.template_purchases) ? assignedDesignerContext.template_purchases : [];
  isPlanPreview = false;
  isAdmin = false;
  editorAccess = {
    ...(editorAccess || {}),
    isAdmin: false,
    isPlanPreview: false,
    planKey: currentPlan,
    planName: `Customer ${String(currentPlan).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}`,
    has(feature) { return designerPlanHas(feature, addonKeys); }
  };

  installDesignerUi(assignedDesignerContext);
};

saveEditorStateToServer = async function(payload) {
  if (currentTeamRole !== 'designer') return originalSaveEditorStateToServer(payload);

  const nativeFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (typeof url === 'string' && url.includes('/functions/v1/save-card-state')) {
      const replacement = url.replace('/functions/v1/save-card-state', '/functions/v1/save-designer-card-state');
      if (typeof input === 'string') return nativeFetch.call(window, replacement, init);
      return nativeFetch.call(window, new Request(replacement, input), init);
    }
    return nativeFetch.call(window, input, init);
  };

  try {
    return await originalSaveEditorStateToServer(payload);
  } finally {
    window.fetch = nativeFetch;
  }
};
})();
