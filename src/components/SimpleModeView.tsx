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
  onStop: () => void;
  onSwitchToStudioWithItems: (items: ProgressionItem[]) => void;
  activePresetId: string | null;
}

export const SimpleModeView: React.FC<SimpleModeViewProps> = ({
  currentKey, onSelectKey, isPlaying, currentPlayingIndex, currentChord, nextChord,
  beat, bpm, isLooping, onToggleLoop, onPlayPreset, onStop,
  onSwitchToStudioWithItems, activePresetId,
}) => (
  <div className="simple-mode-container">
    <section className="simple-key-panel">
      <div className="simple-key-heading">
        <div><span className="simple-eyebrow">KEY</span><strong>{currentKey}</strong></div>
        <span className="simple-key-caption">진행을 들을 키를 선택</span>
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
          <div><span className="simple-eyebrow">NOW PLAYING</span><strong className="simple-now-chord">{currentChord || '-'}</strong></div>
          <div className="simple-next"><span>다음</span><strong>{nextChord || '-'}</strong></div>
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
        <div><span className="simple-eyebrow">PROGRESSIONS</span><h3>바로 들어보기</h3></div>
        <span className="simple-section-note">{currentKey} key</span>
      </div>
      <div className="money-card-list">
        {MONEY_CHORDS.map(preset => {
          const items = buildProgressionFromDegrees(currentKey, preset.degrees);
          const isThisPlaying = isPlaying && activePresetId === preset.id;
          return (
            <button key={preset.id} className={`money-card ${isThisPlaying ? 'playing' : ''}`}
              onClick={() => isThisPlaying ? onStop() : onPlayPreset(preset)}>
              <span className="money-card-main">
                <span className="money-card-title-row"><strong>{preset.title}</strong><span>{preset.degreeText}</span></span>
                <span className="money-mood">{preset.mood}</span>
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

    <button className="simple-studio-link"
      onClick={() => onSwitchToStudioWithItems(buildProgressionFromDegrees(currentKey, MONEY_CHORDS[0].degrees))}>
      더 자세히 만들기 → 스튜디오 모드
    </button>
  </div>
);
