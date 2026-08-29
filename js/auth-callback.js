const callbackMessage = document.getElementById('callback-message');
const callbackLogin = document.getElementById('callback-login');
const AUTH_WAIT_MS = 5000;
const POST_AUTH_SYNC_BUDGET_MS = 1800;
const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';
const OAUTH_PROVIDER_KEY = 'liw_oauth_provider';
const OAUTH_LEGAL_ACCEPTED_AT_KEY = 'liw_oauth_legal_accepted_at';
const OAUTH_LEGAL_VERSION_KEY = 'liw_oauth_legal_version';
const OAUTH_AFFILIATE_VERSION_KEY = 'liw_oauth_affiliate_agreement_version';
const OAUTH_ENTRY_MODE_KEY = 'liw_oauth_entry_mode';

function sessionGet(key, fallback = '') {
  try {
    const value = sessionStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function sessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

function sessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (_) {}
}

function setCallbackMessage(text, state = 'working') {
  if (!callbackMessage) return;
  callbackMessage.textContent = text;
  callbackMessage.dataset.state = state;
}

function readAuthError(query, hash) {
  return (
    query.get('error_description') ||
    hash.get('error_description') ||
    query.get('error_code') ||
    hash.get('error_code') ||
    query.get('error') ||
    hash.get('error') ||
    ''
  );
}

function normalizeOtpType(value) {
  const allowed = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);
  const type = String(value || '').trim().toLowerCase();
  return allowed.has(type) ? type : 'email';
}

function hasGuestDraft() {
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return false;
    const draft = JSON.parse(raw);
    return Boolean(String(draft?.card?.full_name || '').trim());
  } catch (_) {
    return false;
  }
}

function requestedPostAuthDestination() {
  const next = String(sessionGet('liw_cards_after_login') || '').trim().toLowerCase();
  return ['pricing', 'editor', 'guest-editor'].includes(next) ? next : '';
}

function pricingResumeUrl() {
  const url = new URL(liwUrl('pricing.html'));
  try {
    const raw = sessionGet('liw_cards_pending_plan');
    const pending = raw ? JSON.parse(raw) : null;
    if (pending?.plan) url.searchParams.set('resume_plan', String(pending.plan));
    if (pending?.interval) url.searchParams.set('interval', String(pending.interval));
  } catch (_) {}
  return url.href;
}

function claimGuestDraftForUser(authUser) {
  if (!authUser?.id) return false;
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (!draft?.card || !String(draft.card.full_name || '').trim()) return false;
    draft.version = 1;
    draft.cardId = null;
    draft.savedAt = Date.now();
    draft.card.status = 'draft';
    draft.card.products_enabled = false;
    draft.card.cover_image_url = '';
    draft.card.template_id = '';
    draft.profileUrl = '';
    draft.coverUrl = '';
    draft.products = [];
    localStorage.setItem(`liw_editor_draft_${authUser.id}_new`, JSON.stringify(draft));
    localStorage.removeItem(GUEST_DRAFT_KEY);
    sessionRemove('liw_guest_signup_pending');
    sessionSet('liw_guest_claim_ready', '1');
    return true;
  } catch (_) {
    return false;
  }
}

function isTeamInviteMetadata(user) {
  const metadata = user?.user_metadata || {};
  return Boolean(
    metadata.liw_team_invite ||
    metadata.invited_workspace_owner ||
    metadata.invited_workspace_role
  );
}

function currentOAuthProvider() {
  return String(sessionGet(OAUTH_PROVIDER_KEY) || '').trim().toLowerCase();
}

function isRecentlyCreatedUser(user) {
  const createdAt = Date.parse(user?.created_at || '');
  const lastSignInAt = Date.parse(user?.last_sign_in_at || '');
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignInAt)) return false;
  return Math.abs(lastSignInAt - createdAt) <= 2 * 60 * 1000;
}

async function syncOAuthLegalMetadata(session) {
  if (!session?.user || currentOAuthProvider() !== 'google') return session;

  const acceptedAt = String(sessionGet(OAUTH_LEGAL_ACCEPTED_AT_KEY) || '').trim();
  if (!acceptedAt) return session;

  const legalVersion = String(sessionGet(OAUTH_LEGAL_VERSION_KEY) || '').trim();
  const affiliateVersion = String(sessionGet(OAUTH_AFFILIATE_VERSION_KEY) || '').trim();
  const existing = session.user.user_metadata || {};
  const metadata = {
    ...existing,
    terms_accepted_at: existing.terms_accepted_at || acceptedAt,
    privacy_accepted_at: existing.privacy_accepted_at || acceptedAt,
    affiliate_terms_accepted_at: existing.affiliate_terms_accepted_at || acceptedAt,
    affiliate_agreement_version: existing.affiliate_agreement_version || affiliateVersion || undefined,
    legal_version: existing.legal_version || legalVersion || undefined,
    oauth_consent_source: existing.oauth_consent_source || 'google_clickwrap'
  };

  const { data, error } = await supabaseClient.auth.updateUser({ data: metadata });
  if (error) throw new Error(`Google sign-in succeeded, but we could not save your account consent: ${error.message}`);
  if (data?.user) session.user = data.user;
  return session;
}

async function runPostAuthSyncWithinBudget(session) {
  let nextSession = session;
  const legalTask = syncOAuthLegalMetadata(session)
    .then(updated => {
      nextSession = updated || session;
      return true;
    })
    .catch(error => {
      console.warn('LIW OAuth consent metadata will retry on a later visit:', error);
      return false;
    });
  const referralTask = Promise.resolve(window.LIWReferral?.syncUser?.(session?.user))
    .catch(error => {
      console.warn('LIW referral sync deferred after sign-in:', error);
      return null;
    });

  await Promise.race([
    Promise.allSettled([legalTask, referralTask]),
    new Promise(resolve => setTimeout(resolve, POST_AUTH_SYNC_BUDGET_MS))
  ]);
  return nextSession;
}

function clearOAuthIntent() {
  sessionRemove(OAUTH_PROVIDER_KEY);
  sessionRemove(OAUTH_LEGAL_ACCEPTED_AT_KEY);
  sessionRemove(OAUTH_LEGAL_VERSION_KEY);
  sessionRemove(OAUTH_AFFILIATE_VERSION_KEY);
  sessionRemove(OAUTH_ENTRY_MODE_KEY);
}

function cleanAuthUrl() {
  history.replaceState({}, document.title, liwUrl('auth-callback.html'));
}

function teamLoginUrl(email = '') {
  const url = new URL(liwUrl('login.html'));
  url.searchParams.set('team_invite', '1');
  if (email) url.searchParams.set('email', email);
  return url.href;
}

async function currentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

async function waitForSession(timeoutMs = AUTH_WAIT_MS) {
  const existing = await currentSession();
  if (existing) return existing;

  return await new Promise(resolve => {
    let settled = false;
    let pollTimer = null;
    let timeoutTimer = null;
    let subscription = null;

    const finish = session => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      subscription?.unsubscribe();
      resolve(session || null);
    };

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });
    subscription = authListener?.subscription || null;

    pollTimer = setInterval(async () => {
      try {
        const session = await currentSession();
        if (session) finish(session);
      } catch (_) {}
    }, 250);

    timeoutTimer = setTimeout(() => finish(null), timeoutMs);
  });
}

async function resolveCallbackSession(query, hash) {
  // On the callback page config.js disables Supabase's automatic URL detection.
  // Process the returned credential exactly once here before asking getSession(),
  // which avoids the SDK/manual PKCE lock contention that previously stalled Google sign-in.
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabaseClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    if (data.session) return data.session;
  }

  const code = query.get('code');
  if (code) {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      const existing = await currentSession().catch(() => null);
      if (!existing) throw error;
      return existing;
    }
    if (data.session) return data.session;
  }

  const tokenHash = query.get('token_hash') || hash.get('token_hash');
  if (tokenHash) {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: normalizeOtpType(query.get('type') || hash.get('type'))
    });
    if (error) throw error;
    if (data.session) return data.session;
  }

  const session = await currentSession();
  return session || await waitForSession();
}

async function acceptTeamInvite(session) {
  const invitedEmail = String(sessionGet('liw_team_invite_email') || '').trim().toLowerCase();
  const signedInEmail = String(session?.user?.email || '').trim().toLowerCase();
  if (invitedEmail && signedInEmail && invitedEmail !== signedInEmail) {
    await supabaseClient.auth.signOut();
    throw new Error(`This invitation belongs to ${invitedEmail}. Sign in with that Google account or email address.`);
  }

  const { data, error } = await supabaseClient.rpc('accept_workspace_invites');
  if (error) throw new Error(`You signed in, but the team invitation could not be connected: ${error.message}`);
  sessionRemove('liw_team_invite_pending');
  sessionRemove('liw_team_invite_email');
  return Number(data || 0);
}

async function completeVerification() {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const explicitTeamInvite =
    query.get('team_invite') === 'accepted' ||
    query.get('team_invite') === '1' ||
    hash.get('team_invite') === 'accepted' ||
    sessionGet('liw_team_invite_pending') === '1';
  const recoveryFlow = query.get('type') === 'recovery' || hash.get('type') === 'recovery';
  const tokenType = normalizeOtpType(query.get('type') || hash.get('type'));
  const signupFlow = tokenType === 'signup';
  const oauthProvider = currentOAuthProvider();
  const googleOAuthFlow = oauthProvider === 'google';
  const errorDescription = readAuthError(query, hash);
  const requestedNext = requestedPostAuthDestination();

  if (explicitTeamInvite) sessionSet('liw_team_invite_pending', '1');

  if (errorDescription) {
    cleanAuthUrl();
    clearOAuthIntent();
    setCallbackMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')), 'error');
    if (callbackLogin) {
      callbackLogin.href = explicitTeamInvite ? teamLoginUrl() : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
    return;
  }

  try {
    let session = await resolveCallbackSession(query, hash);
    const googleSignupFlow = googleOAuthFlow && isRecentlyCreatedUser(session?.user);
    const signupLikeFlow = signupFlow || googleSignupFlow;
    const teamInvite = explicitTeamInvite || isTeamInviteMetadata(session?.user);

    if (session) {
      // Remove the one-time code immediately once the session exists so refresh/back
      // cannot accidentally try to exchange the same Google code again.
      cleanAuthUrl();

      if (recoveryFlow || tokenType === 'recovery') {
        clearOAuthIntent();
        setCallbackMessage('Recovery link verified. Opening the password form…', 'success');
        setTimeout(() => location.replace(liwUrl('reset-password.html')), 150);
        return;
      }

      if (teamInvite) await acceptTeamInvite(session);
      const guestClaimed = !teamInvite && claimGuestDraftForUser(session.user);

      setCallbackMessage(
        teamInvite
          ? 'Team invitation accepted. Opening the shared workspace…'
          : guestClaimed
            ? googleOAuthFlow
              ? 'Signed in with Google. Restoring the card you already built…'
              : 'Email verified. Restoring the card you already built…'
            : signupLikeFlow && requestedNext === 'pricing'
              ? googleOAuthFlow
                ? 'Google account connected. Returning to the plan you were viewing…'
                : 'Email verified. Returning to the plan you were viewing…'
              : signupLikeFlow
                ? googleOAuthFlow
                  ? 'Google account connected. Let’s build your first LIW Card…'
                  : 'Email verified. Let’s build your first LIW Card…'
                : requestedNext === 'pricing'
                  ? googleOAuthFlow
                    ? 'Signed in with Google. Returning to Pricing…'
                    : 'Email verified. Returning to Pricing…'
                  : googleOAuthFlow
                    ? 'Signed in with Google. Opening your LIW dashboard…'
                    : 'Email verified. Opening your LIW dashboard…',
        'success'
      );

      // Consent/referral bookkeeping is useful but must never hold the customer on
      // auth-callback for minutes. Give it a short budget, then continue the handoff.
      session = await runPostAuthSyncWithinBudget(session);
      clearOAuthIntent();

      const destination = teamInvite
        ? liwUrl('dashboard.html?team=connected')
        : guestClaimed
          ? liwUrl('editor.html?welcome=1&guest_claim=1')
          : signupLikeFlow && requestedNext === 'pricing'
            ? pricingResumeUrl()
            : signupLikeFlow
              ? liwUrl('editor.html?welcome=1')
              : requestedNext === 'pricing'
                ? pricingResumeUrl()
                : requestedNext === 'editor'
                  ? liwUrl('editor.html?welcome=1')
                  : requestedNext === 'guest-editor'
                    ? liwUrl('editor.html?welcome=1&guest_claim=1')
                    : liwUrl('dashboard.html');

      setTimeout(() => location.replace(destination), 100);
      return;
    }

    cleanAuthUrl();
    clearOAuthIntent();
    if (signupFlow && !explicitTeamInvite) {
      if (hasGuestDraft()) {
        sessionSet('liw_cards_after_login', 'guest-editor');
      } else if (requestedNext !== 'pricing') {
        sessionSet('liw_cards_after_login', 'editor');
      }
    }
    setCallbackMessage(
      explicitTeamInvite
        ? 'The invitation link was verified, but this browser did not start a session. Log in with the invited email to finish connecting.'
        : googleOAuthFlow
          ? 'Google returned to LIW Cards, but this browser did not start a session. Try Google sign-in again.'
          : signupFlow && hasGuestDraft()
            ? 'Your email is verified. Log in once and we’ll restore the card you already built.'
            : signupFlow && requestedNext === 'pricing'
              ? 'Your email is verified. Log in once and we’ll return you to Pricing.'
              : signupFlow
                ? 'Your email is verified. Log in once and we’ll open your first card setup.'
                : 'Your email was verified, but this browser did not start a session. Log in to continue.',
      googleOAuthFlow ? 'error' : 'success'
    );
    if (callbackLogin) {
      callbackLogin.href = explicitTeamInvite ? teamLoginUrl() : requestedNext === 'pricing' ? liwUrl('login.html?next=pricing') : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  } catch (error) {
    const teamInvite = explicitTeamInvite || sessionGet('liw_team_invite_pending') === '1';
    cleanAuthUrl();
    clearOAuthIntent();
    setCallbackMessage(error.message || 'We could not finish the sign-in redirect.', 'error');
    if (callbackLogin) {
      callbackLogin.href = teamInvite ? teamLoginUrl() : requestedNext === 'pricing' ? liwUrl('login.html?next=pricing') : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  }
}

completeVerification();