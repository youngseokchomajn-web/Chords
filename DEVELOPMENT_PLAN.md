# CHORDS 개발계획

> 기준일: 2026-10-03
>
> 제품 목표: **떠오른 코드 진행을 5초 안에 기타로 들어보는 도구**
>
> 핵심 원칙은 기능을 많이 넣는 것이 아니라, 코드 선택 → 기타 소리 → 진행 확인까지의 흐름을 최대한 빠르고 자연스럽게 만드는 것이다.

---

## 0. 현재 상태

현재 구현되어 있는 핵심 기능:

- Major Key 선택
- Key에 따른 다이아토닉 코드 표시
- 대표 숫자 코드 진행 선택
- 코드 하나 즉시 기타 스트럼 재생
- 선택한 진행 순차 재생
- BPM 조절
- 기본 스트럼 리듬 선택
- 재생 중 현재 코드 강조
- 실제 기타 샘플 기반 재생
- 모바일 Web Audio 초기화 / 샘플 preload
- GitHub Pages 자동 배포
- diminished chord 보이싱 처리 및 7도 디미니쉬 재생 오류 수정

현재 단계는 **MVP 1차 상태**로 본다. 이미 preset progression 재생, BPM, 5개 리듬, 현재 코드 표시, 실제 기타 샘플 재생까지 구현되어 있다. 아직 부족한 핵심은 사용자가 직접 진행을 만드는 편집 기능과 재생을 제어하는 transport/loop UX다.

---

# 1. 개발 우선순위

앞으로는 다음 순서로 개발한다.

| 우선순위 | 단계 | 목표 |
|---|---|---|
| P0 | 현재 MVP 안정화 | 현재 구현 검증 + 오디오/재생 버그 제거 |
| P1 | 진행 편집 + Transport | 직접 코드 추가/삭제/초기화 + Stop/Loop |
| P2 | 재생 UX | 현재/다음 코드, 박자감, 리듬 완성도 개선 |
| P3 | 기타 보이싱 | 같은 코드의 다른 운지를 선택하고 들을 수 있게 함 |
| P4 | 저장/공유 | 진행을 다시 사용하고 링크로 공유 |
| P5 | 음악 이론 확장 | Minor Key와 확장 코드 |
| P6 | 선택적 확장 | Capo, transpose, export 등 검증된 수요만 추가 |

**AI 작곡, 로그인, 서버, 소셜 기능은 당분간 개발하지 않는다.**

---

# 2. P0 — 현재 MVP 안정화

## 목표

현재 기능을 실제 휴대폰에서 반복해서 사용해도 불편하지 않은 상태로 만든다.

### 검증 시나리오

### 시나리오 A

`C Key → 1-5-6-4 → C-G-Am-F → Play`

### 시나리오 B

`D Key → 1-5-6-4 → D-A-Bm-G → Play`

### 시나리오 C

`G Key → 1-5-6-4 → G-D-Em-C → Play`

### 시나리오 D

단일 코드:

`C → G → Am → F`

각 코드를 직접 눌러 실제 기타 소리를 확인한다.

### 확인 항목

- 첫 터치에서 소리가 나는가
- 샘플 준비 전/후 UI가 혼란스럽지 않은가
- 빠르게 다른 코드를 눌러도 재생이 꼬이지 않는가
- 진행 재생 중 현재 코드 표시가 정확한가
- BPM 변경 후 실제 간격이 바뀌는가
- 리듬 패턴 변경이 실제 소리에 반영되는가
- iPhone Safari에서 정상 작동하는가
- 320px 수준의 좁은 화면에서도 UI가 깨지지 않는가

### 완료 기준

**설명 없이 처음 사용해도 5초 안에 코드 진행을 들을 수 있어야 한다.**

---

# 3. P1 — 진행 직접 편집

현재는 미리 정의된 progression을 선택할 수 있고, 이미 선택한 progression을 다시 재생할 수도 있다. 다음 단계는 **사용자가 직접 progression을 만드는 것**이다.

다음 단계에서는 사용자가 직접:

`C → G → Am → F`

를 만들 수 있게 한다.

## 3-1. 가장 단순한 편집 방식

처음부터 드래그앤드롭을 만들지 않는다.

예:

```
CURRENT

[C] [G] [Am] [F]

[ + 코드 추가 ]
```

코드를 선택하면 현재 진행의 마지막에 추가한다.

### 필요한 기능

- 코드 추가
- 마지막 코드 삭제
- 전체 초기화
- 순서 확인
- 선택한 코드 다시 듣기

## 3-2. 이후 편집

사용성이 확인되면:

- 특정 코드 삭제
- 특정 위치에 코드 추가
- 코드 순서 변경
- 동일 코드 반복

을 추가한다.

### 3-3. Transport를 같은 단계에서 처리

진행 편집과 함께 재생 제어를 완성한다.

- Stop 버튼
- Loop on/off
- 재생 중 Play 버튼 상태 명확화
- 진행을 편집하면 현재 재생을 안전하게 중단
- Loop에서 마지막 코드 → 첫 코드 전환이 끊기지 않게 처리

**이유:** 직접 만든 progression을 만들었는데 Stop/Loop가 별도 단계로 밀리면 핵심 사용 흐름이 반쪽짜리로 남는다.

### 완료 기준

사용자가 미리 정의된 progression을 선택하지 않고도 원하는 진행을 직접 만들고, Play/Stop/Loop로 반복해서 들을 수 있다.

---

# 4. P2 — 재생 경험 개선

현재의 기본 스트럼/BPM 기능을 실제 음악처럼 사용할 수 있도록 개선한다.

## 4-1. 재생 컨트롤

필수:

- Play
- Stop
- Loop
- 현재 재생 위치
- 현재/다음 코드 표시

P1에서 기본 Stop/Loop를 먼저 넣고, P2에서는 시각적/음악적 완성도를 높인다.

예:

```
C       G       Am      F
●       ○       ○       ○

             [ STOP ] [ LOOP ]
```

## 4-2. BPM

현재 BPM 조절을 유지하면서:

- 최소/최대 범위 검토
- 숫자 직접 입력
- 가능하면 Tap Tempo

를 검토한다.

## 4-3. 리듬

현재 리듬 패턴을 기반으로:

- 4 beat
- 8 beat
- 8 beat 변형
- Down / Up
- Rest

를 유지한다.

이후 필요성이 확인되면:

- 16 beat
- 뮤트
- 아르페지오
- 셔플/스윙

을 추가한다.

### 중요한 원칙

리듬 패턴 수를 무작정 늘리지 않는다.

**실제로 자주 사용하는 패턴 몇 개가 정확하게 들리는 것이 더 중요하다.**

## 완료 기준

같은 진행을 Loop로 계속 들으면서 BPM과 리듬을 바꿔볼 수 있다.

---

# 5. P3 — 기타 보이싱

현재는 코드마다 기본 보이싱 하나를 사용한다.

다음 목표는:

> 같은 C 코드라도 어떤 기타 운지로 연주하느냐에 따라 소리가 달라진다는 것을 직접 비교할 수 있게 하는 것.

## 5-1. 보이싱 구조

예:

```
C

Open
CAGED
Barre
Alternative
```

각 보이싱에는:

- 기타 지판 표시
- 실제 frets
- 실제 재생 음
- 선택 상태

를 연결한다.

## 5-2. 우선순위

처음부터 모든 fretboard를 생성하지 않는다.

우선:

- Open
- 기본 Barre
- 현재 엔진에서 검증된 대체 voicing

정도부터 시작한다.

## 5-3. 중요한 검증

모든 자동 생성 voicing은:

- chord interval 검사
- root 포함 여부
- mute 처리
- 실제 기타 음 확인

을 통과해야 한다.

특히 diminished, 7th, sus 계열은 자동 생성 결과를 반드시 검증한다.

### 완료 기준

사용자가 같은 코드의 다른 운지를 선택하고 **화면의 운지와 실제 소리가 일치하는 것을 확인할 수 있다.**

---

# 6. P4 — 저장 / 공유

핵심 사용성이 확인된 이후 추가한다.

## 6-1. 저장

로그인/서버 없이 먼저 구현한다.

브라우저 로컬 저장:

- progression
- key
- BPM
- rhythm
- voicing

## 6-2. 공유

가장 먼저 URL 기반 공유를 검토한다.

예:

`/Chords/?key=C&progression=1-5-6-4&bpm=90`

또는 코드 이름 기반:

`C-G-Am-F`

서버 없이 링크만으로 같은 진행을 열 수 있는 구조를 우선 검토한다.

## 완료 기준

사용자가 만든 진행을 새로 입력하지 않고 다시 열거나 다른 사람에게 보낼 수 있다.

---

# 7. P5 — 음악 이론 확장

기본 Major Key가 충분히 안정된 뒤 확장한다.

## 7-1. Minor Key

우선 Natural Minor.

예:

`A minor → Am Bdim C Dm Em F G`

이후 Harmonic / Melodic Minor는 실제 사용 필요성을 보고 결정한다.

## 7-2. 확장 코드

현재 구조에 이미 일부 ChordQuality가 존재하므로 UI와 보이싱 검증이 완료된 뒤 단계적으로 노출한다.

순서:

1. 7
2. maj7
3. m7
4. sus2
5. sus4
6. add9
7. m7b5
8. dim
9. aug

모든 코드를 한 번에 노출하지 않는다.

## 7-3. 숫자 진행

현재:

`1-5-6-4`

를 중심으로 다음을 검토한다.

- Roman numeral
- Nashville Number
- 실제 코드명

단, 표기 방식이 사용성을 높이지 않는다면 추가하지 않는다.

---

# 8. P6 — 제품 확장 후보

P0~P5를 실제 사용하면서 필요성이 확인된 기능만 선택한다.

후보:

- Capo
- Alternate tuning
- 메트로놈
- 카운트인
- 아르페지오
- MIDI export
- Audio export
- 코드 진행 이미지 export
- 키 변환
- 진행 transpose
- 곡 section
- A/B progression 비교

### 개발 보류

다음 기능은 당분간 우선순위에서 제외한다.

- AI 코드 추천
- AI 작곡
- 자동 편곡
- 드럼/베이스 등 멀티트랙
- 계정 시스템
- 클라우드 동기화
- 소셜 기능
- 커뮤니티
- 광고

제품의 핵심 경험이 검증되기 전에는 이런 기능들이 오히려 앱을 복잡하게 만들 가능성이 크다.

---

# 9. 기술 구조 개선 계획

기능이 늘어날수록 App.tsx 하나에 모든 로직을 넣지 않는다.

현재 기능을 유지하면서 점진적으로 분리한다.

권장 구조:

```
src/
  App.tsx

  theory/
    notes.ts
    chordBuilder.ts
    progressions.ts

  audio/
    audioContext.ts
    guitarSynth.ts
    sampleSelector.ts
    playbackEngine.ts

  components/
    KeySelector.tsx
    ChordGrid.tsx
    ProgressionEditor.tsx
    PlaybackControls.tsx
    RhythmSelector.tsx
    TempoControl.tsx
    CurrentProgression.tsx
    Fretboard.tsx

  types/
    music.ts
    audio.ts
    playback.ts
```

## 핵심 원칙

### 음악 이론

UI와 분리한다.

### 오디오

재생 스케줄링과 실제 기타 샘플 재생을 분리한다.

### UI

버튼/상태 표시를 담당하고 음악 계산을 직접 하지 않는다.

### 상태

필요한 상태만 유지한다.

예:

```
key
progression
selectedChord
currentIndex
isPlaying
isLooping
bpm
rhythm
voicing
```

---

# 10. 오디오 엔진 개발 계획

실제 기타 샘플이 현재 제품의 중요한 차별점이므로 기능 추가보다 음질 안정성을 우선한다.

## 우선순위

1. 샘플 선택 정확도
2. 스트럼 타이밍
3. velocity
4. string별 volume
5. chord transition
6. 샘플 pitch shift 범위
7. sustain / release
8. 동시 음성 수 관리

## 특히 확인할 것

- 너무 높은 fret에서 pitch shifting이 부자연스럽지 않은가
- 같은 chord를 반복할 때 기계적으로 들리지 않는가
- down/up 차이가 자연스러운가
- chord transition에서 음이 잘리지 않는가
- 빠른 BPM에서 음이 겹치며 지나치게 커지지 않는가

음질 문제가 발견되면 새로운 기능보다 먼저 해결한다.

---

# 11. 테스트 계획

## Theory Test

모든 Major Key:

`C D E F G A B`

각각 I~vii° 확인.

특히:

- C → Bdim
- D → C#dim
- E → D#dim
- F → Edim
- G → F#dim
- A → G#dim
- B → A#dim

을 실제 소리와 함께 검증한다.

## Audio Test

- 단일 chord
- progression
- 빠른 클릭
- stop
- loop
- BPM 변경
- rhythm 변경
- voicing 변경

## Mobile Test

최소:

- iPhone Safari
- iPhone Chrome
- Android Chrome
- Desktop Chrome

## Responsive Test

최소 폭:

- 320px
- 375px
- 390px
- 430px

---

# 12. 개발 단위

한 번에 큰 기능을 만들지 않는다.

각 기능은 다음 순서로 개발한다.

```
1. 요구사항 정의
2. UI 최소 구현
3. 음악/오디오 로직 구현
4. 실제 소리 확인
5. 모바일 확인
6. 빌드
7. Git commit
8. GitHub Pages 배포
9. 실제 사용
10. 다음 기능 결정
```

기능 하나가 완전히 동작한 뒤 다음 기능으로 넘어간다.

---

# 13. Git 커밋 원칙

커밋은 기능 단위로 남긴다.

예:

```
feat: add custom progression editor
feat: add loop playback
feat: add chord voicing selector
feat: add local progression save
fix: correct diminished chord voicing
fix: improve guitar sample selection
refactor: extract playback engine
```

배포를 위한 의미 없는 변경은 가급적 만들지 않는다.

---

# 14. 최종 제품 형태

최종적으로 목표하는 사용 흐름:

```
앱 실행
  ↓
Key 선택
  ↓
코드 선택
  ↓
+ 코드 추가
  ↓
C → G → Am → F
  ↓
리듬 선택
  ↓
BPM 선택
  ↓
▶ Play
  ↓
기타 실제 스트럼
  ↓
현재 코드 / 다음 코드 표시
  ↓
Loop
```

그리고 사용자가 원하면:

```
코드 선택
  ↓
Voicing 변경
  ↓
다른 기타 운지 비교
  ↓
다시 재생
```

---

# 15. 최종 완료 기준

이 프로젝트의 완료 기준은 기능 개수가 아니다.

다음 질문에 **예**라고 답할 수 있으면 핵심 제품은 완성된 것으로 본다.

> 기타를 치다가 코드 진행이 떠올랐을 때,
> 이 앱을 열고 5초 안에 그 진행을 기타로 들어볼 수 있는가?

그리고:

- 직접 진행을 만들 수 있는가
- 원하는 리듬으로 반복해서 들을 수 있는가
- 현재 코드가 무엇인지 바로 알 수 있는가
- 다른 기타 보이싱을 비교할 수 있는가
- 만든 진행을 다시 사용할 수 있는가

까지 자연스럽게 연결되면 1차 제품 개발을 종료한다.

---

# 16. 바로 다음 개발

현재 상태에서 다음 작업은 **P1 진행 직접 편집 + Stop/Loop**다.

구체적으로:

1. progression 데이터를 `degree[]` 기반 편집 가능한 상태로 정리
2. 코드 선택 → 마지막에 추가
3. 코드별 삭제
4. 전체 초기화
5. 순서 변경은 처음부터 드래그앤드롭 대신 단순한 방식으로 검증
6. Stop 추가
7. Loop 추가
8. 직접 만든 progression도 preset과 동일한 playback engine 사용
9. 모바일 UI 검증
10. 빌드 / 배포

그 다음은:

**Playback UX 개선 → Voicing 선택 → Save/Share**

순서로 진행한다.

---

## 개발 원칙 한 줄

> **기능을 추가하는 것보다, 떠오른 진행을 가장 빨리 기타로 확인하는 경험을 계속 개선한다.**


---

# 17. 이번 재검토에서 정리한 사항

기존 계획에는 현재 구현보다 늦은 내용이 일부 섞여 있었다.

### 이미 구현된 것

- preset progression playback
- BPM
- 5개 기본 rhythm
- 재생 중 현재 코드 강조
- 실제 기타 샘플 playback
- Major Key별 diatonic chord mapping
- diminished voicing 수정
- GitHub Pages 자동 배포

따라서 이것들을 다시 P1/P2의 신규 개발 항목으로 취급하지 않는다.

### 아직 실제로 남은 핵심

1. **사용자 직접 progression 편집**
2. **Stop**
3. **Loop**
4. 재생 중 다음 코드/박자 표시 개선
5. 보이싱 선택
6. 저장/공유

### 우선순위 재조정

유사 도구들을 다시 확인한 결과, progression을 만들고, tempo/rhythm을 조절하고, 현재 코드를 따라가며, voicing을 선택하는 흐름이 반복적으로 핵심 UX로 사용된다. 따라서 CHORDS도 기능 수를 늘리기보다 이 흐름을 먼저 완성한다. citeturn0search0turn0search1turn0search3turn0search10

특히 **보이싱 최적화나 AI 추천을 먼저 넣지 않는다.** 현재 CHORDS의 차별점은 복잡한 기타 이론 엔진이 아니라 빠른 청취 경험이므로, 직접 progression을 만들고 반복 재생하는 경험이 먼저다.

### 1차 제품 목표

`Key → 코드 선택 → 직접 progression 구성 → Play → Loop`

이 흐름이 모바일에서 자연스럽게 동작하면 그때 보이싱/저장/공유로 넘어간다.
