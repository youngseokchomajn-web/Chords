import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NoteName, ChordQuality } from './types/music';
import { ProgressionItem, VoicingType, StoredProgression } from './types/progression';
import {
  getDiatonicChords,
  transposeNote,
  DiatonicChordInfo
} from './theory/notes';
import {
  getChordDefinition,
  getAvailableVoicings,
  AvailableVoicingOption
} from './theory/chordBuilder';
import { PlaybackEngine, RhythmPattern } from './audio/playbackEngine';
import { GuitarSoundEngine, subscribeLoadingProgress, SAMPLES } from './audio/guitarSynth';
import { audioContextManager } from './audio/audioContext';
import {
  getChordDiagnostic,
  ChordDiagnostic
} from './audio/sampleSelector';
import { Fretboard } from './components/Fretboard';
import {
  loadSavedProgressions,
  saveProgressionToLocal,
  deleteSavedProgression,
  buildShareUrl,
  parseShareUrl
} from './utils/storage';
import { SimpleModeView } from './components/SimpleModeView';
import { MONEY_CHORDS, MoneyChordPreset, buildProgressionFromDegrees } from './data/moneyChords';

const KEYS: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const RHYTHMS: RhythmPattern[] = [
  { label: '4 BEAT', pattern: ['down', 'rest', 'down', 'rest', 'down', 'rest', 'down', 'rest'] as const },
  { label: '8 BEAT', pattern: ['down', 'rest', 'down', 'up', 'rest', 'up', 'down', 'up'] as const },
  { label: '8 BEAT 2', pattern: ['down', 'rest', 'down', 'up', 'down', 'rest', 'up', 'up'] as const },
  { label: '8 BEAT 3', pattern: ['down', 'rest', 'up', 'up', 'down', 'up', 'down', 'up'] as const },
  { label: '8 BEAT 4', pattern: ['down', 'rest', 'down', 'rest', 'down', 'up', 'down', 'up'] as const },
];

const PRESETS = [
  { label: '1-5-6-4', degrees: [1, 5, 6, 4] },
  { label: '6-4-1-5', degrees: [6, 4, 1, 5] },
  { label: '1-4-5', degrees: [1, 4, 5] },
  { label: '1-6-4-5', degrees: [1, 6, 4, 5] },
  { label: '1-5-4', degrees: [1, 5, 4] },
  { label: '6-5-4-5', degrees: [6, 5, 4, 5] }
];

const EXTENDED_QUALITIES: { label: string; value: ChordQuality }[] = [
  { label: 'Maj', value: 'major' },
  { label: 'Min', value: 'minor' },
  { label: '7', value: '7' },
  { label: 'Maj7', value: 'maj7' },
  { label: 'Min7', value: 'm7' },
  { label: 'sus4', value: 'sus4' },
  { label: 'sus2', value: 'sus2' },
  { label: 'add9', value: 'add9' },
  { label: 'dim', value: 'dim' },
  { label: 'aug', value: 'aug' },
];

export const App: React.FC = () => {
  // 0. App Mode (Simple vs Studio)
  const [appMode, setAppMode] = useState<'simple' | 'studio'>('simple');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // 1. Key & Mode
  const [key, setKey] = useState<NoteName>('C');
  const [isMinorKey, setIsMinorKey] = useState<boolean>(false);

  // 2. Progression Editor State (P1)
  const [progression, setProgression] = useState<ProgressionItem[]>(() => [
    { id: 'init_1', chordName: 'C', root: 'C', quality: 'major', degree: 1, voicingType: 'open' },
    { id: 'init_2', chordName: 'G', root: 'G', quality: 'major', degree: 5, voicingType: 'open' },
    { id: 'init_3', chordName: 'Am', root: 'A', quality: 'minor', degree: 6, voicingType: 'open' },
    { id: 'init_4', chordName: 'F', root: 'F', quality: 'major', degree: 4, voicingType: 'barre' },
  ]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // 3. Preview & Voicing (P3)
  const [previewChord, setPreviewChord] = useState<{
    root: NoteName;
    quality: ChordQuality;
    voicingType: VoicingType;
  }>({ root: 'C', quality: 'major', voicingType: 'open' });

  // 4. Transport & Playback State (P1 Stop/Loop & P2 UX)
  const [bpm, setBpm] = useState<number>(90);
  const [rhythmIndex, setRhythmIndex] = useState<number>(1);
  const [capo, setCapo] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackPos, setPlaybackPos] = useState<{
    currentIndex: number;
    currentChord: string | null;
    nextChord: string | null;
    beat: number;
  }>({
    currentIndex: -1,
    currentChord: null,
    nextChord: null,
    beat: 0
  });

  // 5. Save & Share (P4)
  const [savedList, setSavedList] = useState<StoredProgression[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // 6. Diagnostics & Audio Loading
  const [sampleStats, setSampleStats] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: SAMPLES.length,
  });
  const [activeDiagnostic, setActiveDiagnostic] = useState<ChordDiagnostic | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState<boolean>(false);

  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = (msg: string) => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    setFeedbackMsg(msg);
    feedbackTimerRef.current = window.setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // URL State Restoration (P4)
  useEffect(() => {
    const parsed = parseShareUrl();
    if (parsed) {
      setAppMode('studio');
      if (parsed.key) setKey(parsed.key);
      if (parsed.isMinor !== undefined) setIsMinorKey(parsed.isMinor);
      if (parsed.bpm) setBpm(parsed.bpm);
      if (parsed.rhythmIndex !== undefined) setRhythmIndex(parsed.rhythmIndex);
      if (parsed.capo !== undefined) setCapo(parsed.capo);
      if (parsed.items && parsed.items.length > 0) {
        setProgression(parsed.items);
        setSelectedItemIndex(0);
        setPreviewChord({
          root: parsed.items[0].root,
          quality: parsed.items[0].quality,
          voicingType: parsed.items[0].voicingType || 'open'
        });
      }
      showFeedback('공유된 진행이 복원되었습니다!');
    }
    setSavedList(loadSavedProgressions());

    const unsubscribe = subscribeLoadingProgress((loaded, total) => {
      setSampleStats({ loaded, total });
    });
    return () => {
      unsubscribe();
      PlaybackEngine.stop();
    };
  }, []);

  // Update diagnostic whenever previewChord changes
  useEffect(() => {
    const def = getChordDefinition(previewChord.root, previewChord.quality, previewChord.voicingType);
    setActiveDiagnostic(getChordDiagnostic(def.displayName, def.primaryVoicing.frets));
  }, [previewChord]);

  // Diatonic Chords for currently selected Key & Scale Mode
  const diatonicChords = useMemo<DiatonicChordInfo[]>(
    () => getDiatonicChords(key, isMinorKey),
    [key, isMinorKey]
  );

  // Available voicings for current preview chord
  const availableVoicings = useMemo<AvailableVoicingOption[]>(
    () => getAvailableVoicings(previewChord.root, previewChord.quality),
    [previewChord.root, previewChord.quality]
  );

  const currentPreviewDefinition = useMemo(() => {
    return getChordDefinition(previewChord.root, previewChord.quality, previewChord.voicingType);
  }, [previewChord]);

  // -------------------------------------------------------------
  // Handlers: Diatonic Click / Chord Preview
  // -------------------------------------------------------------
  const handleSelectDiatonic = (info: DiatonicChordInfo) => {
    const options = getAvailableVoicings(info.root, info.quality);
    const chosenVoicing = options[0]?.type || 'open';

    setPreviewChord({
      root: info.root,
      quality: info.quality,
      voicingType: chosenVoicing
    });

    const item: ProgressionItem = {
      id: `temp_${Date.now()}`,
      chordName: info.chordName,
      root: info.root,
      quality: info.quality,
      degree: info.degree,
      voicingType: chosenVoicing
    };
    PlaybackEngine.playSingleChord(item, capo);
  };

  const handleSelectQuality = (quality: ChordQuality) => {
    const options = getAvailableVoicings(previewChord.root, quality);
    const chosenVoicing = options[0]?.type || 'open';
    const def = getChordDefinition(previewChord.root, quality, chosenVoicing);

    setPreviewChord({
      root: previewChord.root,
      quality,
      voicingType: chosenVoicing
    });

    const item: ProgressionItem = {
      id: `temp_${Date.now()}`,
      chordName: def.displayName,
      root: previewChord.root,
      quality,
      voicingType: chosenVoicing
    };
    PlaybackEngine.playSingleChord(item, capo);
  };

  const handleSelectVoicing = (type: VoicingType) => {
    setPreviewChord(prev => ({ ...prev, voicingType: type }));
    const def = getChordDefinition(previewChord.root, previewChord.quality, type);

    // If an item in custom progression is currently selected, update its voicing too
    if (selectedItemIndex >= 0 && selectedItemIndex < progression.length) {
      setProgression(prev => {
        const copy = [...prev];
        copy[selectedItemIndex] = {
          ...copy[selectedItemIndex],
          voicingType: type
        };
        return copy;
      });
    }

    const item: ProgressionItem = {
      id: `temp_${Date.now()}`,
      chordName: def.displayName,
      root: previewChord.root,
      quality: previewChord.quality,
      voicingType: type
    };
    PlaybackEngine.playSingleChord(item, capo);
  };

  // -------------------------------------------------------------
  // Handlers: Progression Editor (P1)
  // -------------------------------------------------------------
  const handleAddCurrentChord = () => {
    if (isPlaying) handleStop();

    const def = currentPreviewDefinition;
    const newItem: ProgressionItem = {
      id: `prog_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      chordName: def.displayName,
      root: previewChord.root,
      quality: previewChord.quality,
      voicingType: previewChord.voicingType
    };

    setProgression(prev => [...prev, newItem]);
    setSelectedItemIndex(progression.length);
    showFeedback(`${def.displayName} 코드가 추가되었습니다`);
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isPlaying) handleStop();

    setProgression(prev => prev.filter(item => item.id !== id));
    setSelectedItemIndex(-1);
  };

  const handleClearProgression = () => {
    if (isPlaying) handleStop();
    setProgression([]);
    setSelectedItemIndex(-1);
    showFeedback('진행이 초기화되었습니다');
  };

  const handleSelectProgressionItem = (index: number) => {
    setSelectedItemIndex(index);
    const item = progression[index];
    if (item) {
      setPreviewChord({
        root: item.root,
        quality: item.quality,
        voicingType: item.voicingType || 'open'
      });
      PlaybackEngine.playSingleChord(item, capo);
    }
  };

  const handleLoadPreset = (degrees: number[]) => {
    if (isPlaying) handleStop();

    const newItems: ProgressionItem[] = degrees.map((deg, i) => {
      const info = diatonicChords[deg - 1];
      const root = info ? info.root : key;
      const quality = info ? info.quality : 'major';
      const def = getChordDefinition(root, quality);
      return {
        id: `preset_${Date.now()}_${i}`,
        chordName: def.displayName,
        root,
        quality,
        degree: deg,
        voicingType: 'open'
      };
    });

    setProgression(newItems);
    setSelectedItemIndex(0);
    if (newItems.length > 0) {
      setPreviewChord({
        root: newItems[0].root,
        quality: newItems[0].quality,
        voicingType: 'open'
      });
    }

    // Immediately play preset
    setTimeout(() => {
      startPlayback(newItems);
    }, 50);
  };

  // -------------------------------------------------------------
  // Handlers: Transport & Playback (P1/P2)
  // -------------------------------------------------------------
  const startPlayback = (itemsToPlay = progression) => {
    if (!itemsToPlay || itemsToPlay.length === 0) {
      showFeedback('재생할 코드가 없습니다');
      return;
    }

    setIsPlaying(true);
    PlaybackEngine.playProgression(
      itemsToPlay,
      RHYTHMS[rhythmIndex],
      bpm,
      capo,
      isLooping,
      {
        onStep: (index, currentChord, nextChord) => {
          setPlaybackPos(prev => ({
            ...prev,
            currentIndex: index,
            currentChord,
            nextChord
          }));
        },
        onBeat: beat => {
          setPlaybackPos(prev => ({ ...prev, beat }));
        },
        onFinish: () => {
          setIsPlaying(false);
          setActivePresetId(null);
          setPlaybackPos({
            currentIndex: -1,
            currentChord: null,
            nextChord: null,
            beat: 0
          });
        }
      }
    );
  };

  const handlePlay = () => {
    if (isPlaying) {
      handleStop();
    } else {
      startPlayback();
    }
  };

  const handleStop = () => {
    PlaybackEngine.stop();
    setIsPlaying(false);
    setActivePresetId(null);
    setPlaybackPos({
      currentIndex: -1,
      currentChord: null,
      nextChord: null,
      beat: 0
    });
  };

  const handleToggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    PlaybackEngine.setLoop(nextLoop);
    showFeedback(nextLoop ? '반복 재생(Loop) 켜짐' : '반복 재생(Loop) 꺼짐');
  };

  // -------------------------------------------------------------
  // Handlers: Simple Mode (Beginner friendly money chords)
  // -------------------------------------------------------------
  const handleSelectSimpleKey = (newKey: NoteName) => {
    setKey(newKey);
    showFeedback(`Key: ${newKey}로 변경되었습니다`);
    if (activePresetId) {
      const preset = MONEY_CHORDS.find(p => p.id === activePresetId);
      if (preset) {
        const items = buildProgressionFromDegrees(newKey, preset.degrees, 'simple', true);
        setProgression(items);
        if (isPlaying) {
          PlaybackEngine.stop();
          setTimeout(() => {
            startPlayback(items);
          }, 40);
        }
      }
    }
  };

  const handlePlaySimpleCustom = (input: string) => {
    const degrees = input.split('').map(Number);
    if (degrees.length === 0 || degrees.some(d => d < 1 || d > 7)) {
      showFeedback('1~7 숫자로 입력해주세요');
      return;
    }
    if (isPlaying) {
      PlaybackEngine.stop();
      setIsPlaying(false);
    }
    setActivePresetId(null);
    const items = buildProgressionFromDegrees(key, degrees, 'simple_custom', true);
    setProgression(items);
    setSelectedItemIndex(0);
    setPreviewChord({
      root: items[0].root,
      quality: items[0].quality,
      voicingType: items[0].voicingType || 'open'
    });
    setTimeout(() => {
      startPlayback(items);
    }, 40);
  };

  const handlePlaySimplePreset = (preset: MoneyChordPreset) => {
    if (isPlaying) {
      PlaybackEngine.stop();
      setIsPlaying(false);
    }
    setActivePresetId(preset.id);
    const items = buildProgressionFromDegrees(key, preset.degrees, 'simple', true);
    setProgression(items);
    setSelectedItemIndex(0);
    setPreviewChord({
      root: items[0].root,
      quality: items[0].quality,
      voicingType: items[0].voicingType || 'open'
    });
    setTimeout(() => {
      startPlayback(items);
    }, 40);
  };


  // -------------------------------------------------------------
  // Handlers: Transpose & Capo (P6)
  // -------------------------------------------------------------
  const handleTranspose = (semitones: number) => {
    if (isPlaying) handleStop();

    const newKey = transposeNote(key, semitones);
    setKey(newKey);

    setProgression(prev =>
      prev.map(item => {
        const newRoot = transposeNote(item.root, semitones);
        const def = getChordDefinition(newRoot, item.quality, item.voicingType);
        return {
          ...item,
          root: newRoot,
          chordName: def.displayName
        };
      })
    );

    const newPreviewRoot = transposeNote(previewChord.root, semitones);
    setPreviewChord(prev => ({ ...prev, root: newPreviewRoot }));
    showFeedback(`Key: ${newKey} (${semitones > 0 ? `+${semitones}` : semitones}st) 조옮김 완료`);
  };

  // -------------------------------------------------------------
  // Handlers: Save & Share (P4)
  // -------------------------------------------------------------
  const handleSaveCurrentProgression = () => {
    if (progression.length === 0) {
      showFeedback('저장할 진행이 없습니다');
      return;
    }

    const defaultName = `${key}${isMinorKey ? 'm' : ''} ${progression.map(p => p.chordName).join('-')}`;
    const name = window.prompt('진행 이름을 입력하세요:', defaultName) || defaultName;

    const newEntry: StoredProgression = {
      id: `save_${Date.now()}`,
      name,
      updatedAt: Date.now(),
      key,
      isMinorKey,
      items: progression.map(it => ({
        chordName: it.chordName,
        root: it.root,
        quality: it.quality,
        voicingType: it.voicingType
      })),
      bpm,
      rhythmIndex,
      capo
    };

    saveProgressionToLocal(newEntry);
    setSavedList(loadSavedProgressions());
    showFeedback(`'${name}' 진행이 로컬에 저장되었습니다`);
  };

  const handleLoadSavedEntry = (entry: StoredProgression) => {
    if (isPlaying) handleStop();

    setKey(entry.key);
    setIsMinorKey(!!entry.isMinorKey);
    setBpm(entry.bpm);
    setRhythmIndex(entry.rhythmIndex);
    setCapo(entry.capo || 0);

    const items: ProgressionItem[] = entry.items.map((it, idx) => ({
      id: `restored_${Date.now()}_${idx}`,
      chordName: it.chordName,
      root: it.root,
      quality: it.quality,
      voicingType: it.voicingType || 'open'
    }));

    setProgression(items);
    setSelectedItemIndex(0);
    if (items.length > 0) {
      setPreviewChord({
        root: items[0].root,
        quality: items[0].quality,
        voicingType: items[0].voicingType || 'open'
      });
    }

    setShowSavedDrawer(false);
    showFeedback(`'${entry.name}' 진행을 불러왔습니다`);
  };

  const handleDeleteSavedEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSavedProgression(id);
    setSavedList(updated);
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      if (success) {
        showFeedback('공유 링크가 클립보드에 복사되었습니다!');
      } else {
        showFeedback('링크 창의 주소를 직접 복사하세요');
      }
    } catch {
      showFeedback('링크 창의 주소를 직접 복사하세요');
    }
  };

  const handleShareLink = () => {
    const url = buildShareUrl({
      key,
      isMinor: isMinorKey,
      items: progression,
      bpm,
      rhythmIndex,
      capo
    });

    setShareModalUrl(url);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showFeedback('공유 링크가 클립보드에 복사되었습니다!');
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  return (
    <div className="app">
      <main className="card">
        <header>
          <div>
            <h1>CHORDS <small style={{ fontSize: '13px', fontWeight: 600, color: '#1a73e8' }}>V2</small></h1>
            <p>떠오른 코드 진행을 5초 안에 기타로 확인하기</p>
          </div>
          <div className="util-bar">
            <button className="util-btn" onClick={handleSaveCurrentProgression} title="진행 로컬 저장">
              💾 저장
            </button>
            <button className="util-btn" onClick={() => setShowSavedDrawer(v => !v)} title="저장된 진행 목록">
              📂 목록 ({savedList.length})
            </button>
            <button className="util-btn" onClick={handleShareLink} title="링크로 공유">
              🔗 공유
            </button>
          </div>
        </header>

        {/* Audio Status & Feedback Toast */}
        <div style={{
          background: '#f9f9fb',
          border: '1px solid #e1e4ea',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '14px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {sampleStats.loaded >= sampleStats.total ? (
              <strong style={{ color: '#2e7d32' }}>🎸 마틴 어쿠스틱 엔진 준비됨</strong>
            ) : (
              <span style={{ color: '#e65100' }}>⏳ 어쿠스틱 샘플 로딩 중 ({sampleStats.loaded}/{sampleStats.total})</span>
            )}
            {feedbackMsg && <strong style={{ marginLeft: 8, color: '#111' }}>· {feedbackMsg}</strong>}
          </span>
          <button
            onClick={() => {
              audioContextManager.unlockSync();
              GuitarSoundEngine.playTestNote();
            }}
            style={{
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            🔊 사운드 테스트
          </button>
        </div>

        {/* Saved Progressions Drawer / Modal */}
        {showSavedDrawer && (
          <div style={{
            background: '#fff',
            border: '1.5px solid #111',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>저장된 진행 목록 ({savedList.length})</strong>
              <button
                onClick={() => setShowSavedDrawer(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            {savedList.length === 0 ? (
              <div style={{ color: '#888', fontSize: '12px', padding: '12px 0', textAlign: 'center' }}>
                저장된 코드 진행이 없습니다. [💾 저장] 버튼으로 현재 진행을 저장하세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {savedList.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => handleLoadSavedEntry(entry)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: '#f9f9fb',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px' }}>{entry.name}</strong>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {entry.items.map(it => it.chordName).join(' - ')} | {entry.bpm} BPM | {entry.capo ? `Capo ${entry.capo}` : 'No Capo'}
                      </div>
                    </div>
                    <button
                      onClick={e => handleDeleteSavedEntry(e, entry.id)}
                      style={{ border: 'none', background: '#fee', color: '#c00', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Link Modal (P4) */}
        {shareModalUrl && (
          <div style={{
            background: '#fff',
            border: '2px solid #1a73e8',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(26, 115, 232, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#1a73e8' }}>🔗 코드 진행 공유 링크</strong>
              <button
                onClick={() => setShareModalUrl(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 8px' }}>
              아래 링크를 복사하면 현재 Key, 진행, BPM, 리듬, 카포 상태가 그대로 열립니다:
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                readOnly
                value={shareModalUrl}
                onClick={e => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '12px',
                  background: '#f9f9fb',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={() => {
                  fallbackCopy(shareModalUrl);
                  showFeedback('링크가 복사되었습니다!');
                }}
                style={{
                  background: '#1a73e8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                복사
              </button>
            </div>
          </div>
        )}

        {appMode === 'simple' ? (
          <SimpleModeView
            currentKey={key}
            onSelectKey={handleSelectSimpleKey}
            isPlaying={isPlaying}
            currentPlayingIndex={playbackPos.currentIndex}
            currentChord={playbackPos.currentChord}
            nextChord={playbackPos.nextChord}
            beat={playbackPos.beat}
            bpm={bpm}
            isLooping={isLooping}
            onToggleLoop={handleToggleLoop}
            onPlayPreset={handlePlaySimplePreset}
            onPlayCustomDegrees={handlePlaySimpleCustom}
            onStop={handleStop}
            activePresetId={activePresetId}
          />
        ) : (
          <>
            {/* 1. KEY SELECTION & SCALE MODE */}
            <section>
          <h2>
            <span>KEY</span>
            <div className="mode-toggle-group">
              <button className={!isMinorKey ? 'active' : ''} onClick={() => setIsMinorKey(false)}>Major</button>
              <button className={isMinorKey ? 'active' : ''} onClick={() => setIsMinorKey(true)}>Minor</button>
            </div>
          </h2>
          <div className="key-grid">
            {KEYS.map(note => (
              <button
                key={note}
                className={key === note ? 'selected' : ''}
                onClick={() => {
                  setKey(note);
                  showFeedback(`Key: ${note}${isMinorKey ? 'm' : ''}`);
                }}
              >
                {note}
              </button>
            ))}
          </div>
        </section>

        {/* 2. DIATONIC CHORDS & EXTENDED CHORDS (P5) */}
        <section>
          <h2>
            <span>DIATONIC CHORDS ({key}{isMinorKey ? ' Minor' : ' Major'})</span>
            <span style={{ fontSize: '10px', color: '#888' }}>클릭하여 바로 연주 & 선택</span>
          </h2>
          <div className="chord-grid">
            {diatonicChords.map(info => {
              const isSelected = previewChord.root === info.root && previewChord.quality === info.quality;
              return (
                <button
                  key={`${info.degree}_${info.chordName}`}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => handleSelectDiatonic(info)}
                >
                  <span className="degree">{info.degree}</span>
                  <strong>{info.chordName}</strong>
                </button>
              );
            })}
          </div>

          {/* Extended Chord Qualities */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: '#666', fontWeight: 700, marginBottom: '4px' }}>
              코드 종류 확장 ({previewChord.root}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {EXTENDED_QUALITIES.map(q => {
                const isActive = previewChord.quality === q.value;
                return (
                  <button
                    key={q.value}
                    onClick={() => handleSelectQuality(q.value)}
                    style={{
                      padding: '5px 0',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: isActive ? '1.5px solid #111' : '1px solid #ddd',
                      background: isActive ? '#111' : '#fff',
                      color: isActive ? '#fff' : '#333',
                      cursor: 'pointer'
                    }}
                  >
                    {previewChord.root}{q.label === 'Maj' ? '' : q.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. PROGRESSION EDITOR (P1) */}
        <section>
          <h2>
            <span>MY PROGRESSION ({progression.length}개)</span>
            <button
              onClick={handleClearProgression}
              style={{ border: 'none', background: 'transparent', color: '#d32f2f', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              전체 초기화
            </button>
          </h2>

          <div className="progression-editor-box">
            <div className="progression-chips-wrap">
              {progression.length === 0 ? (
                <span className="placeholder">위에서 코드를 선택한 뒤 [+ 코드 추가]를 누르세요</span>
              ) : (
                progression.map((item, idx) => {
                  const isCurPlaying = playbackPos.currentIndex === idx;
                  const isSelected = selectedItemIndex === idx;
                  return (
                    <div
                      key={item.id}
                      className={`prog-chip ${isCurPlaying ? 'playing' : ''}`}
                      style={{
                        borderColor: isSelected && !isCurPlaying ? '#1a73e8' : undefined,
                        boxShadow: isSelected && !isCurPlaying ? '0 0 0 2px #1a73e8' : undefined
                      }}
                      onClick={() => handleSelectProgressionItem(idx)}
                    >
                      <span>{item.chordName}</span>
                      {item.voicingType && item.voicingType !== 'open' && (
                        <span className="chip-voicing">({item.voicingType[0].toUpperCase()})</span>
                      )}
                      <button
                        className="chip-del"
                        onClick={e => handleDeleteItem(e, item.id)}
                        title="이 코드 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="progression-actions">
              <button className="btn-editor-action btn-add-chord" onClick={handleAddCurrentChord}>
                + 현재 선택 코드({currentPreviewDefinition.displayName}) 추가
              </button>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn-editor-action"
                  onClick={() => handleTranspose(-1)}
                  title="반음 내림"
                >
                  ♭ -1
                </button>
                <button
                  className="btn-editor-action"
                  onClick={() => handleTranspose(1)}
                  title="반음 올림"
                >
                  ♯ +1
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PLAYBACK UX & TRANSPORT (P1 / P2) */}
        <section>
          {/* NOW / NEXT & Beat Pulse Banner */}
          <div className="now-next-box">
            <div className="now-group">
              <span className="now-label">NOW PLAYING</span>
              <span className="now-chord">
                {isPlaying && playbackPos.currentChord ? playbackPos.currentChord : '-'}
              </span>
            </div>

            {/* 4/4 Beat Pulse Dots */}
            <div className="beat-indicator-wrap">
              {[0, 1, 2, 3].map(b => (
                <div
                  key={b}
                  className={`beat-dot ${isPlaying && playbackPos.beat === b ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="next-group">
              <span className="next-label">NEXT</span>
              <span className="next-chord">
                {isPlaying && playbackPos.nextChord ? playbackPos.nextChord : isPlaying && isLooping && progression[0] ? progression[0].chordName : '-'}
              </span>
            </div>
          </div>

          {/* Transport Buttons: Play, Stop, Loop */}
          <div className="transport-container">
            <button
              className={`btn-play ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlay}
              disabled={progression.length === 0}
            >
              {isPlaying ? '● PLAYING' : '▶ PLAY'}
            </button>
            <button className="btn-stop" onClick={handleStop} disabled={!isPlaying}>
              ■ STOP
            </button>
            <button
              className={`btn-loop ${isLooping ? 'active' : ''}`}
              onClick={handleToggleLoop}
            >
              🔁 LOOP {isLooping ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* 5. GUITAR VOICING & FRETBOARD (P3) */}
        <section>
          <h2>
            <span>GUITAR VOICING ({currentPreviewDefinition.displayName})</span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              {capo > 0 ? `Capo ${capo}fr 적용 중` : 'No Capo'}
            </span>
          </h2>

          {/* Voicing Switcher Chips (Open, Barre, Alternative) */}
          <div className="voicing-selector-bar">
            {availableVoicings.map(opt => {
              const isActive = previewChord.voicingType === opt.type;
              return (
                <button
                  key={opt.type}
                  className={`voicing-chip ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectVoicing(opt.type)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <Fretboard
            voicing={currentPreviewDefinition.primaryVoicing}
            chordName={currentPreviewDefinition.displayName}
            onPlayString={(strIdx, fret) => {
              audioContextManager.unlockSync();
              GuitarSoundEngine.playString(strIdx, fret + capo);
            }}
          />
        </section>

        {/* 6. RHYTHM, BPM & CAPO */}
        <section>
          <h2>RHYTHM</h2>
          <div className="rhythm-grid">
            {RHYTHMS.map((item, index) => (
              <button
                key={item.label}
                className={rhythmIndex === index ? 'selected' : ''}
                onClick={() => setRhythmIndex(index)}
              >
                {item.label}
                <small>{item.pattern.map(x => (x === 'down' ? '↓' : x === 'up' ? '↑' : '·')).join(' ')}</small>
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <h2>BPM</h2>
            <div className="tempo-control">
              <button onClick={() => setBpm(v => Math.max(50, v - 5))}>−</button>
              <strong>{bpm}</strong>
              <button onClick={() => setBpm(v => Math.min(180, v + 5))}>+</button>
            </div>
          </div>
          <div>
            <h2>CAPO</h2>
            <div className="tempo-control">
              <button onClick={() => setCapo(c => Math.max(0, c - 1))}>−</button>
              <strong>{capo === 0 ? 'None' : `${capo}fr`}</strong>
              <button onClick={() => setCapo(c => Math.min(7, c + 1))}>+</button>
            </div>
          </div>
        </section>

        {/* 7. PRESET PROGRESSIONS */}
        <section>
          <h2>PRESET PROGRESSIONS (원터치 로드 & 연주)</h2>
          <div className="progression-grid">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                className="btn-preset"
                onClick={() => handleLoadPreset(preset.degrees)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* 8. DIAGNOSTIC & BENCHMARK (A/B) */}
        <section style={{
          background: '#f4f5f8',
          border: '1px solid #dde1e9',
          borderRadius: '10px',
          padding: '12px',
          marginTop: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#333' }}>
              🔍 코드 매핑 진단 & M9 셀렉터 A/B
            </span>
            <button
              onClick={() => setShowDiagnostic(v => !v)}
              style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
            >
              {showDiagnostic ? '접기 ▲' : '펼치기 ▼'}
            </button>
          </div>

          {showDiagnostic && (
            <div style={{ marginTop: '10px' }}>
              {activeDiagnostic && (
                <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 'bold' }}>
                    <span>코드: <strong>{activeDiagnostic.chordName}</strong></span>
                    <span>평균 시프트: <strong>{activeDiagnostic.averagePitchShift}st</strong> (최대: {activeDiagnostic.maxPitchShift}st)</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ddd', color: '#666' }}>
                        <th style={{ padding: '3px' }}>줄</th>
                        <th style={{ padding: '3px' }}>프렛</th>
                        <th style={{ padding: '3px' }}>타겟음</th>
                        <th style={{ padding: '3px' }}>매핑 샘플</th>
                        <th style={{ padding: '3px' }}>시프트</th>
                        <th style={{ padding: '3px' }}>선택 사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDiagnostic.strings.map(s => (
                        <tr key={s.stringNumber} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: '4px' }}>{s.stringNumber}번줄</td>
                          <td style={{ padding: '4px' }}>{s.fret < 0 ? 'X' : s.fret}</td>
                          <td style={{ padding: '4px', fontWeight: 'bold' }}>{s.targetNote}</td>
                          <td style={{ padding: '4px', color: '#555' }}>
                            {s.fret < 0 ? '-' : s.sampleFile.replace(/^MartinGM2_\d+_/, '').replace(/_1\.wav$/, '')}
                          </td>
                          <td style={{ padding: '4px', fontWeight: 'bold', color: s.pitchShiftSemitones === 0 ? '#2e7d32' : '#e65100' }}>
                            {s.fret < 0 ? 'Mute' : s.pitchShiftSemitones === 0 ? '원음 (0st)' : `${s.pitchShiftSemitones > 0 ? '+' : ''}${s.pitchShiftSemitones}st`}
                          </td>
                          <td style={{ padding: '4px', fontSize: '10px', color: '#666' }}>{s.selectionReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
