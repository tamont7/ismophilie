import entries from './data/ismes.json';

const $ = (selector) => document.querySelector(selector);
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const byId = new Map(entries.map(entry => [entry.id, entry]));
const byTerm = new Map(entries.map(entry => [normalize(entry.term), entry]));
const searchable = new Map(entries.map(entry => [entry.id, normalize([entry.term, entry.definition, ...entry.senses.map(sense => sense.text), entry.context, ...entry.antonyms, ...entry.neighbors, ...entry.related].join(' '))]));
let initial = '';
let selected = byId.get(location.hash.slice(1)) || byId.get('agnosticisme') || entries[0];
let visible = entries;
$('#total').textContent = entries.length;

function relatedTerms(terms) {
  return terms.map(term => {
    const linked = byTerm.get(normalize(term));
    return linked ? `<a class="chip" href="#${linked.id}">${escape(term)} <span aria-hidden="true">↗</span></a>` : `<span class="chip plain">${escape(term)}</span>`;
  }).join('');
}
function renderReader() {
  const entry = selected;
  const index = entries.indexOf(entry);
  const pages = entry.source.endPage > entry.source.page ? `${entry.source.page}–${entry.source.endPage}` : entry.source.page;
  $('#reader').innerHTML = `<div class="reader-top"><span class="eyebrow">Index / ${escape(entry.term[0].toUpperCase())}</span><span class="page">p. ${pages}</span></div>
    <div class="title-row"><h2>${escape(entry.source.heading.includes("/") ? entry.source.heading : entry.term)}</h2><button id="copy-link" class="icon-button" aria-label="Copier le lien de cette notion" title="Copier le lien">↗</button></div>
    ${entry.source.parent ? `<p class="source-parent">Sous-entrée de « ${escape(entry.source.parent)} »</p>` : ''}
    ${entry.source.heading.includes('/') ? '<p class="source-parent">Entrée commune dans l’ouvrage</p>' : ''}
    ${entry.etymology ? `<p class="etymology">${escape(entry.etymology)}</p>` : ''}
    <section class="info-section definitions"><h3>Définition${entry.senses.length > 1 ? 's' : ''}</h3><div class="section-content">${entry.senses.map(sense => `<div class="sense">${sense.label ? `<h4>${escape(sense.label)}</h4>` : ''}<p>${escape(sense.text)}</p></div>`).join('') || `<p class="redirect-note">L’ouvrage renvoie à : ${escape(entry.related.join(', '))}.</p>`}</div></section>
    <section class="info-section antonyms"><h3>Antonymes</h3><div class="section-content">${entry.antonyms.length ? `<div class="chips">${relatedTerms(entry.antonyms)}</div>` : '<p class="not-specified">Non indiqués dans l’ouvrage.</p>'}</div></section>
    ${entry.neighbors.length || entry.related.length ? `<section class="info-section relations"><h3>Voir aussi</h3><div class="section-content">${entry.neighbors.length ? `<div class="related-group"><span class="group-label">Termes voisins</span><div class="chips">${relatedTerms(entry.neighbors)}</div></div>` : ''}${entry.related.length ? `<div class="related-group">${entry.neighbors.length ? '<span class="group-label">Renvois</span>' : ''}<div class="chips">${relatedTerms(entry.related)}</div></div>` : ''}</div></section>` : ''}
    ${entry.context ? `<section class="info-section explanations"><h3>Explications</h3><div class="section-content context-copy">${entry.contextBlocks.map(block => block.type === 'heading' ? `<h4>${escape(block.text)}</h4>` : `<p>${escape(block.text)}</p>`).join('')}</div></section>` : ''}
    <div class="reader-bottom"><span>La philosophie de A à Z · p. ${pages}</span><a href="#${entries[(index + 1) % entries.length].id}">Notion suivante →</a></div>`;
  $('#copy-link').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      const url = new URL(location.href); url.hash = entry.id;
      await navigator.clipboard.writeText(url.href);
      button.textContent = '✓'; button.setAttribute('aria-label', 'Lien copié');
    } catch { button.textContent = 'Copiez l’URL'; location.hash = entry.id; }
  });
  document.title = `${entry.term} — Ismophilie`;
}
function renderList() {
  const query = normalize($('#search').value.trim());
  visible = entries.filter(entry => (!initial || normalize(entry.term).startsWith(initial)) && searchable.get(entry.id).includes(query));
  $('#count').textContent = `${visible.length} / ${entries.length}`;
  $('#entries').innerHTML = visible.length ? visible.map(entry => `<a class="entry-link ${entry.id === selected.id ? 'active' : ''}" href="#${entry.id}" ${entry.id === selected.id ? 'aria-current="true"' : ''}><span>${escape(entry.term)}</span><span aria-hidden="true">${entry.id === selected.id ? '↗' : '·'}</span></a>`).join('') : '<div class="empty"><strong>Aucune notion trouvée.</strong><p>Essayez un autre mot ou retirez les filtres.</p><button id="reset">Effacer les filtres</button></div>';
  $('#reset')?.addEventListener('click', resetFilters);
  $('#alphabet').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.letter === initial)));
}
function resetFilters() {
  initial = ''; $('#search').value = ''; renderList();
}
const letters = new Set(entries.map(entry => normalize(entry.term)[0]));
$('#alphabet').innerHTML = `<button data-letter="" aria-pressed="true">Tout</button>` + [...'abcdefghijklmnopqrstuvwxyz'].map(letter => `<button data-letter="${letter}" aria-pressed="false" ${letters.has(letter) ? '' : 'disabled'}>${letter.toUpperCase()}</button>`).join('');
$('#alphabet').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  initial = button.dataset.letter; renderList();
});
$('#search').addEventListener('input', renderList);
window.addEventListener('hashchange', () => {
  const entry = byId.get(location.hash.slice(1)); if (!entry) return;
  selected = entry;
  if (!visible.some(item => item.id === entry.id)) resetFilters();
  renderList(); renderReader();
  if (matchMedia('(max-width: 760px)').matches) $('#reader').scrollIntoView({behavior: 'smooth', block: 'start'});
  $('#reader').focus({preventScroll: true});
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); }
});
renderList(); renderReader();
