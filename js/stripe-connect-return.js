(async function completeStripeConnection() {
  const params = new URLSearchParams(location.search);
  const title = document.getElementById('connect-return-title');
  const copy = document.getElementById('connect-return-copy');
  const loader = document.getElementById('connect-return-loader');
  const button = document.getElementById('connect-return-button');
  const oauthError = params.get('error');
  if (oauthError) return fail(params.get('error_description') || 'Stripe connection was canceled.');
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return fail('The Stripe return link is incomplete. Start again from Pro Reseller.');
  try {
    const user = await requireUser();
    if (!user) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/complete-stripe-connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ code, state })
    });
    const raw = await response.text(); let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'Unable to finish Stripe connection.');
    loader.hidden = true; title.textContent = data.chargesEnabled ? 'Stripe is connected' : 'Stripe connected — verification may be needed'; copy.textContent = data.message || 'Your Stripe account is now linked to your Pro Reseller workspace.'; button.hidden = false;
    history.replaceState({}, '', 'stripe-connect-return.html?connected=1');
    setTimeout(() => location.href = liwUrl('addons.html?plan=white_label#white-label-workspace'), 1600);
  } catch (error) { fail(error.message || 'Unable to finish Stripe connection.'); }
  function fail(message) { loader.hidden = true; title.textContent = 'Stripe connection not completed'; copy.textContent = message; button.hidden = false; }
})();
