(function () {
  'use strict';
  const { analyze, examples, questions } = QuoteAssistant;
  const el = id => document.getElementById(id);
  const resetResult = () => {
    el('analysis').hidden = true;
    el('placeholder').hidden = false;
    for (const id of ['categories', 'facts', 'missing', 'error', 'copy-status']) el(id).textContent = '';
    el('draft').value = '';
    el('message').removeAttribute('aria-invalid');
  };
  const addText = (parent, tag, text) => {
    const node = document.createElement(tag);
    node.textContent = text;
    parent.append(node);
  };
  examples.forEach(([title, text], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = `${index + 1}. ${title}`;
    button.addEventListener('click', () => {
      resetResult();
      el('message').value = text;
      el('message').focus();
    });
    el('examples').append(button);
  });
  el('intake').addEventListener('submit', event => {
    event.preventDefault();
    resetResult();
    try {
      const result = analyze(el('message').value);
      el('categories').textContent = result.categories.join(', ') || 'Onbekend — verduidelijking nodig';
      if (!Object.keys(result.details).length) addText(el('facts'), 'dd', 'Geen details herkend.');
      for (const [key, value] of Object.entries(result.details)) {
        addText(el('facts'), 'dt', key[0].toUpperCase() + key.slice(1));
        addText(el('facts'), 'dd', value);
      }
      for (const key of result.missing) addText(el('missing'), 'li', questions[key]);
      if (!result.missing.length) addText(el('missing'), 'li', 'Geen ontbrekende velden volgens de demoregels. Controleer de inhoud.');
      el('draft').value = result.draft;
      el('analysis').hidden = false;
      el('placeholder').hidden = true;
      el('result').focus();
    } catch (error) {
      el('error').textContent = error.message;
      el('message').setAttribute('aria-invalid', 'true');
      el('message').focus();
    }
  });
  el('clear').addEventListener('click', () => {
    el('message').value = '';
    resetResult();
    el('message').focus();
  });
  // Clear stale results when the input changes, so they cannot be mistaken for
  // an analysis of an edited message. No browser persistence is used.
  el('message').addEventListener('input', resetResult);
  const selectDraft = () => {
    const draft = el('draft');
    draft.focus();
    draft.select();
    draft.setSelectionRange(0, draft.value.length);
    el('copy-status').textContent = 'Tekst geselecteerd. Kies Kopieer in het systeemmenu of gebruik de kopieertoetsen.';
  };
  el('select').addEventListener('click', selectDraft);
  el('copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(el('draft').value);
      el('copy-status').textContent = 'Antwoord gekopieerd.';
    } catch (_) {
      selectDraft();
      el('copy-status').textContent = 'Automatisch kopiëren is niet beschikbaar. De tekst is geselecteerd; kies Kopieer in het systeemmenu.';
    }
  });
  el('analyze').disabled = false;
  el('clear').disabled = false;
})();
