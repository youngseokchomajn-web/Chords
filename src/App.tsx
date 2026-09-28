import React, { useMemo, useState, useRef, useEffect } from 'react';
import { NoteName } from './types/music';
import { getChordDefinition } from './theory/chordBuilder';
import { GuitarSoundEngine, subscribeLoadingProgress, SAMPLES } from './audio/guitarSynth';
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
  const [sampleStats, setSampleStats] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: SAMPLES.length,
  });

  const timersRef = useRef<number[]>([]);
  const rawSampleAudioMapRef = useRef<Map<number, HTMLAudioElement>>(new Map());

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
    const rawAudioMap = rawSampleAudioMapRef.current;
    SAMPLES.forEach(([sampleMidi, file]) => {
      const audio = new Audio(`${import.meta.env.BASE_URL}samples/guitar/${file}`);
      audio.preload = 'auto';
      audio.volume = 0.75;
      audio.load();
      rawAudioMap.set(sampleMidi, audio);
    });

    const unsubscribe = subscribeLoadingProgress((loaded, total) => {
      setSampleStats({ loaded, total });
    });
    return () => {
      unsubscribe();
      clearAllTimers();
      GuitarSoundEngine.stopAll();
      rawAudioMap.forEach(audio => audio.pause());
      rawAudioMap.clear();
    };
  }, []);

  const diatonicChords = useMemo(() => Array.from({ length: 7 }, (_, i) => degreeToChord(key, i + 1)), [key]);
  const rhythm = RHYTHMS[rhythmIndex];

  const handleTestAudio = () => {
    clearAllTimers();
    audioContextManager.unlockSync();
    GuitarSoundEngine.playTestNote();
    void audioContextManager.playHtmlAudioTest().then(result => {
      setFeedbackMsg(result === 'played' ? '기본음 + 기타음 재생됨' : '기타음 재생됨');
      addTimer(() => setFeedbackMsg(''), 2500);
    });
  };

  const playRawSample = async (sampleMidi: number) => {
    clearAllTimers();
    audioContextManager.unlockSync();
    if (GuitarSoundEngine.loadedSampleCount < SAMPLES.length) {
      setFeedbackMsg('기타 샘플 준비 중...');
      return;
    }
    GuitarSoundEngine.stopAll();
    const played = GuitarSoundEngine.playRawSample(sampleMidi);
    setFeedbackMsg(played ? `원본 샘플: ${sampleMidi} MIDI` : '원본 샘플 재생 실패');
    addTimer(() => setFeedbackMsg(''), 2500);
  };

  const playChord = (degree: number) => {
    clearAllTimers();
    GuitarSoundEngine.stopAll();
    audioContextManager.unlockSync();

    setCurrentProgression([degree]);
    setCurrentIndex(0);
    setIsPlaying(true);

    const def = degreeToDefinition(key, degree);
    GuitarSoundEngine.strum(def.primaryVoicing.frets, { speedSec: 0.007, direction: 'down' });

    addTimer(() => {
      setCurrentIndex(-1);
      setIsPlaying(false);
    }, 900);
  };

  const playProgression = (degrees: number[]) => {
    clearAllTimers();
    GuitarSoundEngine.stopAll();
    audioContextManager.unlockSync();

    setCurrentProgression(degrees);
    setIsPlaying(true);

    const beatSec = 60 / bpm;
    const chordStepMs = beatSec * 4 * 1000;

    degrees.forEach((degree, index) => {
      addTimer(() => {
        setCurrentIndex(index);
        GuitarSoundEngine.stopAll();
        const frets = degreeToDefinition(key, degree).primaryVoicing.frets;
        const stepSec = beatSec / 2;

        rhythm.pattern.forEach((stroke, strokeIndex) => {
          addTimer(() => {
            if (stroke !== 'rest') {
              GuitarSoundEngine.strum(frets, {
                direction: stroke,
                speedSec: 0.007,
                velocity: stroke === 'up' ? 0.82 : 0.95
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

        {/* Audio Helper & Status Bar */}
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
              {sampleStats.loaded >= sampleStats.total ? (
                <strong style={{ color: '#2e7d32' }}>🎸 마틴 어쿠스틱 사운드 준비 완료</strong>
              ) : sampleStats.loaded >= 3 ? (
                <strong style={{ color: '#0277bd' }}>🎸 마틴 어쿠스틱 준비됨 ({sampleStats.loaded}/{sampleStats.total})</strong>
              ) : (
                <span style={{ color: '#e65100' }}>⏳ 어쿠스틱 샘플 준비 중 ({sampleStats.loaded}/{sampleStats.total})</span>
              )}
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
          <h2>RAW SAMPLES</h2>
          <div className="progression-grid">
            {SAMPLES.map(([sampleMidi, file]) => (
              <button key={sampleMidi} onClick={() => playRawSample(sampleMidi)} disabled={sampleStats.loaded < sampleStats.total}>
                {file.replace(/^MartinGM2_\d+_+/, '').replace(/_1\.wav$/, '').replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
            가공하지 않은 원본 기타 샘플을 직접 들어봅니다.
          </div>
        </section>

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
            <button key={chord} className={currentProgression.length === 1 && currentProgression[0] === index + 1 ? 'selected' : ''} disabled={sampleStats.loaded < sampleStats.total}
              onClick={() => playChord(index + 1)}>
              <span className="degree">{index + 1}</span>{chord}
            </button>
          ))}</div>
        </section>

        <section>
          <h2>PROGRESSION</h2>
          <div className="progression-grid">{PROGRESSIONS.map(progression => (
            <button key={progression.label} disabled={sampleStats.loaded < sampleStats.total}
            onClick={() => playProgression(progression.degrees)}>{progression.label}</button>
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
