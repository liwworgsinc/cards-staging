function friendlyBillingError(message = '') {
  const text = String(message);
  if (/similar object exists in test mode|No such price/i.test(text)) {
    return 'Billing mode mismatch: LIW Digital Cards is using test prices with the wrong Stripe key.';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) {
    return 'Could not reach secure checkout. Refresh the page and try again. If it continues, confirm the Supabase Edge Function is deployed.';
  }
  if (/Price unavailable|Target plan price is unavailable|live Stripe price still needs to be connected|not configured for the selected billing interval/i.test(text)) {
    return 'This checkout is built, but its matching live Stripe price still needs to be connected.';
  }
  if (/No Stripe customer found/i.test(text)) {
    return 'Choose and complete a paid plan before opening Manage Billing.';
  }
  if (/already have an active/i.test(text)) {
    return 'Your paid plan is already active. Use the plan buttons to upgrade or Manage Billing for payment details.';
  }
  if (/payment method/i.test(text) && /update/i.test(text)) {
    return 'Update your payment method in Manage Billing, then try again.';
  }
  return text || 'Billing is temporarily unavailable.';
}

(function wireStagingPricingFreeLinks(){
  const pathname=String(location.pathname||'').toLowerCase();
  if(!pathname.endsWith('pricing.html'))return;
  document.querySelectorAll('a[href="register.html"]').forEach(link=>{
    link.href=liwUrl('guest-builder.html?from=pricing');
  });
})();

function rememberPendingPricingPlan(plan, interval) {
  try {
    sessionStorage.setItem('liw_cards_after_login', 'pricing');
    sessionStorage.setItem('liw_cards_pending_plan', JSON.stringify({
      plan,
      interval,
      savedAt: Date.now()
    }));
  } catch (_) {}
}

async function readBillingResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (_) { return { error: raw.slice(0, 300) }; }
}

async function getCurrentSubscription() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return { session: null, subscription: null };
  const [{ data: subscription }, { data: profile }] = await Promise.all([
    supabaseClient
    .from('subscriptions')
    .select('plan_key,status,billing_interval,stripe_subscription_id,cancel_at_period_end,trial_started_at,trial_ends_at,trial_used_at')
    .eq('user_id', session.user.id)
    .maybeSingle(),
    supabaseClient.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  ]);
  const access = await getLiwAccessContext(session.user, { refresh: true });
  return { session, subscription, isAdmin: access.isAdmin, isPlanPreview: access.isPlanPreview, previewPlanKey: access.planKey };
}

function setPlanButtonsBusy(plan, busy, label = 'Working…') {
  document.querySelectorAll(`[data-plan="${plan}"]`).forEach(button => {
    button.dataset.label = button.dataset.label || button.innerHTML;
    button.disabled = busy;
    button.innerHTML = busy ? `<span class="button-spinner"></span>${label}` : button.dataset.label;
  });
}

async function checkout(plan, interval = 'month') {
  if (['agency', 'white_label'].includes(plan) && LIW_CONFIG.resellerPlansEnabled !== true) {
    toast('Reseller plans are not available yet. Stripe Connect must be configured and tested first.');
    return;
  }
  const { session, subscription, isAdmin, isPlanPreview } = await getCurrentSubscription();
  if (!session) {
    if (plan === 'starter') {
      try {
        sessionStorage.setItem('liw_guest_entry', 'pricing');
        sessionStorage.removeItem('liw_cards_after_login');
        sessionStorage.removeItem('liw_cards_pending_plan');
      } catch (_) {}
      location.href = liwUrl('guest-builder.html?from=pricing');
      return;
    }
    rememberPendingPricingPlan(plan, interval);
    location.href = liwUrl('login.html?next=pricing');
    return;
  }
  if (isPlanPreview) {
    toast('Plan Simulator is preview-only. Your real subscription was not changed.');
    return;
  }
  if (isAdmin) {
    toast('LIW Admin already includes 100 cards and all software features. No plan purchase is needed.');
    return;
  }

  const activePaid = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status) && subscription.stripe_subscription_id;
  if (activePaid) return changePlan(plan, interval, session, subscription);

  setPlanButtonsBusy(plan, true, plan === 'starter' ? 'Activating free plan…' : 'Opening checkout…');
  try {
    await window.LIWReferral?.syncUser?.(session.user).catch(() => null);
    const res = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': LIW_CONFIG.supabaseKey
      },
      body: JSON.stringify({
        plan,
        interval,
        successUrl: liwUrl('dashboard.html?billing=success'),
        cancelUrl: location.href,
        affiliateCode: window.LIWReferral?.getCode?.(session.user) || localStorage.getItem('liw_affiliate_code') || null
      })
    });
    const data = await readBillingResponse(res);
    if (!res.ok) throw new Error(data.error || 'Unable to open checkout');
    if (data.free) {
      toast(data.message || 'Free Starter is active');
      setTimeout(() => location.href = data.url || liwUrl('dashboard.html?billing=free'), 450);
      return;
    }
    if (data.trialDays) sessionStorage.setItem('liw_trial_checkout', JSON.stringify({ plan, days: data.trialDays }));
    try { sessionStorage.removeItem('liw_cards_pending_plan'); } catch (_) {}
    location.href = data.url;
  } catch (error) {
    toast(friendlyBillingError(error.message));
    setPlanButtonsBusy(plan, false);
  }
}

async function changePlan(plan, interval, session = null, subscription = null) {
  if (['agency', 'white_label'].includes(plan) && LIW_CONFIG.resellerPlansEnabled !== true) {
    toast('Reseller plans are not available yet. Stripe Connect must be configured and tested first.');
    return;
  }
  let isAdmin = false;
  if (!session || !subscription) {
    const current = await getCurrentSubscription();
    session = current.session;
    subscription = current.subscription;
    isAdmin = current.isAdmin;
    if (current.isPlanPreview) return toast('Plan Simulator is preview-only. Exit simulation to change billing.');
  } else {
    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    isAdmin = isLiwAdminAccount(session.user, profile);
  }
  if (!session) return location.href = liwUrl('login.html');
  if (isAdmin) return toast('LIW Admin has no subscription bill. 100 cards and all software features are included.');

  if (subscription?.status === 'past_due') {
    toast('Update your payment method before changing plans.');
    setTimeout(openPortal, 700);
    return;
  }

  if (subscription?.plan_key === plan && (plan === 'starter' || subscription?.billing_interval === interval)) {
    toast(`You are already on ${titleCase(plan)}${plan === 'starter' ? '' : ` ${interval === 'year' ? 'yearly' : 'monthly'}`}.`);
    return;
  }

  const currentRank = { starter: 1, plus: 2, pro: 3, agency: 4, white_label: 5 }[subscription?.plan_key] || 0;
  const targetRank = { starter: 1, plus: 2, pro: 3, agency: 4, white_label: 5 }[plan] || 0;
  const accepted = plan === 'starter'
    ? window.confirm('Schedule Free Starter for the end of your current paid billing period? Your paid features stay active until then.')
    : window.confirm(`${targetRank > currentRank ? 'Upgrade' : 'Change'} to ${titleCase(plan)} ${interval === 'year' ? 'yearly' : 'monthly'}? Stripe will calculate any prorated amount.`);
  if (!accepted) return;

  setPlanButtonsBusy(plan, true, plan === 'starter' ? 'Scheduling…' : targetRank > currentRank ? 'Upgrading…' : 'Changing plan…');
  try {
    const res = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/manage-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ plan, interval })
    });
    const data = await readBillingResponse(res);
    if (!res.ok) throw new Error(data.error || 'Unable to change plan');

    toast(data.message || `${titleCase(plan)} selected`);
    if (data.paymentUrl) {
      setTimeout(() => location.href = data.paymentUrl, 500);
      return;
    }
    setTimeout(() => location.href = liwUrl('dashboard.html?billing=plan-changed'), 850);
  } catch (error) {
    toast(friendlyBillingError(error.message));
    setPlanButtonsBusy(plan, false);
  }
}

async function checkoutOneTime(offerKey, trigger = null, options = {}) {
  if (LIW_CONFIG.oneTimeServicesEnabled !== true) {
    toast('One-time services are not available yet. Live Stripe prices and checkout still need to be connected.');
    return;
  }
  const current = await getCurrentSubscription();
  const session = current.session;
  if (current.isPlanPreview) {
    toast('Plan Simulator is preview-only. No charge or order was created.');
    return;
  }
  if (!session) {
    sessionStorage.setItem('liw_cards_after_login', 'pricing');
    location.href = liwUrl('login.html?next=pricing');
    return;
  }

  const original = trigger?.innerHTML || '';
  if (trigger) {
    trigger.disabled = true;
    trigger.innerHTML = '<span class="button-spinner"></span>Opening checkout…';
  }

  try {
    const res = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/create-one-time-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        offerKey,
        cardId: options.cardId || null,
        successUrl: options.successUrl || liwUrl(`dashboard.html?purchase=success&offer=${encodeURIComponent(offerKey)}`),
        cancelUrl: options.cancelUrl || location.href
      })
    });
    const data = await readBillingResponse(res);
    if (!res.ok) throw new Error(data.error || 'Unable to open checkout');
    location.href = data.url;
  } catch (error) {
    toast(friendlyBillingError(error.message));
    if (trigger) {
      trigger.disabled = false;
      trigger.innerHTML = original;
    }
  }
}

async function openPortal() {
  const { session, isAdmin, isPlanPreview } = await getCurrentSubscription();
  if (!session) {
    location.href = liwUrl('login.html');
    return;
  }
  if (isPlanPreview) {
    toast('Plan Simulator is preview-only. Your billing portal was not opened.');
    return;
  }
  if (isAdmin) {
    toast('LIW Admin does not need a billing portal. 100 cards and all software features are included.');
    return;
  }

  try {
    const res = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ returnUrl: liwUrl('dashboard.html') })
    });
    const data = await readBillingResponse(res);
    if (!res.ok) throw new Error(data.error || 'Unable to open billing portal');
    location.href = data.url;
  } catch (error) {
    toast(friendlyBillingError(error.message));
  }
}