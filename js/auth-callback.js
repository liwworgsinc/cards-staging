const callbackMessage = document.getElementById('callback-message');
const callbackLogin = document.getElementById('callback-login');
const AUTH_WAIT_MS = 10000;

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
      } catch (_) {
        // The timeout below provides the fallback state.
      }
    }, 300);

    timeoutTimer = setTimeout(() => finish(null), timeoutMs);
  });
}

async function resolveCallbackSession(query, hash) {
  // Supabase may already have processed the URL because detectSessionInUrl is on.
  // Always check first so we never exchange the same authorization code twice.
  let session = await currentSession();
  if (session) return session;

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    session = data.session || null;
  }

  const code = query.get('code');
  if (!session && code) {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      // The automatic URL detector may have completed while this call was running.
      session = await currentSession();
      if (!session) throw error;
    } else {
      session = data.session || null;
    }
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
      cleanAuthUrl();

      if (recoveryFlow || tokenType === 'recovery') {
        setCallbackMessage('Recovery link verified. Opening the password form…', 'success');
        setTimeout(() => location.replace(liwUrl('reset-password.html')), 400);
        return;
      }

      const destination = teamInvite
        ? 'dashboard.html?team=connected'
        : signupFlow
          ? 'editor.html?welcome=1'
          : 'dashboard.html';

      setCallbackMessage(
        teamInvite
          ? 'Team invitation accepted. Opening the shared workspace…'
          : signupFlow
            ? 'Email verified. Let’s build your first LIW Card…'
            : 'Email verified. Opening your LIW dashboard…',
        'success'
      );
      setTimeout(() => location.replace(liwUrl(destination)), 400);
      return;
    }

    cleanAuthUrl();
    if (signupFlow && !explicitTeamInvite) {
      sessionStorage.setItem('liw_cards_after_login', 'editor');
    }
    setCallbackMessage(
      explicitTeamInvite
        ? 'The invitation link was verified, but this browser did not start a session. Log in with the invited email to finish connecting.'
        : signupFlow
          ? 'Your email is verified. Log in once and we’ll open your first card setup.'
          : 'Your email was verified, but this browser did not start a session. Log in to continue.',
      'success'
    );
    if (callbackLogin) {
      callbackLogin.href = explicitTeamInvite ? teamLoginUrl() : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  } catch (error) {
    const teamInvite = explicitTeamInvite || sessionStorage.getItem('liw_team_invite_pending') === '1';
    cleanAuthUrl();
    setCallbackMessage(error.message || 'We could not finish the verification redirect.', 'error');
    if (callbackLogin) {
      callbackLogin.href = teamInvite ? teamLoginUrl() : liwUrl('login.html');
      callbackLogin.hidden = false;
    }
  }
}

completeVerification();
