import React from 'react';
import { NoteName } from '../types/music';
import { MONEY_CHORDS, MoneyChordPreset, buildProgressionFromDegrees } from '../data/moneyChords';

const SIMPLE_KEYS: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'F', 'B'];

interface SimpleModeViewProps {
  currentKey: NoteName;
  onSelectKey: (k: NoteName) => void;
  isPlaying: boolean;
  isPaused: boolean;
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
  onPause: () => void;
  onResume: () => void;
  activePresetId: string | null;
  simplePage: 'listen' | 'song';
}

const DEFAULT_SONG_TEXT = `[Intro]
1 4 1

[Pre-Chorus]
1 4 1
4 1 5 1

[Chorus]
1 4 1 5
1 4 1 5`;

const parseSongSections = (text: string) => {
  const lines = text.split(/\r?\n/);
  const sections: { title: string; lines: string[] }[] = [];
  let current = { title: 'Verse', lines: [] as string[] };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const phase = line.match(/^\[(.+?)\]$/);
    if (phase) {
      if (sections.length > 0 || current.lines.length > 0 || current.title !== 'Verse') sections.push(current);
      current = { title: phase[1], lines: [] };
      continue;
    }
    if (!line) continue;
    const digits = line.replace(/[^1-7]/g, '');
    if (digits) current.lines.push(digits);
  }

  if (sections.length > 0 || current.lines.length > 0 || current.title !== 'Verse') sections.push(current);
  return sections;
};

const parseSongText = (text: string) =>
  parseSongSections(text).filter(section => section.lines.length > 0);

const serializeSongSections = (sections: { title: string; lines: string[] }[]) =>
  sections.map(section => `[${section.title}]\n${section.lines.join('\n')}`).join('\n\n');

export const SimpleModeView: React.FC<SimpleModeViewProps> = ({
  currentKey, onSelectKey, isPlaying, isPaused, currentPlayingIndex, currentChord, nextChord,
  beat, bpm, isLooping, onToggleLoop, onPlayPreset, onStop, onPause, onResume,
  onPlayCustomDegrees, activePresetId, simplePage,
}) => {
  const [customInput, setCustomInput] = React.useState('154');
  const [songSectionsDraft, setSongSectionsDraft] = React.useState(() => parseSongSections(DEFAULT_SONG_TEXT));
  const [songText, setSongText] = React.useState(DEFAULT_SONG_TEXT);
  const [songInputMode, setSongInputMode] = React.useState<'boxes' | 'text'>('boxes');
  const [isSongExample, setIsSongExample] = React.useState(true);

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
    onPlayCustomDegrees(digits);
  };

  const editableSongSections = songSectionsDraft;
  const songSections = editableSongSections.filter(section => section.lines.length > 0);

  const updateSongSection = (index: number, value: string) => {
    setSongSectionsDraft(prev => prev.map((section, sectionIndex) => {
      if (sectionIndex !== index) return section;
      const lines = value.split(/\r?\n/)
        .map(line => line.replace(/[^1-7\s]/g, '').trim())
        .filter(Boolean);
      return { ...section, lines };
    }));
  };

  const switchSongInputMode = (mode: 'boxes' | 'text') => {
    if (mode === 'text') {
      setSongText(serializeSongSections(songSectionsDraft.filter(section => section.lines.length > 0)));
    } else {
      const parsed = parseSongSections(songText);
      if (parsed.length > 0) setSongSectionsDraft(parsed);
    }
    setSongInputMode(mode);
  };

  const handleSongTextChange = (value: string) => {
    setIsSongExample(false);
    setSongText(value);
    const parsed = parseSongSections(value);
    if (parsed.length > 0) setSongSectionsDraft(parsed);
  };

  const clearSongExample = () => {
    if (!isSongExample) return;
    setIsSongExample(false);
    setSongSectionsDraft([]);
    setSongText('');
  };

  const resetSong = () => {
    const sections = parseSongSections(DEFAULT_SONG_TEXT);
    setSongSectionsDraft(sections);
    setSongText(DEFAULT_SONG_TEXT);
    setIsSongExample(true);
  };
  const sectionForIndex = (index: number) => {
    if (index < 0) return '';
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
    {simplePage === 'listen' && (
      <>
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


      </>
    )}
    {simplePage === 'song' && (
      <>
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

    <section className="simple-section song-writer-section">
      <div className="simple-section-heading">
        <h3>곡 써보기</h3>
        <div className="song-input-toggle" role="group" aria-label="입력 방식">
          <button className={songInputMode === 'boxes' ? 'active' : ''} onClick={() => switchSongInputMode('boxes')} >구간별 입력</button>
          <button className={songInputMode === 'text' ? 'active' : ''} onClick={() => switchSongInputMode('text')} >전체 입력</button>
        </div>
      </div>

      <div className="song-example-label">예시 · 반짝반짝 작은별</div>

      {songInputMode === 'boxes' ? (
        <div className="song-section-boxes">
          {editableSongSections.map((section, index) => (
            <div className="song-section-box" key={`${section.title}-${index}`}>
              <strong>{section.title}</strong>
              <textarea
                value={section.lines.join('\n')}
                onFocus={clearSongExample}
                onChange={e => updateSongSection(index, e.target.value)}
                spellCheck={false}
                aria-label={`${section.title} 코드 입력`}
                placeholder="예: 1546"
              />
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={songText}
          onFocus={clearSongExample}
          onChange={e => handleSongTextChange(e.target.value)}
          spellCheck={false}
          aria-label="숫자 코드 곡 입력"
          className="song-text-editor"
          placeholder={"[Verse]\n1546\n\n[Chorus]\n1564"}
        />
      )}

      {songSections.length > 0 && (
        <div className="song-section-tags">
          {songSections.map((section, index) => (
            <span key={section.title + '-' + index} className={currentSongSection === section.title ? 'active' : ''}>
              {section.title}
            </span>
          ))}
        </div>
      )}

      <div className="song-writer-actions">
        <button onClick={resetSong} className="song-reset-btn">기본 구조</button>
        {isPlaying || isPaused ? (
          <>
            <button onClick={isPaused ? onResume : onPause} className="song-play-btn">
              {isPaused ? '▶ 계속 듣기' : 'Ⅱ 일시정지'}
            </button>
            <button onClick={onStop} className="song-reset-btn">정지</button>
          </>
        ) : (
          <button onClick={handleSongPlay} disabled={!songSections.length} className="song-play-btn">▶ 곡 전체 듣기</button>
        )}
      </div>
    </section>
      </>
    )}


  </div>
  );
};
