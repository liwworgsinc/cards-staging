(function () {
  if (!/liwworgsinc\.github\.io$/i.test(location.hostname) || !location.pathname.includes('/cards-staging/')) return;

  const form = document.getElementById('lead-form');
  if (!form || !window.supabaseClient) return;

  const toastMessage = (message) => {
    if (typeof window.toast === 'function') {
      window.toast(message);
      return;
    }
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__liwLeadToastTimer);
    window.__liwLeadToastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"]');
    const original = button?.innerHTML || 'Send inquiry';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="button-spinner"></span> Sending…';
    }

    try {
      const data = new FormData(form);
      const website = String(data.get('website_check') || '').trim();
      if (website) {
        form.reset();
        toastMessage('Inquiry sent successfully');
        return;
      }

      const slug = new URLSearchParams(location.search).get('slug');
      if (!slug) throw new Error('Card not found.');

      const { data: card, error: cardError } = await window.supabaseClient.rpc('public_card_by_slug', { p_slug: slug });
      if (cardError || !card?.id) throw new Error('Unable to load this card.');

      const { data: result, error } = await window.supabaseClient.functions.invoke('submit-agency-lead', {
        body: {
          cardId: card.id,
          name: String(data.get('name') || '').trim(),
          email: String(data.get('email') || '').trim(),
          phone: String(data.get('phone') || '').trim(),
          message: String(data.get('message') || '').trim(),
          serviceInterest: String(data.get('service_interest') || '').trim(),
          website: '',
          source: 'card',
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      form.reset();
      if (typeof window.track === 'function') window.track('lead_submit');
      toastMessage('Inquiry sent successfully');
    } catch (error) {
      const message = String(error?.message || 'Unable to send. Please contact the business directly.');
      toastMessage(message.length > 120 ? 'Unable to send. Please contact the business directly.' : message);
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }, true);
})();