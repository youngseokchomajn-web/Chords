import React from 'react';
import { NoteName } from '../types/music';
import { ProgressionItem } from '../types/progression';
import { MONEY_CHORDS, MoneyChordPreset, buildProgressionFromDegrees } from '../data/moneyChords';

const SIMPLE_KEYS: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'F', 'B'];

interface SimpleModeViewProps {
  currentKey: NoteName;
  onSelectKey: (k: NoteName) => void;
  isPlaying: boolean;
  currentPlayingIndex: number;
  currentChord: string | null;
  nextChord: string | null;
  beat: number;
  bpm: number;
  isLooping: boolean;
  onToggleLoop: () => void;
  onPlayPreset: (preset: MoneyChordPreset) => void;
  onPlayCustomDegrees: (input: string) => void;
  onStop: () => void;
  activePresetId: string | null;
}

const TWINKLE_EXAMPLE = `[Verse]\n1 4 1\n4 1 5 1\n\n[Verse]\n1 4 1 5\n1 4 1 5\n\n[Verse]\n1 4 1\n4 1 5 1`;

const parseSongText = (text: string) => {
  const lines = text.split(/\r?\n/);
  const sections: { title: string; lines: string[] }[] = [];
  let current = { title: 'Verse', lines: [] as string[] };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const phase = line.match(/^\[(.+?)\]$/);
    if (phase) {
      if (current.lines.length > 0 || sections.length === 0) sections.push(current);
      current = { title: phase[1], lines: [] };
      continue;
    }
    const digits = line.replace(/[^1-7]/g, '');
    if (digits) current.lines.push(digits);
  }

  if (current.lines.length > 0) sections.push(current);
  return sections;
};

export const SimpleModeView: React.FC<SimpleModeViewProps> = ({
  currentKey, onSelectKey, isPlaying, currentPlayingIndex, currentChord, nextChord,
  beat, bpm, isLooping, onToggleLoop, onPlayPreset, onStop,
  onPlayCustomDegrees, activePresetId,
}) => {
  const [customInput, setCustomInput] = React.useState('154');
  const [songText, setSongText] = React.useState(TWINKLE_EXAMPLE);
  const [isSongPlaying, setIsSongPlaying] = React.useState(false);

  const handleCustomPlay = () => {
    if (/^[1-7]+$/.test(customInput)) {
      setIsSongPlaying(false);
      onPlayCustomDegrees(customInput);
    }
  };

  const handleSongPlay = () => {
    const sections = parseSongText(songText);
    const digits = sections.flatMap(section => section.lines).join('');
    if (!digits) return;
    setIsSongPlaying(true);
    onPlayCustomDegrees(digits);
  };

  const songSections = parseSongText(songText);
  const sectionForIndex = (index: number) => {
    if (!isSongPlaying || index < 0) return '';
    let offset = 0;
    for (const section of songSections) {
      const length = section.lines.reduce((sum, line) => sum + line.length, 0);
      if (index < offset + length) return section.title;
      offset += length;
    }
    return '';
  };
  const currentSongSection = sectionForIndex(currentPlayingIndex);

  return (
  <div className="simple-mode-container">
    <section className="simple-key-panel">
      <div className="simple-key-heading">
        <strong>{currentKey}</strong>
      </div>
      <div className="simple-key-selector">
        {SIMPLE_KEYS.map(note => (
          <button key={note} className={`simple-key-btn ${currentKey === note ? 'selected' : ''}`}
            onClick={() => onSelectKey(note)} aria-label={`${note} key`}>{note}</button>
        ))}
      </div>
    </section>

    {isPlaying && (
      <section className="simple-player-banner">
        <div className="simple-player-main">
          <div><strong className="simple-now-chord">{currentChord || '-'}</strong></div>
          <div className="simple-next"><span>{currentSongSection || '다음'}</span><strong>{nextChord || '-'}</strong></div>
        </div>
        <div className="simple-progress-row">
          <div className="simple-progress-dots">{[0,1,2,3].map(b => <span key={b} className={beat === b ? 'active' : ''} />)}</div>
          <span>{bpm} BPM</span>
        </div>
        <div className="simple-player-actions">
          <button onClick={onStop}>정지</button>
          <button className={isLooping ? 'active' : ''} onClick={onToggleLoop}>{isLooping ? '반복 중' : '반복'}</button>
        </div>
      </section>
    )}

    <section className="simple-section simple-presets">
      <div className="simple-section-heading">
        <h3>바로 들어보기</h3>
      </div>
      <div className="simple-custom-play">
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value.replace(/[^1-7]/g, '').slice(0, 8))}
          onKeyDown={e => { if (e.key === 'Enter') handleCustomPlay(); }}
          inputMode="numeric"
          pattern="[1-7]*"
          aria-label="코드 진행 입력"
          placeholder="예: 154"
          maxLength={8}
        />
        <button onClick={handleCustomPlay} disabled={!customInput}>▶ 듣기</button>
      </div>
      <div className="money-card-list">
        {MONEY_CHORDS.map(preset => {
          const items = buildProgressionFromDegrees(currentKey, preset.degrees);
          const isThisPlaying = isPlaying && activePresetId === preset.id;
          return (
            <button key={preset.id} className={`money-card ${isThisPlaying ? 'playing' : ''}`}
              onClick={() => isThisPlaying ? onStop() : onPlayPreset(preset)}>
              <span className="money-card-main">
                <span className="money-card-title-row"><strong>{preset.degreeText}</strong></span>
                <span className="money-chords-row">
                  {items.map((it, idx) => <React.Fragment key={idx}>
                    <span className={`simple-chord-chip ${isThisPlaying && currentPlayingIndex === idx ? 'active' : ''}`}>{it.chordName}</span>
                    {idx < items.length - 1 && <span className="simple-chord-arrow">→</span>}
                  </React.Fragment>)}
                </span>
              </span>
              <span className="money-card-play">{isThisPlaying ? '정지' : '▶ 듣기'}</span>
            </button>
          );
        })}
      </div>
    </section>

    <section className="simple-section" style={{ marginTop: 20 }}>
      <div className="simple-section-heading">
        <h3>곡 써보기</h3>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666' }}>
        Key를 정하고 숫자로 코드를 씁니다. [Verse] 같은 Phase와 줄바꿈으로 곡을 나눌 수 있어요.
      </p>
      <textarea
        value={songText}
        onChange={e => setSongText(e.target.value)}
        spellCheck={false}
        aria-label="숫자 코드 곡 입력"
        style={{
          width: '100%', minHeight: 190, boxSizing: 'border-box', resize: 'vertical',
          border: '1px solid #d9dce2', borderRadius: 10, padding: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14,
          lineHeight: 1.7, color: '#111', background: '#fff'
        }}
      />
      {songSections.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {songSections.map((section, index) => (
            <span key={`${section.title}-${index}`} style={{
              padding: '4px 8px', borderRadius: 999, background: '#f3f4f6',
              fontSize: 11, color: '#555'
            }}>{section.title}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={() => setSongText(TWINKLE_EXAMPLE)}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontWeight: 700 }}
        >
          Twinkle 예제
        </button>
        <button
          onClick={handleSongPlay}
          disabled={!songSections.length}
          style={{ flex: 1, padding: '10px 12px', border: 'none', borderRadius: 8, background: '#111', color: '#fff', fontWeight: 700 }}
        >
          ▶ 곡 전체 듣기
        </button>
      </div>
    </section>

  </div>
  );
};
