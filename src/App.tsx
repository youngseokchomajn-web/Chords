import React, { useMemo, useState, useRef, useEffect } from 'react';
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

const RHYTHMS = [
  { label: '4 BEAT', pattern: ['down', 'down', 'down', 'down'] as const },
  { label: '8 BEAT', pattern: ['down', 'rest', 'down', 'up', 'rest', 'up', 'down', 'up'] as const },
  { label: '8 BEAT 2', pattern: ['down', 'rest', 'down', 'up', 'down', 'rest', 'up', 'up'] as const }
];

const NOTE_TO_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const INDEX_TO_NOTE: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function degreeToChord(key: NoteName, degree: number) {
  const rootIndex = (NOTE_TO_INDEX[key] + MAJOR_SCALE_OFFSETS[degree - 1]) % 12;
  return `${INDEX_TO_NOTE[rootIndex]}${DEGREE_QUALITIES[degree - 1]}`;
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
  const [rhythmIndex, setRhythmIndex] = useState(1);
  const [bpm, setBpm] = useState(90);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(id => window.clearTimeout(id));
    timersRef.current = [];
  };

  const addTimer = (callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      callback();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      GuitarSoundEngine.stopAll();
    };
  }, []);

  const diatonicChords = useMemo(() => Array.from({ length: 7 }, (_, i) => degreeToChord(key, i + 1)), [key]);
  const rhythm = RHYTHMS[rhythmIndex];

  const handleTestAudio = async () => {
    clearAllTimers();
    GuitarSoundEngine.stopAll();

    // HTML Audio only: keep Web Audio completely out of this diagnostic.
    const htmlResult = await audioContextManager.playHtmlAudioTest();
    setFeedbackMsg(htmlResult === 'played' ? 'HTML Audio 실행됨' : 'HTML Audio 재생 실패');
    addTimer(() => setFeedbackMsg(''), 2500);
  };

  const playChord = (degree: number) => {
    // 1. Cancel previous playback & stop previous ringing strings
    clearAllTimers();
    GuitarSoundEngine.stopAll();
    audioContextManager.unlock();

    // 2. State update
    setCurrentProgression([degree]);
    setCurrentIndex(0);
    setIsPlaying(true);

    // 3. Strum tightly (~45ms total)
    const def = degreeToDefinition(key, degree);
    GuitarSoundEngine.strum(def.primaryVoicing.frets, { speedSec: 0.009, direction: 'down' });

    addTimer(() => {
      setCurrentIndex(-1);
      setIsPlaying(false);
    }, 900);
  };

  const playProgression = (degrees: number[]) => {
    // 1. Cancel previous scheduled events & stop previous strings
    clearAllTimers();
    GuitarSoundEngine.stopAll();
    audioContextManager.unlock();

    setCurrentProgression(degrees);
    setIsPlaying(true);

    const beatSec = 60 / bpm;
    const chordStepMs = beatSec * 4 * 1000;

    degrees.forEach((degree, index) => {
      addTimer(() => {
        setCurrentIndex(index);
        GuitarSoundEngine.stopAll(); // Clean chord change
        const frets = degreeToDefinition(key, degree).primaryVoicing.frets;
        const stepSec = beatSec / 2;

        rhythm.pattern.forEach((stroke, strokeIndex) => {
          addTimer(() => {
            if (stroke !== 'rest') {
              GuitarSoundEngine.strum(frets, {
                direction: stroke,
                speedSec: 0.008,
                velocity: stroke === 'up' ? 0.70 : 0.85
              });
            }
          }, strokeIndex * stepSec * 1000);
        });
      }, index * chordStepMs);
    });

    addTimer(() => {
      setCurrentIndex(-1);
      setIsPlaying(false);
    }, degrees.length * chordStepMs);
  };

  const currentLabels = currentProgression.map(degree => degreeToChord(key, degree));

  return (
    <div className="app">
      <main className="card">
        <header>
          <h1>CHORDS</h1>
          <p>코드 진행을 바로 기타로 들어보기</p>
        </header>

        {/* Audio Helper & Fast Strum Status */}
        <div style={{
          background: '#f9f9fb',
          border: '1px solid #e1e4ea',
          borderRadius: '10px',
          padding: '10px 12px',
          margin: '0 0 16px',
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#555'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span>
              <strong style={{ color: '#2e7d32' }}>🎸 리얼 스트럼 준비 완료</strong>
              {feedbackMsg && <span style={{ marginLeft: 6, color: '#111', fontWeight: 'bold' }}>· {feedbackMsg}</span>}
            </span>
            <button
              onClick={handleTestAudio}
              style={{
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔊 소리 테스트
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            💡 아이폰의 경우 측면 <strong>무음(진동) 스위치</strong>를 해제하고 볼륨을 올려주세요.
          </div>
        </div>

        <section>
          <h2>KEY</h2>
          <div className="key-grid">{KEYS.map(note => (
            <button key={note} className={key === note ? 'selected' : ''} onClick={() => {
              clearAllTimers();
              GuitarSoundEngine.stopAll();
              setKey(note);
              setCurrentProgression([]);
              setCurrentIndex(-1);
              setIsPlaying(false);
            }}>{note}</button>
          ))}</div>
        </section>

        <section>
          <h2>CHORD</h2>
          <div className="chord-grid">{diatonicChords.map((chord, index) => (
            <button key={chord} className={currentProgression.length === 1 && currentProgression[0] === index + 1 ? 'selected' : ''} onClick={() => playChord(index + 1)}>
              <span className="degree">{index + 1}</span>{chord}
            </button>
          ))}</div>
        </section>

        <section>
          <h2>PROGRESSION</h2>
          <div className="progression-grid">{PROGRESSIONS.map(progression => (
            <button key={progression.label} onClick={() => playProgression(progression.degrees)}>{progression.label}</button>
          ))}</div>
        </section>

        <section>
          <h2>RHYTHM</h2>
          <div className="rhythm-grid">{RHYTHMS.map((item, index) => (
            <button key={item.label} className={rhythmIndex === index ? 'selected' : ''} onClick={() => setRhythmIndex(index)}>
              {item.label}<small>{item.pattern.map(x => x === 'down' ? '↓' : x === 'up' ? '↑' : '·').join(' ')}</small>
            </button>
          ))}</div>
        </section>

        <section className="tempo">
          <h2>BPM</h2>
          <div className="tempo-control">
            <button onClick={() => setBpm(value => Math.max(50, value - 5))}>−</button>
            <strong>{bpm}</strong>
            <button onClick={() => setBpm(value => Math.min(160, value + 5))}>+</button>
          </div>
        </section>

        <section className="current">
          <h2>CURRENT</h2>
          <div className="current-chords">
            {currentLabels.length ? currentLabels.map((chord, index) => (
              <React.Fragment key={index}>
                <span className={currentIndex === index ? 'playing' : ''}>{chord}</span>
                {index < currentLabels.length - 1 && <b>−</b>}
              </React.Fragment>
            )) : <span className="placeholder">진행을 선택하세요</span>}
          </div>
        </section>

        <button className="play" disabled={!currentProgression.length || isPlaying} onClick={() => playProgression(currentProgression)}>
          {isPlaying ? '● PLAYING' : '▶ PLAY'}
        </button>
      </main>
    </div>
  );
};

export default App;
