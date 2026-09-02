/* Staging analytics: make ranked cards easier to identify when an account owns many cards. */
(function enhanceAnalyticsCardIdentities(){
  if (typeof renderCardPerformance !== 'function') return;

  const baseRenderCardPerformance = renderCardPerformance;

  renderCardPerformance = function renderCardPerformanceWithIdentity(){
    baseRenderCardPerformance();

    const rankedRows = analyticsCards.map(card => {
      const views = analyticsViews.filter(view => view.card_id === card.id).length;
      const actions = analyticsEvents.filter(event => event.card_id === card.id).length;
      return { card, views, actions };
    }).sort((a, b) => b.views - a.views || b.actions - a.actions);

    const visibleRows = analyticsMobileQuery.matches && !analyticsCardsExpanded
      ? rankedRows.slice(0, 3)
      : rankedRows;

    document.querySelectorAll('#card-performance .performance-row').forEach((element, index) => {
      const card = visibleRows[index]?.card;
      if (!card) return;

      const companyName = String(card.company_name || '').trim();
      const personName = String(card.full_name || '').trim();
      const status = String(card.status || '').trim();
      const secondary = element.querySelector('.performance-card-copy small');
      if (!secondary) return;

      const hasDistinctPerson = companyName && personName && companyName.toLowerCase() !== personName.toLowerCase();
      secondary.textContent = hasDistinctPerson
        ? `${personName}${status ? ` · ${status}` : ''}`
        : status;
    });
  };

  const refresh = () => {
    if (document.getElementById('card-performance')) renderCardPerformance();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(refresh, 0), { once: true });
  } else {
    setTimeout(refresh, 0);
  }
})();
