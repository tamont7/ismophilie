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
function renderReader(entry = selected, target = $('#reader')) {
  const index = entries.indexOf(entry);
  const pages = entry.source.endPage > entry.source.page ? `${entry.source.page}–${entry.source.endPage}` : entry.source.page;
  target.innerHTML = `<div class="reader-top"><span class="eyebrow">Index / ${escape(entry.term[0].toUpperCase())}</span><span class="page">p. ${pages}</span></div>
    <div class="title-row"><h2>${escape(entry.source.heading.includes("/") ? entry.source.heading : entry.term)}</h2><button data-copy-link class="icon-button" aria-label="Copier le lien de cette notion" title="Copier le lien">↗</button></div>
    ${entry.source.parent ? `<p class="source-parent">Sous-entrée de « ${escape(entry.source.parent)} »</p>` : ''}
    ${entry.source.heading.includes('/') ? '<p class="source-parent">Entrée commune dans l’ouvrage</p>' : ''}
    ${entry.etymology ? `<p class="etymology">${escape(entry.etymology)}</p>` : ''}
    <section class="info-section definitions"><h3>Définition${entry.senses.length > 1 ? 's' : ''}</h3><div class="section-content">${entry.senses.map(sense => `<div class="sense">${sense.label ? `<h4>${escape(sense.label)}</h4>` : ''}<p>${escape(sense.text)}</p></div>`).join('') || `<p class="redirect-note">L’ouvrage renvoie à : ${escape(entry.related.join(', '))}.</p>`}</div></section>
    <section class="info-section antonyms"><h3>Antonymes</h3><div class="section-content">${entry.antonyms.length ? `<div class="chips">${relatedTerms(entry.antonyms)}</div>` : '<p class="not-specified">Non indiqués dans l’ouvrage.</p>'}</div></section>
    ${entry.neighbors.length || entry.related.length ? `<section class="info-section relations"><h3>Voir aussi</h3><div class="section-content">${entry.neighbors.length ? `<div class="related-group"><span class="group-label">Termes voisins</span><div class="chips">${relatedTerms(entry.neighbors)}</div></div>` : ''}${entry.related.length ? `<div class="related-group">${entry.neighbors.length ? '<span class="group-label">Renvois</span>' : ''}<div class="chips">${relatedTerms(entry.related)}</div></div>` : ''}</div></section>` : ''}
    ${entry.context ? `<section class="info-section explanations"><h3>Explications</h3><div class="section-content context-copy">${entry.contextBlocks.map(block => block.type === 'heading' ? `<h4>${escape(block.text)}</h4>` : `<p>${escape(block.text)}</p>`).join('')}</div></section>` : ''}
    <div class="reader-bottom"><span>La philosophie de A à Z · p. ${pages}</span><a href="#${entries[(index + 1) % entries.length].id}">Notion suivante →</a></div>`;
  target.querySelector('[data-copy-link]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      const url = new URL(location.href); url.hash = entry.id;
      await navigator.clipboard.writeText(url.href);
      button.textContent = '✓'; button.setAttribute('aria-label', 'Lien copié');
    } catch { button.textContent = 'Copiez l’URL'; location.hash = entry.id; }
  });
  if (target === $('#reader')) document.title = `${entry.term} — Ismophilie`;
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
  showMode(false);
  if (!visible.some(item => item.id === entry.id)) resetFilters();
  renderList(); renderReader();
  if (matchMedia('(max-width: 760px)').matches) $('#reader').scrollIntoView({behavior: 'smooth', block: 'start'});
  $('#reader').focus({preventScroll: true});
});
document.addEventListener('keydown', event => {
  if (!$('.dictionary').hidden && event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); }
});
renderList(); renderReader();


let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Keep definitions that can stand alone, without revealing the answer.
const quizPool = entries.flatMap(entry => {
  if (entry.source.heading.includes('/')) return [];
  const senses = entry.senses.filter(sense => sense.text.length >= 45
    && !normalize(sense.text).includes(normalize(entry.term))
    && !/^(n\. |du |de |voir |renvoi)/i.test(sense.text));
  return senses.length ? [{ entry, senses }] : [];
});

function showMode(quiz) {
  $('.skip').href = quiz ? '#quiz-heading' : '#reader';
  $('.dictionary').hidden = quiz;
  $('#quiz').hidden = !quiz;
  $('#dictionary-mode').setAttribute('aria-pressed', String(!quiz));
  $('#quiz-mode').setAttribute('aria-pressed', String(quiz));
  document.title = quiz ? 'Retrouver le terme — Ismophilie' : `${selected.term} — Ismophilie`;
}

function focusQuiz() {
  const heading = $('#quiz-heading');
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'start' });
}

function startQuiz() {
  questions = shuffle(quizPool).slice(0, 5).map(({ entry, senses }) => {
    const sense = shuffle(senses)[0];
    const related = new Set([...entry.neighbors, ...entry.related, entry.term].map(normalize));
    const alternatives = entries.filter(other => other.id !== entry.id
      && other.source.heading !== entry.source.heading
      && !related.has(normalize(other.term))
      && !normalize(sense.text).includes(normalize(other.term))
      && ![...other.neighbors, ...other.related].some(term => normalize(term) === normalize(entry.term)));
    return { entry, sense, choices: shuffle([entry, ...shuffle(alternatives).slice(0, 3)]) };
  });
  questionIndex = 0;
  score = 0;
  showMode(true);
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  const { sense, choices } = questions[questionIndex];
  $('#quiz').innerHTML = `<div class="quiz-top"><span class="eyebrow">Question ${questionIndex + 1} / ${questions.length}</span><span class="eyebrow">Une définition, quatre termes</span></div>
    <h2 id="quiz-heading" tabindex="-1">Quel terme correspond à cette définition ?</h2>
    <div class="quiz-definition">${sense.label ? `<p class="group-label">${escape(sense.label)}</p>` : ''}<p>${escape(sense.text)}</p></div>
    <button id="quiz-show-choices" class="primary-button" aria-expanded="false" aria-controls="quiz-choices">Afficher les propositions</button>
    <div id="quiz-choices" class="quiz-choices" hidden>${choices.map(choice => `<button class="quiz-choice" data-answer="${escape(choice.id)}">${escape(choice.term)}</button>`).join('')}</div>
    <div id="quiz-feedback" role="status"></div>
    <div id="quiz-reveal" hidden><nav id="quiz-fiches" class="quiz-fiches" aria-label="Consulter les fiches des propositions"></nav><article id="quiz-reader" aria-label="Fiche de la réponse"></article><button id="quiz-next" class="primary-button">${questionIndex + 1 === questions.length ? 'Voir le résultat' : 'Question suivante →'}</button></div>`;
  $('#quiz-show-choices').addEventListener('click', event => {
    event.currentTarget.setAttribute('aria-expanded', 'true');
    event.currentTarget.hidden = true;
    $('#quiz-choices').hidden = false;
    $('#quiz-choices button').focus();
  });
  $('#quiz').querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answerQuestion(button.dataset.answer)));
  $('#quiz-next').addEventListener('click', () => {
    questionIndex++;
    if (questionIndex < questions.length) renderQuestion();
    else renderResult();
  });
  focusQuiz();
}

function answerQuestion(id) {
  if (answered) return;
  answered = true;
  const { entry } = questions[questionIndex];
  const correct = id === entry.id;
  if (correct) score++;
  $('#quiz').querySelectorAll('[data-answer]').forEach(button => {
    button.disabled = true;
    if (button.dataset.answer === entry.id) button.classList.add('correct');
    else if (button.dataset.answer === id) button.classList.add('incorrect');
  });
  $('#quiz-feedback').textContent = correct ? `Bonne réponse : ${entry.term}. Voici sa fiche.` : `La bonne réponse est « ${entry.term} ». Voici sa fiche.`;
  $('#quiz-reveal').hidden = false;
  renderReader(entry, $('#quiz-reader'));
  $('#quiz-fiches').innerHTML = `<p class="group-label">Consulter une fiche</p><div class="fiche-buttons">${questions[questionIndex].choices.map(choice => `<button data-fiche="${escape(choice.id)}" aria-pressed="${choice.id === entry.id}">${escape(choice.term)}${choice.id === entry.id ? ' · Bonne réponse' : ''}</button>`).join('')}</div>`;
  $('#quiz-fiches').querySelectorAll('[data-fiche]').forEach(button => button.addEventListener('click', () => {
    const fiche = byId.get(button.dataset.fiche);
    renderReader(fiche, $('#quiz-reader'));
    $('#quiz-reader').setAttribute('aria-label', `Fiche : ${fiche.term}`);
    $('#quiz-fiches').querySelectorAll('[data-fiche]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
}

function renderResult() {
  $('#quiz').innerHTML = `<span class="eyebrow">Série terminée</span><h2 id="quiz-heading" tabindex="-1">${score} / ${questions.length} bonnes réponses</h2><p class="quiz-summary">Une nouvelle série pour continuer à découvrir les notions ?</p><button id="quiz-restart" class="primary-button">Nouvelle série</button>`;
  $('#quiz-restart').addEventListener('click', startQuiz);
  focusQuiz();
}

$('#quiz-mode').addEventListener('click', startQuiz);
$('#dictionary-mode').addEventListener('click', () => showMode(false));
// A reference in the revealed fiche opens the dictionary, even for the current hash.
$('#quiz').addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const entry = byId.get(link.getAttribute('href').slice(1));
  if (!entry) return;
  selected = entry;
  showMode(false);
  if (!visible.some(item => item.id === entry.id)) resetFilters();
  renderList();
  renderReader();
  $('#reader').focus();
});
