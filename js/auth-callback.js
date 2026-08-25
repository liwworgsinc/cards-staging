const callbackMessage = document.getElementById('callback-message');
const callbackLogin = document.getElementById('callback-login');
const AUTH_WAIT_MS = 10000;
const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';

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
  try {
    const next = String(sessionStorage.getItem('liw_cards_after_login') || '').trim().toLowerCase();
    return ['pricing', 'editor', 'guest-editor'].includes(next) ? next : '';
  } catch (_) {
    return '';
  }
}

function pricingResumeUrl() {
  const url = new URL(liwUrl('pricing.html'));
  try {
    const raw = sessionStorage.getItem('liw_cards_pending_plan');
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
    sessionStorage.removeItem('liw_guest_signup_pending');
    sessionStorage.setItem('liw_guest_claim_ready', '1');
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
    }, 300);

    timeoutTimer = setTimeout(() => finish(null), timeoutMs);
  });
}

async function resolveCallbackSession(query, hash) {
  let session = await currentSession();
  if (session) return session;

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabaseClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    session = data.session || null;
  }

  const code = query.get('code');
  if (!session && code) {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      session = await currentSession();
      if (!session) throw error;
    } else session = data.session || null;
  }

  const tokenHash = query.get('token_hash') || hash.get('token_hash');
  if (!session && tokenHash) {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: normalizeOtpType(query.get('type') || hash.get('type'))
    });
    if (error) throw error;
    session = data.session || null;
  }

  return session || await waitForSession();
}

async function acceptTeamInvite(session) {
  const { data, error } = await supabaseClient.rpc('accept_workspace_invites');
  if (error) throw new Error(`You signed in, but the team invitation could not be connected: ${error.message}`);
  sessionStorage.removeItem('liw_team_invite_pending');
  sessionStorage.removeItem('liw_team_invite_email');
  return Number(data || 0);
}

async function completeVerification() {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const explicitTeamInvite =
    query.get('team_invite') === 'accepted' ||
    query.get('team_invite') === '1' ||
    hash.get('team_invite') === 'accepted' ||
    sessionStorage.getItem('liw_team_invite_pending') === '1';
  const recoveryFlow = query.get('type') === 'recovery' || hash.get('type') === 'recovery';
  const tokenType = normalizeOtpType(query.get('type') || hash.get('type'));
  const signupFlow = tokenType === 'signup';
  const errorDescription = readAuthError(query, hash);
  const requestedNext = requestedPostAuthDestination();

  if (explicitTeamInvite) sessionStorage.setItem('liw_team_invite_pending', '1');

  if (errorDescription) {
    cleanAuthUrl();
    setCallbackMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')), 'error');
    if (callbackLogin) {
      callbackLogin.href = explicitTeamInvite ? teamLoginUrl() : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
    return;
  }

  try {
    const session = await resolveCallbackSession(query, hash);
    const teamInvite = explicitTeamInvite || isTeamInviteMetadata(session?.user);

    if (session) {
      await window.LIWReferral?.syncUser?.(session.user).catch(() => null);
      if (teamInvite) await acceptTeamInvite(session);
      const guestClaimed = !teamInvite && claimGuestDraftForUser(session.user);
      cleanAuthUrl();

      if (recoveryFlow || tokenType === 'recovery') {
        setCallbackMessage('Recovery link verified. Opening the password form…', 'success');
        setTimeout(() => location.replace(liwUrl('reset-password.html')), 400);
        return;
      }

      const destination = teamInvite
        ? liwUrl('dashboard.html?team=connected')
        : guestClaimed
          ? liwUrl('editor.html?welcome=1&guest_claim=1')
          : signupFlow && requestedNext === 'pricing'
            ? pricingResumeUrl()
            : signupFlow
              ? liwUrl('editor.html?welcome=1')
              : requestedNext === 'pricing'
                ? pricingResumeUrl()
                : liwUrl('dashboard.html');

      setCallbackMessage(
        teamInvite
          ? 'Team invitation accepted. Opening the shared workspace…'
          : guestClaimed
            ? 'Email verified. Restoring the card you already built…'
            : signupFlow && requestedNext === 'pricing'
              ? 'Email verified. Returning to the plan you were viewing…'
              : signupFlow
                ? 'Email verified. Let’s build your first LIW Card…'
                : requestedNext === 'pricing'
                  ? 'Email verified. Returning to Pricing…'
                  : 'Email verified. Opening your LIW dashboard…',
        'success'
      );
      setTimeout(() => location.replace(destination), 400);
      return;
    }

    cleanAuthUrl();
    if (signupFlow && !explicitTeamInvite) {
      if (hasGuestDraft()) {
        sessionStorage.setItem('liw_cards_after_login', 'guest-editor');
      } else if (requestedNext !== 'pricing') {
        sessionStorage.setItem('liw_cards_after_login', 'editor');
      }
    }
    setCallbackMessage(
      explicitTeamInvite
        ? 'The invitation link was verified, but this browser did not start a session. Log in with the invited email to finish connecting.'
        : signupFlow && hasGuestDraft()
          ? 'Your email is verified. Log in once and we’ll restore the card you already built.'
          : signupFlow && requestedNext === 'pricing'
            ? 'Your email is verified. Log in once and we’ll return you to Pricing.'
            : signupFlow
              ? 'Your email is verified. Log in once and we’ll open your first card setup.'
              : 'Your email was verified, but this browser did not start a session. Log in to continue.',
      'success'
    );
    if (callbackLogin) {
      callbackLogin.href = explicitTeamInvite ? teamLoginUrl() : requestedNext === 'pricing' ? liwUrl('login.html?next=pricing') : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  } catch (error) {
    const teamInvite = explicitTeamInvite || sessionStorage.getItem('liw_team_invite_pending') === '1';
    cleanAuthUrl();
    setCallbackMessage(error.message || 'We could not finish the verification redirect.', 'error');
    if (callbackLogin) {
      callbackLogin.href = teamInvite ? teamLoginUrl() : requestedNext === 'pricing' ? liwUrl('login.html?next=pricing') : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  }
}

completeVerification();