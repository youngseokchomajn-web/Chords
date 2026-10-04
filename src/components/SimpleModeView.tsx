import React, { useMemo } from 'react';
import { NoteName } from '../types/music';
import { ProgressionItem } from '../types/progression';
import { MONEY_CHORDS, MoneyChordPreset, buildProgressionFromDegrees, getDifficultyBadge } from '../data/moneyChords';

const SIMPLE_KEYS: { note: NoteName; tag?: string }[] = [
  { note: 'C', tag: '기본' },
  { note: 'G', tag: '초보추천' },
  { note: 'D', tag: '인기' },
  { note: 'A' },
  { note: 'E' },
  { note: 'F' },
  { note: 'B' },
];

interface SimpleModeViewProps {
  currentKey: NoteName;
  onSelectKey: (k: NoteName) => void;
  isPlaying: boolean;
  currentPlayingIndex: number;
  currentChord: string | null;
  nextChord: string | null;
  beat: number;
  bpm: number;
  onSetBpm: (bpm: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onPlayPreset: (preset: MoneyChordPreset) => void;
  onStop: () => void;
  onSwitchToStudioWithItems: (items: ProgressionItem[]) => void;
  activePresetId: string | null;
}

export const SimpleModeView: React.FC<SimpleModeViewProps> = ({
  currentKey,
  onSelectKey,
  isPlaying,
  currentPlayingIndex,
  currentChord,
  nextChord,
  beat,
  bpm,
  onSetBpm,
  isLooping,
  onToggleLoop,
  onPlayPreset,
  onStop,
  onSwitchToStudioWithItems,
  activePresetId,
}) => {
  // Key tips
  const keyTip = useMemo(() => {
    switch (currentKey) {
      case 'G':
        return '💡 G키 추천: 초보자가 잡기 가장 편해요! F코드 없이 C, G, D, Em 쉬운 코드로만 연주됩니다.';
      case 'D':
        return '💡 D키: 맑고 청량한 어쿠스틱 포크 사운드에 잘 어울려요.';
      case 'C':
        return '💡 C키: 피아노와 기타의 기본 키지만, 4도 코드(F) 바레코드가 나와요. F가 어렵다면 G키를 눌러보세요!';
      case 'A':
        return '💡 A키: 따뜻하고 부드러운 중음역대 팝/발라드에 좋아요.';
      case 'E':
        return '💡 E키: 기타 6번줄 저음의 웅장한 울림이 매력적인 키입니다.';
      default:
        return '💡 키(Key)를 바꾸면 똑같은 진행이라도 내 목소리나 기타 운지에 맞는 음높이로 바뀝니다.';
    }
  }, [currentKey]);

  return (
    <div className="simple-mode-container">
      {/* 1. KEY SELECTION */}
      <section className="simple-section">
        <div className="simple-section-header">
          <span className="step-badge">STEP 1</span>
          <h3>기타 / 보컬 키(Key) 고르기</h3>
        </div>
        <div className="simple-key-selector">
          {SIMPLE_KEYS.map(({ note, tag }) => {
            const isSelected = currentKey === note;
            return (
              <button
                key={note}
                className={`simple-key-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectKey(note)}
              >
                <span className="key-letter">{note}</span>
                {tag && <span className="key-tag">{tag}</span>}
              </button>
            );
          })}
        </div>
        <div className="simple-tip-banner">{keyTip}</div>
      </section>

      {/* 2. NOW PLAYING FLOATING / TOP BANNER */}
      {isPlaying && (
        <section className="simple-player-banner">
          <div className="simple-player-top">
            <div className="simple-player-badge">
              <span className="live-dot" /> LIVE PLAYING
            </div>
            <div className="simple-player-beat">
              {[0, 1, 2, 3].map(b => (
                <div key={b} className={`simple-beat-dot ${beat === b ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          <div className="simple-player-chords">
            <div className="simple-player-chord current">
              <span className="label">지금 연주</span>
              <strong className="chord">{currentChord || '-'}</strong>
            </div>
            <div className="simple-player-arrow">→</div>
            <div className="simple-player-chord next">
              <span className="label">다음 코드</span>
              <strong className="chord">{nextChord || '-'}</strong>
            </div>
          </div>

          <div className="simple-player-controls">
            <button className="simple-ctrl-btn stop" onClick={onStop}>
              ■ 연주 멈추기
            </button>
            <button className={`simple-ctrl-btn loop ${isLooping ? 'active' : ''}`} onClick={onToggleLoop}>
              🔁 {isLooping ? '무한반복 중' : '1회 재생'}
            </button>
          </div>

          {/* Quick Tempo Buttons */}
          <div className="simple-tempo-row">
            <span className="tempo-label">템포:</span>
            {[
              { label: '느리게 (75)', val: 75 },
              { label: '보통 (90)', val: 90 },
              { label: '신나게 (115)', val: 115 },
            ].map(t => (
              <button
                key={t.val}
                className={`simple-tempo-chip ${bpm === t.val ? 'active' : ''}`}
                onClick={() => onSetBpm(t.val)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. MONEY CHORD CARDS */}
      <section className="simple-section">
        <div className="simple-section-header">
          <span className="step-badge">STEP 2</span>
          <h3>유명 머니코드 터치해서 귀로 느껴보기</h3>
        </div>
        <p className="simple-section-desc">
          버튼을 누르면 실제 마틴 어쿠스틱 기타로 찰랑거리며 즉시 연주됩니다.
        </p>

        <div className="money-card-list">
          {MONEY_CHORDS.map(preset => {
            const items = buildProgressionFromDegrees(currentKey, preset.degrees);
            const chordNames = items.map(it => it.chordName);
            const difficulty = getDifficultyBadge(chordNames);
            const isThisPlaying = isPlaying && activePresetId === preset.id;

            return (
              <div
                key={preset.id}
                className={`money-card ${isThisPlaying ? 'playing' : ''}`}
                onClick={() => {
                  if (isThisPlaying) {
                    onStop();
                  } else {
                    onPlayPreset(preset);
                  }
                }}
              >
                <div className="money-card-top">
                  <div className="money-card-meta">
                    <span className="money-badge">{preset.badge}</span>
                    <h4 className="money-title">{preset.title}</h4>
                  </div>
                  <span className="money-degree">{preset.degreeText}</span>
                </div>

                <div className="money-mood">{preset.mood}</div>

                {/* Chords in current key */}
                <div className="money-chords-row">
                  {items.map((it, idx) => {
                    const isChordActive = isThisPlaying && currentPlayingIndex === idx;
                    return (
                      <React.Fragment key={idx}>
                        <span className={`simple-chord-chip ${isChordActive ? 'active' : ''}`}>
                          {it.chordName}
                        </span>
                        {idx < items.length - 1 && <span className="simple-chord-arrow">→</span>}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Famous Songs & Difficulty */}
                <div className="money-card-footer">
                  <div className="money-songs">
                    <span className="song-icon">🎵</span>
                    <span>{preset.famousSongs.join(' · ')}</span>
                  </div>
                  <div className={`difficulty-badge ${difficulty.isEasy ? 'easy' : 'barre'}`}>
                    {difficulty.text}
                  </div>
                </div>

                {/* Action Row */}
                <div className="money-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className={`btn-money-play ${isThisPlaying ? 'playing' : ''}`}
                    onClick={() => {
                      if (isThisPlaying) onStop();
                      else onPlayPreset(preset);
                    }}
                  >
                    {isThisPlaying ? '■ 연주 정지' : '▶ 이 진행 바로 듣기'}
                  </button>
                  <button
                    className="btn-money-studio"
                    onClick={() => onSwitchToStudioWithItems(items)}
                    title="이 진행을 스튜디오로 가져가서 코드 변경, 보이싱, 지판 확인하기"
                  >
                    🛠️ 스튜디오에서 편집
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM HELPER / BRIDGE */}
      <div className="simple-bottom-box">
        <h4>🤔 더 다양한 코드나 지판(운지법)을 보고 싶으신가요?</h4>
        <p>
          상단의 <strong>[🎛️ 스튜디오 모드]</strong>로 전환하시면 원하는 코드를 직접 추가하고,
          마틴 기타 지판 운지법과 7화음, 카포, 조옮김 기능을 자유롭게 사용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
};
