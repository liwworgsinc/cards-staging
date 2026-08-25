const form = document.querySelector('form[data-auth]');
const message = document.getElementById('message');
const LEGAL_VERSION = '2026-08-06';
const AFFILIATE_AGREEMENT_VERSION = '2026-08-06';
const AUTH_CALLBACK_URL = liwUrl('auth-callback.html');
const GUEST_DRAFT_KEY = 'liw_guest_card_draft_v1';

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
const queryNext = String(authQuery.get('next') || '').trim().toLowerCase();
const storedNext = String(sessionStorage.getItem('liw_cards_after_login') || '').trim().toLowerCase();
const requestedNext = ['pricing', 'editor', 'guest-editor'].includes(queryNext)
  ? queryNext
  : ['pricing', 'editor', 'guest-editor'].includes(storedNext)
    ? storedNext
    : '';
window.LIWReferral?.preserveLinks?.();

function show(msg, type = 'error') {
  if (!message) return;
  message.className = `alert ${type}`;
  message.textContent = msg;
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

function hasGuestSignupPending() {
  try {
    return sessionStorage.getItem('liw_guest_signup_pending') === '1';
  } catch (_) {
    return false;
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

function preserveFunnelLinks() {
  if (isTeamInvite) return;
  document.querySelectorAll('a[href="register.html"]').forEach(link => {
    if (hasGuestDraft() || hasGuestSignupPending()) {
      link.href = liwUrl('register.html?guest=1');
    } else if (requestedNext === 'pricing') {
      link.href = liwUrl('register.html?next=pricing');
    } else if (form?.dataset.auth === 'login') {
      link.href = liwUrl('guest-builder.html?from=login');
    }
  });
}

if (queryInviteEmail) sessionStorage.setItem('liw_team_invite_email', queryInviteEmail);
if (isTeamInvite) sessionStorage.setItem('liw_team_invite_pending', '1');
if (requestedNext === 'pricing' && !isTeamInvite && !hasGuestDraft() && !hasGuestSignupPending()) {
  sessionStorage.setItem('liw_cards_after_login', 'pricing');
}
if (invitedEmail && emailField) emailField.value = invitedEmail;
preserveTeamInviteLinks();
preserveFunnelLinks();

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
        const guestSignup = authQuery.get('guest') === '1' || hasGuestDraft() || hasGuestSignupPending();

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
              liw_guest_card_pending: guestSignup || undefined,
              affiliate_code: affiliateCode || undefined,
              affiliate_first_seen_at: affiliateCode ? new Date().toISOString() : undefined
            },
            // Use one exact callback URL. Team/guest/plan status is carried in metadata/session/browser storage.
            emailRedirectTo: AUTH_CALLBACK_URL
          }
        });

        if (error) throw error;

        if (data.session) {
          await window.LIWReferral?.syncUser?.(data.user).catch(() => null);
          const connected = await finishTeamInvite(data.user);
          const guestClaimed = !connected && claimGuestDraftForUser(data.user);
          show(
            connected
              ? 'Account created and team invitation accepted. Opening the shared workspace…'
              : guestClaimed
                ? 'Account created. Your card is ready — opening it now…'
                : requestedNext === 'pricing'
                  ? 'Account created. Returning to the plan you were viewing…'
                  : 'Account created. Let’s build your first LIW Card…',
            'success'
          );
          const destination = connected
            ? liwUrl('dashboard.html?team=connected')
            : guestClaimed
              ? liwUrl('editor.html?welcome=1&guest_claim=1')
              : requestedNext === 'pricing'
                ? pricingResumeUrl()
                : liwUrl('editor.html?welcome=1');
          setTimeout(() => location.replace(destination), 450);
          return;
        }

        if (guestSignup) {
          sessionStorage.setItem('liw_guest_signup_pending', '1');
        } else if (requestedNext === 'pricing') {
          sessionStorage.setItem('liw_cards_after_login', 'pricing');
        }
        show(isTeamInvite
          ? 'Account created. Check your email to verify the account; the link will connect you to the shared workspace.'
          : guestSignup
            ? 'Account created. Check your email to verify it — your card draft is saved in this browser.'
            : requestedNext === 'pricing'
              ? 'Account created. Check your email to verify it — then we’ll return you to Pricing.'
              : 'Account created. Check your email to verify your account.', 'success');
      } else if (mode === 'login') {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await window.LIWReferral?.syncUser?.(data.user).catch(() => null);
        const connected = await finishTeamInvite(data.user);
        const guestClaimed = !connected && claimGuestDraftForUser(data.user);
        const next = requestedNext || String(sessionStorage.getItem('liw_cards_after_login') || '').trim().toLowerCase();
        sessionStorage.removeItem('liw_cards_after_login');

        if (connected) {
          location.replace(liwUrl('dashboard.html?team=connected'));
        } else if (guestClaimed || next === 'guest-editor') {
          location.replace(liwUrl('editor.html?welcome=1&guest_claim=1'));
        } else {
          if (next === 'pricing') location.replace(pricingResumeUrl());
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