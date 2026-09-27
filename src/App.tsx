import React, { useMemo, useState } from 'react';
import { NoteName } from './types/music';
import { getChordDefinition } from './theory/chordBuilder';
import { GuitarSoundEngine } from './audio/guitarSynth';
import { audioContextManager } from './audio/audioContext';

const KEYS: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];

const PROGRESSIONS = [
  { label: '1-5-6-4', degrees: [1, 5, 6, 4] },
  { label: '6-4-1-5', degrees: [6, 4, 1, 5] },
  { label: '1-4-5', degrees: [1, 4, 5] },
  { label: '1-6-4-5', degrees: [1, 6, 4, 5] },
  { label: '1-5-4', degrees: [1, 5, 4] },
  { label: '6-5-4-5', degrees: [6, 5, 4, 5] }
];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11
};
const INDEX_TO_NOTE: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function degreeToChord(key: NoteName, degree: number) {
  const rootIndex = (NOTE_TO_INDEX[key] + MAJOR_SCALE_OFFSETS[degree - 1]) % 12;
  const root = INDEX_TO_NOTE[rootIndex];
  return `${root}${DEGREE_QUALITIES[degree - 1]}`;
}

function degreeToDefinition(key: NoteName, degree: number) {
  const rootIndex = (NOTE_TO_INDEX[key] + MAJOR_SCALE_OFFSETS[degree - 1]) % 12;
  const root = INDEX_TO_NOTE[rootIndex];
  const quality = DEGREE_QUALITIES[degree - 1] === 'm' ? 'minor' : DEGREE_QUALITIES[degree - 1] === 'dim' ? 'dim' : 'major';
  return getChordDefinition(root, quality);
}

export const App: React.FC = () => {
  const [key, setKey] = useState<NoteName>('C');
  const [currentProgression, setCurrentProgression] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const diatonicChords = useMemo(
    () => Array.from({ length: 7 }, (_, i) => degreeToChord(key, i + 1)),
    [key]
  );

  const playChord = async (degree: number) => {
    await audioContextManager.unlock();
    setCurrentProgression([degree]);
    setCurrentIndex(0);
    setIsPlaying(true);

    const chord = degreeToDefinition(key, degree);
    GuitarSoundEngine.strum(chord.primaryVoicing.frets);

    window.setTimeout(() => {
      setCurrentIndex(-1);
      setIsPlaying(false);
    }, 900);
  };

  const playProgression = async (degrees: number[]) => {
    await audioContextManager.unlock();
    setCurrentProgression(degrees);
    setIsPlaying(true);

    const stepMs = 900;
    degrees.forEach((degree, index) => {
      window.setTimeout(() => {
        setCurrentIndex(index);
        const chord = degreeToDefinition(key, degree);
        GuitarSoundEngine.strum(chord.primaryVoicing.frets);
      }, index * stepMs);
    });

    window.setTimeout(() => {
      setCurrentIndex(-1);
      setIsPlaying(false);
    }, degrees.length * stepMs);
  };

  const currentLabels = currentProgression.map(degree => degreeToChord(key, degree));

  return (
    <div className="app">
      <main className="card">
        <header>
          <h1>CHORDS</h1>
          <p>코드 진행을 바로 기타로 들어보기</p>
        </header>

        <section>
          <h2>KEY</h2>
          <div className="key-grid">
            {KEYS.map(note => (
              <button
                key={note}
                className={key === note ? 'selected' : ''}
                onClick={() => {
                  setKey(note);
                  setCurrentProgression([]);
                  setCurrentIndex(-1);
                }}
              >
                {note}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>CHORD</h2>
          <div className="chord-grid">
            {diatonicChords.map((chord, index) => (
              <button
                key={chord}
                className={currentProgression.length === 1 && currentProgression[0] === index + 1 ? 'selected' : ''}
                onClick={() => playChord(index + 1)}
              >
                <span className="degree">{index + 1}</span>
                {chord}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>PROGRESSION</h2>
          <div className="progression-grid">
            {PROGRESSIONS.map(progression => (
              <button
                key={progression.label}
                onClick={() => playProgression(progression.degrees)}
              >
                {progression.label}
              </button>
            ))}
          </div>
        </section>

        <section className="current">
          <h2>CURRENT</h2>
          <div className="current-chords">
            {currentLabels.length
              ? currentLabels.map((chord, index) => (
                  <React.Fragment key={index}>
                    <span className={currentIndex === index ? 'playing' : ''}>{chord}</span>
                    {index < currentLabels.length - 1 && <b>−</b>}
                  </React.Fragment>
                ))
              : <span className="placeholder">진행을 선택하세요</span>}
          </div>
        </section>

        <button
          className="play"
          disabled={!currentProgression.length || isPlaying}
          onClick={() => playProgression(currentProgression)}
        >
          {isPlaying ? '● PLAYING' : '▶ PLAY'}
        </button>
      </main>
    </div>
  );
};

export default App;
