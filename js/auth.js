const form = document.querySelector('form[data-auth]');
const message = document.getElementById('message');
const LEGAL_VERSION = '2026-08-06';
const AFFILIATE_AGREEMENT_VERSION = '2026-08-06';
const AUTH_CALLBACK_URL = liwUrl('auth-callback.html');

const authQuery = new URLSearchParams(location.search);
const queryInviteEmail = String(authQuery.get('email') || '').trim().toLowerCase();
const storedInviteEmail = String(sessionStorage.getItem('liw_team_invite_email') || '').trim().toLowerCase();
const invitedEmail = queryInviteEmail || storedInviteEmail;
const isTeamInvite =
  authQuery.get('team_invite') === '1' ||
  authQuery.get('team_invite') === 'accepted' ||
  sessionStorage.getItem('liw_team_invite_pending') === '1';
const emailField = form?.querySelector('input[name="email"]');
const affiliateCode = window.LIWReferral?.getCode?.() || '';
window.LIWReferral?.preserveLinks?.();

function show(msg, type = 'error') {
  if (!message) return;
  message.className = `alert ${type}`;
  message.textContent = msg;
}

function teamAuthUrl(page) {
  const url = new URL(liwUrl(page));
  url.searchParams.set('team_invite', '1');
  if (invitedEmail) url.searchParams.set('email', invitedEmail);
  return url.href;
}

function preserveTeamInviteLinks() {
  if (!isTeamInvite) return;
  document.querySelectorAll('a[href="login.html"]').forEach(link => { link.href = teamAuthUrl('login.html'); });
  document.querySelectorAll('a[href="register.html"]').forEach(link => { link.href = teamAuthUrl('register.html'); });
  document.querySelectorAll('a[href="forgot-password.html"]').forEach(link => { link.href = teamAuthUrl('forgot-password.html'); });
}

if (queryInviteEmail) sessionStorage.setItem('liw_team_invite_email', queryInviteEmail);
if (isTeamInvite) sessionStorage.setItem('liw_team_invite_pending', '1');
if (invitedEmail && emailField) emailField.value = invitedEmail;
preserveTeamInviteLinks();

if (isTeamInvite) {
  show(invitedEmail
    ? `You were invited to a LIW Digital Cards workspace. Continue with ${invitedEmail}.`
    : 'You were invited to a LIW Digital Cards workspace. Register or log in with the invited email.', 'success');
}

function setBusy(busy) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.dataset.original = button.dataset.original || button.innerHTML;
  button.innerHTML = busy ? '<span>Working…</span>' : button.dataset.original;
}

async function finishTeamInvite(user) {
  if (!isTeamInvite) return false;

  const signedInEmail = String(user?.email || '').trim().toLowerCase();
  if (invitedEmail && signedInEmail && signedInEmail !== invitedEmail) {
    await supabaseClient.auth.signOut();
    throw new Error(`This invitation belongs to ${invitedEmail}. Sign in with that email address.`);
  }

  const { error } = await supabaseClient.rpc('accept_workspace_invites');
  if (error) throw new Error(`You signed in, but the team invitation could not be connected: ${error.message}`);

  sessionStorage.removeItem('liw_team_invite_pending');
  sessionStorage.removeItem('liw_team_invite_email');
  return true;
}

document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
    button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
  });
});

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    setBusy(true);

    const mode = form.dataset.auth;
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    try {
      if (mode === 'register') {
        const fullName = String(formData.get('full_name') || '').trim();
        const legalAccepted = formData.get('legal_acceptance') === 'on';

        if (!legalAccepted) {
          throw new Error('Please agree to the Terms, Privacy Policy, and Affiliate Program Agreement.');
        }
        if (isTeamInvite && invitedEmail && email.toLowerCase() !== invitedEmail) {
          throw new Error(`Create the account using the invited email: ${invitedEmail}`);
        }

        const acceptedAt = new Date().toISOString();
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              terms_accepted_at: acceptedAt,
              privacy_accepted_at: acceptedAt,
              affiliate_terms_accepted_at: acceptedAt,
              affiliate_agreement_version: AFFILIATE_AGREEMENT_VERSION,
              legal_version: LEGAL_VERSION,
              liw_team_invite: isTeamInvite || undefined,
              affiliate_code: affiliateCode || undefined,
              affiliate_first_seen_at: affiliateCode ? new Date().toISOString() : undefined
            },
            // Use one exact callback URL. Team status is carried in metadata/session storage.
            emailRedirectTo: AUTH_CALLBACK_URL
          }
        });

        if (error) throw error;

        if (data.session) {
          await window.LIWReferral?.syncUser?.(data.user).catch(() => null);
          const connected = await finishTeamInvite(data.user);
          show(connected ? 'Account created and team invitation accepted. Opening the shared workspace…' : 'Account created. Let’s build your first LIW Card…', 'success');
          setTimeout(() => location.replace(liwUrl(connected ? 'dashboard.html?team=connected' : 'editor.html?welcome=1')), 450);
          return;
        }

        show(isTeamInvite
          ? 'Account created. Check your email to verify the account; the link will connect you to the shared workspace.'
          : 'Account created. Check your email to verify your account.', 'success');
      } else if (mode === 'login') {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await window.LIWReferral?.syncUser?.(data.user).catch(() => null);
        const connected = await finishTeamInvite(data.user);
        const next = sessionStorage.getItem('liw_cards_after_login');
        sessionStorage.removeItem('liw_cards_after_login');

        if (connected) {
          location.replace(liwUrl('dashboard.html?team=connected'));
        } else {
          if (next === 'pricing') location.replace(liwUrl('pricing.html'));
          else if (next === 'editor') location.replace(liwUrl('editor.html?welcome=1'));
          else location.replace(liwUrl('dashboard.html'));
        }
      } else if (mode === 'forgot') {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: liwUrl('reset-password.html')
        });
        if (error) throw error;
        show('Password reset email sent. Check your inbox.', 'success');
      }
    } catch (error) {
      show(error.message || 'Unable to complete this request.');
    } finally {
      setBusy(false);
    }
  });
}

if (window.lucide) lucide.createIcons();
