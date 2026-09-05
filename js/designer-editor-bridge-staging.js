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
const originalApplyEntitlements = typeof applyEntitlements === 'function' ? applyEntitlements : null;
const originalTogglePublish = typeof togglePublish === 'function' ? togglePublish : null;

function titlePlan(value) {
  return String(value || 'starter').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function designerPlanHas(feature, addonKeys) {
  const definition = addonDefinitions.find(item => item.entitlement_key === feature || item.addon_key === feature);
  return Boolean(
    definition?.included_plans?.includes(currentPlan) ||
    (definition?.addon_key && addonKeys.includes(definition.addon_key))
  );
}

function syncCustomerPlanSummary() {
  if (!assignedDesignerContext) return;
  const summary = document.getElementById('editor-entitlement-summary');
  if (!summary) return;

  const enabled = (addonDefinitions || [])
    .filter(item => item?.name && designerPlanHas(item.entitlement_key || item.addon_key, Array.isArray(assignedDesignerContext.addon_keys) ? assignedDesignerContext.addon_keys : []))
    .map(item => item.name);

  const features = enabled.length
    ? enabled.slice(0, 8).map(name => escapeHtml(name)).join(' · ')
    : 'Core features available on this customer plan.';

  summary.innerHTML = `<div><strong>Customer plan features · ${escapeHtml(titlePlan(currentPlan))}</strong><span>${features}<br>You are designing with this customer’s LIW plan and add-ons. Your personal LIW plan does not affect this job.</span></div><a class="btn btn-light btn-sm" href="designer-team.html?order=${encodeURIComponent(assignedDesignerContext.order_id)}">Back to design job</a>`;
}

function installDesignerUi(context) {
  const canWrite = context.can_write === true;
  document.body.classList.add('liw-assigned-designer-editor');
  document.body.dataset.designerWorkflowStatus = context.workflow_status || '';

  const back = document.querySelector('.editor-topbar-left a[aria-label="Back to dashboard"]');
  const brand = document.querySelector('.editor-topbar-left a.brand');
  if (back) {
    back.href = `designer-team.html?order=${encodeURIComponent(context.order_id)}`;
    back.setAttribute('aria-label', 'Back to My Design Jobs');
  }
  if (brand) brand.href = `designer-team.html?order=${encodeURIComponent(context.order_id)}`;

  const workspace = document.querySelector('.editor-workspace');
  if (workspace && !document.getElementById('liw-designer-editor-notice')) {
    const notice = document.createElement('div');
    notice.id = 'liw-designer-editor-notice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'margin:0 0 14px;padding:12px 14px;border:1px solid rgba(212,168,79,.45);border-radius:14px;background:#fffaf0;color:#1a2742;display:flex;align-items:flex-start;gap:10px;font-size:.82rem;line-height:1.45';
    notice.innerHTML = canWrite
      ? '<span style="display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:#0b1438;color:#fff">✦</span><div><strong style="display:block;margin-bottom:2px">Assigned LIW design job</strong><span>You are editing only this customer card. Changes save to the customer project. Publishing stays locked until customer approval.</span></div>'
      : '<span style="display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:#0b1438;color:#fff">✓</span><div><strong style="display:block;margin-bottom:2px">Review lock active</strong><span>This customer card is read-only while it is in review, approved, publishing, completed, or waiting to start. If a revision is requested, editing automatically reopens.</span></div>';
    workspace.prepend(notice);
  }

  ['publish-button','panel-publish-button'].forEach(id => {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = true;
    button.title = 'Customer approval and LIW publishing workflow are required';
    button.setAttribute('aria-disabled', 'true');
  });

  const publishCopy = document.getElementById('publish-copy');
  if (publishCopy) publishCopy.textContent = canWrite
    ? 'LIW designer mode: save and preview here, then return to My Design Jobs to submit the project for customer review.'
    : 'This design is locked at its current workflow stage. Return to My Design Jobs for the latest project status.';

  const topbar = document.querySelector('.editor-topbar-right');
  if (topbar && !document.getElementById('liw-designer-return')) {
    const link = document.createElement('a');
    link.id = 'liw-designer-return';
    link.className = 'btn btn-light';
    link.href = `designer-team.html?order=${encodeURIComponent(context.order_id)}`;
    link.textContent = 'My Design Jobs';
    topbar.insertBefore(link, topbar.firstChild);
  }

  if (!canWrite) {
    setTimeout(() => {
      const generic = document.querySelector('.editor-access-notice');
      if (generic) {
        generic.innerHTML = '<strong>Read-only at this workflow stage</strong><span>The design is locked until LIW starts the job or a customer revision is requested. You can still preview the card and review the submitted content.</span>';
      }
      const saveNow = document.getElementById('save-now-button');
      if (saveNow) {
        saveNow.disabled = true;
        saveNow.title = 'Editing is locked at this workflow stage';
      }
    }, 0);
  }

  syncCustomerPlanSummary();
}

loadCard = async function() {
  assignedDesignerContext = null;
  const originalAdminState = isAdmin;

  if (currentId && user && !isAdmin) {
    const { data: context, error } = await supabaseClient.rpc('designer_card_access_context', { p_card_id: currentId });
    if (!error && context?.order_id && context?.owner_user_id && context.owner_user_id !== user.id) {
      assignedDesignerContext = context;
      // Supabase has already verified this card-specific assignment. The temporary
      // flag bypasses only the legacy front-end workspace-membership branch; RLS
      // remains the authority for every card and child-row read/write.
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
  canEditCurrentCard = assignedDesignerContext.can_write === true;
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
    planName: `Customer ${titlePlan(currentPlan)}`,
    has(feature) { return designerPlanHas(feature, addonKeys); }
  };

  installDesignerUi(assignedDesignerContext);
};

if (originalApplyEntitlements) {
  applyEntitlements = function(...args) {
    const result = originalApplyEntitlements.apply(this, args);
    if (assignedDesignerContext) syncCustomerPlanSummary();
    return result;
  };
}

if (originalTogglePublish) {
  togglePublish = async function(event) {
    if (currentTeamRole === 'designer' || assignedDesignerContext) {
      event?.preventDefault?.();
      toast('Publishing is controlled by the LIW customer approval workflow.');
      return;
    }
    return originalTogglePublish.call(this, event);
  };
}

saveEditorStateToServer = async function(payload) {
  if (currentTeamRole !== 'designer') return originalSaveEditorStateToServer(payload);
  if (assignedDesignerContext?.can_write !== true) {
    throw new Error('This design is read-only at its current workflow stage.');
  }

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
