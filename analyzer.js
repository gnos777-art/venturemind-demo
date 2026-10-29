/* Pure browser-side intake rules. Classic script also works without a module server. */
(function (root) {
  'use strict';
  const examples = [
    ['Schilderwerk', 'Goedendag, ik wil de woonkamer laten schilderen, ongeveer 35 m². Locatie: Utrecht. Wanneer: volgende maand. Budget: €1500. De muren hebben scheuren.'],
    ['Badkamer', 'Wij willen onze badkamer renoveren en een nieuwe douche plaatsen. Locatie: Rotterdam. Oppervlakte: 8 m2. Wanneer: in januari.'],
    ['Vloer', 'Kunnen jullie laminaat leggen in twee slaapkamers? Oppervlakte: 42 m². Locatie: Den Haag. Budget: €2500.'],
    ['Keuken', 'Ik zoek iemand om een keuken te monteren. Locatie: Amsterdam. Wanneer: zo snel mogelijk. De oude keuken moet nog weg.'],
    ['Onvolledig', 'Hallo, kunnen jullie ons helpen met een verbouwing? Graag een offerte.']
  ];
  const questions = {
    werkzaamheden: 'Welke werkzaamheden wilt u precies laten uitvoeren?',
    locatie: 'In welke plaats en op welke postcode moeten de werkzaamheden plaatsvinden?',
    oppervlakte: 'Wat zijn de afmetingen of de geschatte oppervlakte van de ruimte?',
    planning: 'Wanneer wilt u de werkzaamheden laten uitvoeren?',
    budget: 'Heeft u een indicatie van het beschikbare budget?',
    situatie: 'Kunt u de huidige staat beschrijven en eventueel foto’s delen?'
  };
  // JS \b is ASCII-only. Unicode boundaries preserve the Polish keyword variants.
  const word = source => new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${source})(?=$|[^\\p{L}\\p{N}_])`, 'iu');
  const rules = {
    schilderwerk: word('schilder[\\p{L}]*|verven|painting|malowan[\\p{L}]*'),
    badkamerrenovatie: word('badkamer[\\p{L}]*|douche[\\p{L}]*|bathroom|łazien[\\p{L}]*'),
    vloerwerk: word('vloer[\\p{L}]*|laminaat|parket|floor[\\p{L}]*|podłog[\\p{L}]*'),
    keukenmontage: word('keuken[\\p{L}]*|kitchen|kuchni[\\p{L}]*'),
    tegelwerk: word('tegel[\\p{L}]*|tiling|płyt[\\p{L}]*'),
    stucwerk: word('stuc[\\p{L}]*|pleister[\\p{L}]*|plaster[\\p{L}]*|tynk[\\p{L}]*')
  };
  const negative = /\b(?:geen|niet|zonder|no|not|without|nie|bez|neither|nor|noch)\b|\bdon['’]t\b/i;
  const unknown = /\b(?:onbekend|weet|nader|nvt|unknown|tbd|misschien|of)\b|n\.v\.t|\?/i;
  const months = 'januari februari maart april mei juni juli augustus september oktober november december'.split(' ');
  const month = `(?:${months.join('|')})`;
  const time = new RegExp([
    '\\b(?:vandaag|morgen|overmorgen|zo snel mogelijk|zsm|asap)\\b',
    '\\b(?:volgende|komende|deze)\\s+(?:week|maand|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\\b',
    '\\bover\\s+(?:\\d+|een|twee|drie)\\s+(?:dagen|weken|maanden)\\b',
    `\\b(?:in|vanaf|voor|na)\\s+${month}(?:\\s+\\d{4})?\\b`,
    `\\b(?:(?:op|vanaf|voor|na)\\s+)?\\d{1,2}\\s+${month}(?:\\s+\\d{4})?\\b`,
    '\\b\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}\\b'
  ].join('|'), 'gi');
  const cityWord = "[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:[-’'][A-Za-zÀ-ÿ]+)*";
  const city = `(?:'s-[A-Z][a-z]+|${cityWord}(?:\\s+(?:(?:op|aan|den|de|der)\\s+)*${cityWord}){0,2})`;
  const labels = 'locatie|plaats|adres|location|lokalizacja|wanneer|planning|startdatum|termin|budget|oppervlakte';

  function workCategories(message) {
    const states = Object.fromEntries(Object.keys(rules).map(name => [name, new Set()]));
    const normalized = message.replace(/\bniet alleen\b|\bnot only\b/gi, '');
    for (const clause of normalized.split(/[.!?;\n]+|\b(?:maar|wel|alleen|but|however|ale)\b/i)) {
      const state = /\b(?:misschien|mogelijk|of|maybe|perhaps|albo)\b/i.test(clause)
        ? 'uncertain' : negative.test(clause) ? 'negative' : 'positive';
      for (const [name, pattern] of Object.entries(rules)) {
        if (pattern.test(clause)) states[name].add(state);
      }
    }
    return {
      categories: Object.keys(states).filter(name => states[name].size === 1 && states[name].has('positive')),
      uncertain: Object.values(states).some(values => values.has('uncertain') || values.size > 1)
    };
  }

  function validDate(value) {
    const numeric = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
    const named = value.match(new RegExp(`\\b(\\d{1,2})\\s+(${month})(?:\\s+(\\d{4}))?\\b`, 'i'));
    if (!numeric && !named) return true;
    const day = Number((numeric || named)[1]);
    const m = numeric ? Number(numeric[2]) : months.indexOf(named[2].toLowerCase()) + 1;
    const year = Number(numeric ? numeric[3] : named[3] || 2000);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && m >= 1 && m <= 12 && day >= 1 && day <= days[m - 1];
  }

  function intakeField(message, field) {
    const names = field === 'locatie' ? 'locatie|plaats|adres|location|lokalizacja' : 'wanneer|planning|startdatum|termin';
    const marked = new RegExp(`\\b(?:${names})\\s*:\\s*(.*?)(?=\\s*\\b(?:${labels})\\s*:|[\\n.!?;]|$)`, 'gi');
    let values = Array.from(message.matchAll(marked), match => match[1].trim().replace(/^[ ,]+|[ ,]+$/g, ''));
    if (values.length) {
      if (values.some(value => !value || negative.test(value) || unknown.test(value))) return null;
    } else {
      const pattern = field === 'locatie' ? new RegExp(`\\b(?:[Ii][Nn]|[Tt][Ee]|[Uu][Ii][Tt])\\s+(${city})\\b`, 'g') : time;
      for (const match of message.matchAll(pattern)) {
        // Deliberately conservative: uncertainty/negation scopes over a sentence.
        const before = message.slice(0, match.index).split(/[.!?;\n]/).pop();
        const after = message.slice(match.index).split(/[.!?;\n]/)[0];
        if (negative.test(before + after) || unknown.test(before + after)) return null;
        values.push(field === 'locatie' ? match[1] : match[0]);
      }
    }
    if (field === 'planning' && values.some(value => !validDate(value))) return null;
    const unique = new Map(values.map(value => [value.toLowerCase(), value]));
    return unique.size === 1 ? unique.values().next().value : null;
  }

  function analyze(message) {
    if (typeof message !== 'string' || !message.trim()) throw new Error('Vul een klantbericht in.');
    if (message.length > 10000) throw new Error('Het bericht mag maximaal 10.000 tekens bevatten.');
    const { categories, uncertain } = workCategories(message);
    const details = {};
    const patterns = {
      oppervlakte: /\b\d+(?:[.,]\d+)?\s*(?:m²|m2|vierkante meter)(?![\p{L}\p{N}_])/iu,
      budget: /€\s*\d(?:[\d.,]*\d)?|\d(?:[\d.,]*\d)?\s*(?:euro|EUR)\b/i,
      situatie: /[^\n.!?;]*\b(?:scheuren|beschadigd|vocht|oude|nieuwbouw|lekkage)\b[^\n.!?;]*/i
    };
    for (const [field, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) details[field] = match[0].trim();
    }
    for (const field of ['locatie', 'planning']) {
      const value = intakeField(message, field);
      if (value) details[field] = value;
    }
    const missing = categories.length && !uncertain ? [] : ['werkzaamheden'];
    missing.push(...Object.keys(questions).filter(key => key !== 'werkzaamheden' && !Object.hasOwn(details, key)));
    const lines = ['Beste klant,', '', 'Bedankt voor uw bericht en uw interesse.'];
    if (categories.length) lines.push('Wij begrijpen dat uw aanvraag betrekking heeft op: ' + categories.join(', ') + '.');
    if (Object.keys(details).length) {
      lines.push('', 'Uit uw bericht hebben wij de volgende informatie genoteerd:');
      lines.push(...Object.entries(details).map(([key, value]) => `- ${key[0].toUpperCase() + key.slice(1)}: ${value}`));
      lines.push('Klopt dit zo?');
    }
    if (missing.length) {
      lines.push('', 'Om uw aanvraag verder te beoordelen, ontvangen wij graag nog de volgende informatie:');
      lines.push(...missing.map(key => '- ' + questions[key]));
    }
    lines.push('', 'Na controle van de gegevens kunnen wij bespreken of een opname op locatie nodig is. Dit bericht is nog geen offerte; prijs en beschikbaarheid zijn niet bevestigd.', '', 'Met vriendelijke groet,', '[Bedrijfsnaam]');
    return { categories, details, missing, draft: lines.join('\n') };
  }
  const api = { analyze, examples, questions };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuoteAssistant = api;
})(globalThis);
