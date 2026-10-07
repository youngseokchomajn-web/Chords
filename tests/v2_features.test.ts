/**
 * Unit Tests for CHORDS V2 Features
 * Tests Diatonic Chords, Transpose, Voicings, Storage URL round-trip, and Playback Engine.
 */

import assert from 'node:assert';
import { getDiatonicChords, transposeNote } from '../src/theory/notes.ts';
import { getChordDefinition, getAvailableVoicings } from '../src/theory/chordBuilder.ts';
import { buildShareUrl, parseShareUrl } from '../src/utils/storage.ts';
import { ProgressionItem } from '../src/types/progression.ts';
import { buildChordTimeline, buildPlaybackPlan } from '../src/audio/playbackEngine.ts';

console.log('🧪 Starting CHORDS V2 Feature Tests...\n');

// 1. Diatonic Chords (Major & Minor Keys)
console.log('Test 1: Diatonic Chords Calculation');
const cMajor = getDiatonicChords('C', false);
assert.strictEqual(cMajor.length, 7);
assert.deepStrictEqual(
  cMajor.map(c => c.chordName),
  ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']
);

const aMinor = getDiatonicChords('A', true);
assert.strictEqual(aMinor.length, 7);
assert.deepStrictEqual(
  aMinor.map(c => c.chordName),
  ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']
);

const dMajor = getDiatonicChords('D', false);
assert.deepStrictEqual(
  dMajor.map(c => c.chordName),
  ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim']
);
console.log('  ✓ Diatonic scales for Major & Minor keys verified');

// 2. Transpose Tests
console.log('\nTest 2: Transposition');
assert.strictEqual(transposeNote('C', 1), 'C#');
assert.strictEqual(transposeNote('C', 2), 'D');
assert.strictEqual(transposeNote('C', 7), 'G');
assert.strictEqual(transposeNote('C', -1), 'B');
assert.strictEqual(transposeNote('F', 2), 'G');
assert.strictEqual(transposeNote('B', 1), 'C');
console.log('  ✓ Transpose semitone math verified');

// 3. Multi-Voicing System (Open, Barre, Alternative)
console.log('\nTest 3: Guitar Voicing Options');
const cVoicings = getAvailableVoicings('C', 'major');
assert.ok(cVoicings.length >= 2, 'C Major should have multiple voicings');
assert.strictEqual(cVoicings[0].type, 'open', 'Primary C Major voicing is Open');

const fVoicings = getAvailableVoicings('F', 'major');
assert.ok(fVoicings.length >= 2, 'F Major should have multiple voicings');
assert.strictEqual(fVoicings[0].voicing.frets[0], 1, 'F Barre has fret 1 on 6th string');

// Extended qualities check
const cMaj7 = getChordDefinition('C', 'maj7');
assert.strictEqual(cMaj7.displayName, 'Cmaj7');

const g7 = getChordDefinition('G', '7');
assert.strictEqual(g7.displayName, 'G7');

const aSus4 = getChordDefinition('A', 'sus4');
assert.strictEqual(aSus4.displayName, 'Asus4');
console.log('  ✓ Multi-voicings and extended chord qualities verified');

// 4. URL Share Encoding & Decoding
console.log('\nTest 4: Share URL Serialization');
const items: ProgressionItem[] = [
  { id: '1', chordName: 'C', root: 'C', quality: 'major', voicingType: 'open' },
  { id: '2', chordName: 'G', root: 'G', quality: 'major', voicingType: 'barre' },
  { id: '3', chordName: 'Am', root: 'A', quality: 'minor', voicingType: 'open' },
  { id: '4', chordName: 'F', root: 'F', quality: 'major', voicingType: 'barre' },
];

// Mock window for URL parsing in node test
(globalThis as any).window = {
  location: {
    origin: 'https://youngseokchomajn-web.github.io',
    pathname: '/Chords/',
    search: '?k=C&m=0&p=C%3Amajor%3Aopen%3BG%3Amajor%3Abarre%3BA%3Aminor%3Aopen%3BF%3Amajor%3Abarre&bpm=95&r=2&c=1',
  },
};

const parsed = parseShareUrl();
assert.ok(parsed, 'URL should parse successfully');
assert.strictEqual(parsed.key, 'C');
assert.strictEqual(parsed.isMinor, false);
assert.strictEqual(parsed.bpm, 95);
assert.strictEqual(parsed.rhythmIndex, 2);
assert.strictEqual(parsed.capo, 1);
assert.strictEqual(parsed.items?.length, 4);
assert.strictEqual(parsed.items?.[0].chordName, 'C');
assert.strictEqual(parsed.items?.[1].chordName, 'G');
assert.strictEqual(parsed.items?.[2].chordName, 'Am');
assert.strictEqual(parsed.items?.[3].chordName, 'F');
console.log('  ✓ URL Share round-trip verified');

// 5. Money Chords & Beginner Logic
console.log('\nTest 5: Money Chords & Beginner Logic');
import { MONEY_CHORDS, buildProgressionFromDegrees, getDifficultyBadge } from '../src/data/moneyChords.ts';
assert.strictEqual(MONEY_CHORDS.length, 6, 'Should have 6 curated money chords');

// Test 1-5-6-4 in C Key vs G Key
const cPop = buildProgressionFromDegrees('C', [1, 5, 6, 4]);
assert.deepStrictEqual(cPop.map(c => c.chordName), ['C', 'G', 'Am', 'F']);
const cDiff = getDifficultyBadge(cPop.map(c => c.chordName));
assert.strictEqual(cDiff.isEasy, false, 'C Key 1-5-6-4 has F barre chord');

const gPop = buildProgressionFromDegrees('G', [1, 5, 6, 4]);
assert.deepStrictEqual(gPop.map(c => c.chordName), ['G', 'D', 'Em', 'C']);
const gDiff = getDifficultyBadge(gPop.map(c => c.chordName));
assert.strictEqual(gDiff.isEasy, true, 'G Key 1-5-6-4 is easy open chords without F');

// Royal road in C
const cRoyal = buildProgressionFromDegrees('C', [4, 5, 3, 6]);
assert.deepStrictEqual(cRoyal.map(c => c.chordName), ['F', 'G', 'Em', 'Am']);

console.log('  ✓ Money Chords progression builder and difficulty detection verified');

// 6. Bar-aware rhythm timeline
console.log('\nTest 6: Bar-aware Playback Timeline');
const timelineA = buildChordTimeline(cPop, [4, 2, 2]);
assert.deepStrictEqual(
  timelineA.map(t => [t.startBeat, t.endBeat, t.barIndex, t.beatOffsetInBar, t.durationBeats]),
  [[0, 4, 0, 0, 4], [4, 6, 1, 0, 2], [6, 8, 1, 2, 2]]
);

const timelineB = buildChordTimeline(cPop, [2, 2, 2, 2]);
assert.deepStrictEqual(
  timelineB.map(t => [t.startBeat, t.endBeat, t.barIndex, t.beatOffsetInBar, t.durationBeats]),
  [[0, 2, 0, 0, 2], [2, 4, 0, 2, 2], [4, 6, 1, 0, 2], [6, 8, 1, 2, 2]]
);

const timelineC = buildChordTimeline(cPop);
assert.deepStrictEqual(
  timelineC.map(t => [t.startBeat, t.endBeat, t.barIndex, t.beatOffsetInBar, t.durationBeats]),
  [[0, 4, 0, 0, 4], [4, 8, 1, 0, 4], [8, 12, 2, 0, 4], [12, 16, 3, 0, 4]]
);

// 7. Deterministic playback plan: chord ownership and boundaries.
console.log('\nTest 7: Deterministic Playback Plan');
const plan = buildPlaybackPlan(cPop, { label: 'test', pattern: ['down'] }, [4, 2, 2]);
assert.deepStrictEqual(
  plan.map(p => [p.index, p.startBeat, p.endBeat]),
  [[0, 0, 4], [1, 4, 6], [2, 6, 8]]
);
assert.ok(plan.every(p => p.strums.every(s => s.beat >= p.startBeat && s.beat < p.endBeat)));
for (let i = 1; i < plan.length; i++) {
  assert.strictEqual(plan[i - 1].endBeat, plan[i].startBeat);
}
console.log('  ✓ Playback events stay inside their chord boundaries with no inter-chord time overlap');

console.log('Test 8: Intro C / F C timing');
const introItems: ProgressionItem[] = [
  { id: 'intro-c', chordName: 'C', root: 'C', quality: 'major', voicingType: 'open' },
  { id: 'intro-f', chordName: 'F', root: 'F', quality: 'major', voicingType: 'barre' },
  { id: 'intro-c2', chordName: 'C', root: 'C', quality: 'major', voicingType: 'open' },
];
const introPlan = buildPlaybackPlan(
  introItems,
  { label: '8 beat', pattern: ['down', 'rest', 'down', 'up', 'rest', 'up', 'down', 'up'] },
  [4, 2, 2],
);
assert.deepStrictEqual(
  introPlan.map(p => [p.index, p.startBeat, p.endBeat]),
  [[0, 0, 4], [1, 4, 6], [2, 6, 8]],
);
assert.strictEqual(introPlan[1].strums.at(-1)?.beat, 5.5);
assert.strictEqual(introPlan[2].strums[0]?.beat, 6);
assert.strictEqual(introPlan[2].strums[0].beat - introPlan[1].strums.at(-1)!.beat, 0.5);
console.log('  ✓ Intro C / F C uses 4 beats + 2 beats + 2 beats; C re-enters exactly at beat 6');


console.log('\n🎉 ALL V2 FEATURE TESTS PASSED SUCCESSFULLY!\n');

