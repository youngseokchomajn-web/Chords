import React, { useState } from 'react';
import { NoteName, ChordQuality } from './types/music';
import { getChordDefinition } from './theory/chordBuilder';
import { Fretboard } from './components/Fretboard';
import { GuitarSoundEngine } from './audio/guitarSynth';
import { audioContextManager } from './audio/audioContext';

const ROOT_NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES: { label: string; value: ChordQuality }[] = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
  { label: '7', value: '7' },
  { label: 'sus4', value: 'sus4' }
];

export const App: React.FC = () => {
  const [selectedRoot, setSelectedRoot] = useState<NoteName>('G');
  const [selectedQuality, setSelectedQuality] = useState<ChordQuality>('major');

  const chordDef = getChordDefinition(selectedRoot, selectedQuality);

  const handleUserInteraction = async () => {
    await audioContextManager.unlock();
  };

  const handleStrum = async () => {
    await handleUserInteraction();
    GuitarSoundEngine.strum(chordDef.primaryVoicing.frets);
  };

  const handlePlayString = async (stringIdx: number, fret: number) => {
    await handleUserInteraction();
    GuitarSoundEngine.playString(stringIdx, fret);
  };

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '16px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <header style={{ borderBottom: '2px solid #222', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>🎸 Chords (Single Page)</h1>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>Phase 0 / P0 Prototype</p>
      </header>

      <main>
        <Fretboard 
          voicing={chordDef.primaryVoicing} 
          chordName={chordDef.displayName} 
          onPlayString={handlePlayString} 
        />

        <div style={{ margin: '12px 0' }}>
          <button
            onClick={handleStrum}
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              padding: '12px 28px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ▶ 코드 스트럼 재생 (Strum)
          </button>
        </div>

        {/* Root Selector */}
        <div style={{ marginTop: '16px', textAlign: 'left' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Root Note</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginTop: '6px' }}>
            {ROOT_NOTES.map(note => (
              <button
                key={note}
                onClick={() => setSelectedRoot(note)}
                style={{
                  padding: '8px 0',
                  borderRadius: '6px',
                  border: selectedRoot === note ? '2px solid #111' : '1px solid #ddd',
                  background: selectedRoot === note ? '#111' : '#f9f9f9',
                  color: selectedRoot === note ? '#fff' : '#111',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Selector */}
        <div style={{ marginTop: '16px', textAlign: 'left' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Chord Quality</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
            {QUALITIES.map(q => (
              <button
                key={q.value}
                onClick={() => setSelectedQuality(q.value)}
                style={{
                  padding: '8px 0',
                  borderRadius: '6px',
                  border: selectedQuality === q.value ? '2px solid #111' : '1px solid #ddd',
                  background: selectedQuality === q.value ? '#111' : '#f9f9f9',
                  color: selectedQuality === q.value ? '#fff' : '#111',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
