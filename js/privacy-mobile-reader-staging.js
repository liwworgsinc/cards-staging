(() => {
  'use strict';

  if (!window.matchMedia('(max-width: 850px)').matches) return;
  if (!document.body.classList.contains('legal-page')) return;
  if (!/^Privacy Policy\b/i.test(document.title)) return;

  const article = document.querySelector('.legal-document');
  const shell = document.querySelector('.legal-shell');
  if (!article || !shell || article.dataset.privacyReaderReady === 'true') return;

  article.dataset.privacyReaderReady = 'true';
  document.body.classList.add('liw-privacy-reader-ready');

  const headings = [...article.querySelectorAll(':scope > h2')];
  if (!headings.length) return;

  const tools = document.createElement('div');
  tools.className = 'privacy-reader-tools';
  tools.innerHTML = `
    <div>
      <label for="privacy-section-jump">Jump to a section</label>
      <select id="privacy-section-jump">
        <option value="">Choose a section</option>
      </select>
    </div>
    <div class="privacy-reader-actions">
      <button type="button" id="privacy-expand-all">Expand all</button>
      <button type="button" id="privacy-collapse-all">Collapse all</button>
    </div>`;

  const note = document.createElement('p');
  note.className = 'privacy-reader-note';
  note.innerHTML = '<strong>Privacy information made easier to browse.</strong> Tap any section to read it. Nothing from the policy has been removed.';

  const sectionsWrap = document.createElement('div');
  sectionsWrap.className = 'privacy-reader-sections';

  headings.forEach((heading, index) => {
    const details = document.createElement('details');
    details.className = 'privacy-reader-section';
    details.id = heading.id || `privacy-section-${index + 1}`;
    if (index === 0) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = heading.textContent.trim();

    const copy = document.createElement('div');
    copy.className = 'privacy-reader-copy';

    let node = heading.nextSibling;
    while (node) {
      const next = node.nextSibling;
      if (node.nodeType === 1 && node.tagName === 'H2') break;
      copy.appendChild(node);
      node = next;
    }

    heading.remove();
    details.append(summary, copy);
    sectionsWrap.appendChild(details);
  });

  article.replaceChildren(sectionsWrap);
  shell.insertBefore(note, article);
  shell.insertBefore(tools, note);

  const jump = tools.querySelector('#privacy-section-jump');
  const sections = [...sectionsWrap.querySelectorAll('.privacy-reader-section')];
  sections.forEach(section => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = section.querySelector('summary')?.textContent || section.id;
    jump.appendChild(option);
  });

  jump.addEventListener('change', () => {
    if (!jump.value) return;
    const section = document.getElementById(jump.value);
    if (!section) return;
    section.open = true;
    requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  tools.querySelector('#privacy-expand-all')?.addEventListener('click', () => {
    sections.forEach(section => { section.open = true; });
  });

  tools.querySelector('#privacy-collapse-all')?.addEventListener('click', () => {
    sections.forEach(section => { section.open = false; });
  });

  const backTop = document.createElement('button');
  backTop.type = 'button';
  backTop.className = 'privacy-back-top';
  backTop.setAttribute('aria-label', 'Back to top of Privacy Policy');
  backTop.innerHTML = '<span aria-hidden="true">↑</span><span>Back to top</span>';
  document.body.appendChild(backTop);

  let footerVisible = false;
  const updateBackTop = () => {
    backTop.classList.toggle('is-visible', window.scrollY > 700 && !footerVisible);
  };

  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updateBackTop, { passive: true });

  const footer = document.querySelector('.site-footer, footer');
  if ('IntersectionObserver' in window && footer) {
    new IntersectionObserver(entries => {
      footerVisible = entries.some(entry => entry.isIntersecting);
      updateBackTop();
    }, { threshold: 0.05 }).observe(footer);
  }

  updateBackTop();
})();
