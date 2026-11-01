// Run: node tests/analyzer.test.js
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { analyze, examples } = require('../analyzer.js');
for (const [name, message] of examples) test('example: ' + name, () => assert.ok(analyze(message).draft.includes('Beste klant')));
test('empty input rejected', () => assert.throws(() => analyze('')));
test('long input rejected', () => assert.throws(() => analyze('a'.repeat(10001))));
test('corrected budget is not misreported', () => assert.equal(analyze('Badkamer. Budget niet €1000 maar €3000.').details.budget, undefined));
test('corrected area is not misreported', () => assert.equal(analyze('Badkamer, geen 20 m2 maar 8 m2.').details.oppervlakte, undefined));
test('multiple room areas require clarification', () => assert.equal(analyze('Badkamer 8 m2 en keuken 20 m2.').details.oppervlakte, undefined));
test('ordinary budget is recognized', () => assert.equal(analyze('Badkamer. Budget: €1500.').details.budget, '€1500'));
test('ordinary area is recognized', () => assert.equal(analyze('Badkamer 8 m2.').details.oppervlakte, '8 m2'));
test('invalid date is not accepted', () => assert.ok(analyze('Badkamer. Wanneer: 31 februari 2027.').missing.includes('planning')));
test('unknown location requires clarification', () => assert.ok(analyze('Badkamer. Locatie: onbekend.').missing.includes('locatie')));
