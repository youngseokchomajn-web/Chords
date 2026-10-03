# 🎸 Chords

기타 작곡을 위한 초간단 코드 / 코드 진행 소리 확인 툴.

> **핵심 개발 원칙**: 복잡한 작곡 앱을 만드는 것이 아니라, 떠오른 코드 진행을 5초 안에 기타로 들어보는 도구를 만든다.

---

## 🚀 빠른 시작 (로컬 개발 환경)

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (기본 포트: 5173)
npm run dev

# 프로덕션 빌드 & 타입 체크
npm run build
```

## 📂 프로젝트 구조
- `src/types/`: 음악 이론(`music.ts`) 및 오디오 엔진(`audio.ts`) 타입 정의
- `src/theory/`: 12반음 주파수/인터벌 연산(`notes.ts`) 및 코드/운지 매핑(`chordBuilder.ts`)
- `src/audio/`: 모바일 WebKit AudioContext 잠금 해제 싱글톤(`audioContext.ts`) 및 Web Audio API 기타 신디사이저(`guitarSynth.ts`)
- `src/components/`: SVG 기반 6줄 인터랙티브 지판(`Fretboard.tsx`)
- `src/App.tsx`: 단일 화면(Single-page) 반응형 UI
- `src/main.tsx` & `index.html`: Vite + React 웹 애플리케이션 진입점

---

## 1. 프로젝트 방향
DAW나 복잡한 작곡 프로그램이 목적이 아니다.

> 코드나 코드 진행을 직관적으로 고르고, 바로 기타로 들을 수 있게 한다.

예:
- C를 누르면 C 코드 소리
- D를 누르면 D 코드 소리
- 1-5-6-4를 누르면 C key에서 C-G-Am-F를 바로 재생
- Key를 바꾸면 같은 숫자 진행을 다른 코드로 즉시 확인

## 2. UX 원칙
- 설명 없이 바로 사용할 수 있어야 함
- 버튼을 보고 기능을 바로 이해할 수 있어야 함
- 모바일 우선
- 코드 선택 → 즉시 재생
- 숫자 진행 선택 → 즉시 재생
- 기능을 과하게 넣지 않음

초기에는 DAW 기능, AI 작곡, 자동 편곡, 악보 편집, 복잡한 기타 학습 기능을 넣지 않는다.

## 3. 화면 구성

### 단일 화면 / 모바일 우선

```
CHORDS

KEY
[C] [D] [E] [F] [G] [A] [B]

CHORD
[C] [Dm] [Em] [F] [G] [Am] [Bdim]

PROGRESSION
[1-5-6-4] [6-4-1-5]
[1-4-5]   [1-6-4-5]
[1-5-4]   [6-5-4-5]

CURRENT
C  -  G  -  Am  -  F

             ▶
```

- Key는 상단 고정
- 현재 Key에 맞는 다이아토닉 코드를 자동 표시
- 진행 버튼을 누르면 해당 진행을 현재 Key로 변환
- Current 영역에는 실제 코드명을 표시
- 코드 버튼을 누르면 해당 코드만 즉시 재생
- 진행 버튼을 누르면 진행 전체를 즉시 재생
- 재생 중에는 현재 코드가 강조됨
- 초기 버전에는 별도의 설정 화면을 만들지 않음

## 4. 개발 단계

### Phase 0 — 현재 MVP 안정화

현재 구현된 핵심 기능을 깨지 않게 유지하면서 실제 모바일 사용성을 검증한다.

현재 구현:
- Major Key / diatonic chord
- preset progression
- 실제 기타 샘플 playback
- BPM
- 5개 기본 rhythm
- 재생 중 현재 chord 표시
- GitHub Pages 자동 배포

검증 기준:
- C / D / G Key에서 대표 progression 정상 재생
- diminished 포함 7개 diatonic chord 정상 재생
- iPhone Safari / Chrome에서 첫 터치부터 소리
- 빠른 입력에도 재생 상태가 꼬이지 않음
- 320px 이상 화면에서 UI가 깨지지 않음

### Phase 1 — 직접 진행 편집 + Transport

목표: 미리 정해진 progression이 아니라 사용자가 직접 원하는 진행을 만든다.

예:
```
[C] [G] [Am] [F]
[+ 코드]
```

필수:
- 코드 추가
- 개별 코드 삭제
- 전체 초기화
- 현재 순서 표시
- 직접 만든 progression Play
- Stop
- Loop on/off

처음에는 드래그앤드롭을 만들지 않는다. 모바일에서 단순한 추가/삭제 방식부터 검증한다.

완료 기준:
> 원하는 코드를 직접 조합하고 Play/Stop/Loop로 반복해서 들을 수 있다.

### Phase 2 — 재생 UX 완성

현재 기능을 음악적으로 더 자연스럽게 만든다.

- 현재 / 다음 코드 표시
- 박자 진행 표시
- Loop 경계 자연스럽게 연결
- BPM 조절 UX 개선
- 기본 rhythm 품질 개선
- 필요한 경우 Tap Tempo
- 필요한 경우 count-in

리듬 종류를 무작정 늘리지 않는다.

### Phase 3 — 기타 보이싱

- Open / Barre / Alternative voicing
- chord diagram / fretboard
- 보이싱별 실제 기타 playback
- progression 안에서 chord별 voicing 선택

자동 생성 보이싱은 interval / root / mute / 실제 음을 검증한다.

### Phase 4 — 저장 / 공유

서버 없이 먼저 구현한다.

- local save
- progression 불러오기
- URL 기반 progression 공유
- key / BPM / rhythm도 공유 데이터에 포함

### Phase 5 — 음악 이론 확장

필요성이 확인된 뒤:
- Minor Key
- 7 / maj7 / m7
- sus2 / sus4
- add9
- m7b5 / dim / aug
- transpose

### Phase 6 — 선택적 확장

수요가 확인된 경우에만:
- Capo
- alternate tuning
- metronome
- count-in
- arpeggio
- MIDI / audio export
- progression image export

당분간 개발하지 않음:
- AI 작곡
- AI 코드 추천
- 로그인 / 서버 / DB
- 소셜 / 커뮤니티
- 멀티트랙 / DAW 기능
- 광고

## 6. 코드 구조 계획

예상 구조:

```
src/
  main.js
  style.css

  music/
    keys.js
    scales.js
    chords.js
    progressions.js

  audio/
    AudioEngine.js
    GuitarSynth.js
    strum.js

  ui/
    KeySelector.js
    ChordGrid.js
    ProgressionGrid.js
    CurrentProgression.js
    PlaybackState.js
```

원칙:
- 음악 이론 로직과 UI를 분리
- Audio Engine과 UI를 분리
- 나중에 합성음을 샘플 기반 기타 사운드로 교체해도 UI 코드는 최대한 유지
- 상태는 최소화
- 서버/DB는 필요해질 때까지 만들지 않음

## 7. 핵심 상태

최소 상태만 유지한다.

```
key
selectedChord
currentProgression
isPlaying
currentIndex
bpm
```

P0에서는 bpm도 고정값으로 처리할 수 있다.

## 8. 테스트 계획

### 음악 로직
- 모든 Major Key의 I~vii° 생성
- 모든 대표 진행의 변환
- enharmonic 표기 문제 확인

### Audio
- 단일 chord 재생
- progression 재생
- 연속 클릭
- 빠른 재생 요청
- stop / restart

### 모바일
- iOS Safari
- iOS Chrome
- Android Chrome
- 터치 영역
- 화면 폭 320px 이상

### UX
- 처음 접한 사람이 설명 없이 사용 가능한지
- 5초 안에 소리를 들을 수 있는지
- Key 변경이 직관적인지
- 진행과 실제 코드가 혼동되지 않는지

## 9. 개발 순서

정확한 순서는 다음과 같다.

1. 프로젝트 골격 생성
2. 단일 화면 UI
3. Key / scale / chord 데이터
4. 숫자 progression 변환
5. 단일 chord 재생
6. progression 재생
7. 기타다운 strum 개선
8. 모바일 AudioContext 안정화
9. 재생 상태 UI
10. 실제 모바일 테스트
11. P0 완료
12. 실제 사용 후 P1 우선순위 결정

각 단계가 동작하는 상태에서 다음 단계로 넘어간다.
한 번에 큰 기능을 만들지 않는다.

## 10. 완료 정의

### P0 완료
다음 시나리오가 실제 휴대폰에서 동작해야 한다.

> 앱을 연다 → C Key를 선택한다 → 1-5-6-4를 누른다 → C-G-Am-F가 기타 스트럼으로 재생된다 → 재생 중 현재 코드가 보인다.

그리고:

> D Key로 바꾼다 → 같은 1-5-6-4를 누른다 → D-A-Bm-G가 재생된다.

이 두 시나리오가 자연스럽게 동작하면 첫 번째 제품 검증을 완료한 것으로 본다.

## 11. 개발하지 않을 것

초기 버전에서는 다음을 의도적으로 제외한다.

- 로그인
- 계정
- 서버
- DB
- AI 작곡
- 자동 작곡
- 복잡한 악보 편집
- DAW 기능
- 멀티트랙
- 녹음
- 소셜 기능
- 광고
- 과도한 기타 학습 기능

## 12. 제품 검증 기준

성공 기준은 기능 개수가 아니다.

핵심 질문:

> 기타를 치다가 '이 진행 어떤 느낌이지?'라는 순간에 이 앱을 열었을 때, 5초 안에 답을 얻을 수 있는가?

이 경험이 해결되지 않은 상태에서는 기능을 추가하지 않는다.

## 13. 참고 조사

현재 유사한 웹 도구 중에서도 코드 선택/재생, 기타 코드 표시, 브라우저 기반 기타 사운드 등의 사례가 존재한다. 따라서 차별화는 기능 수가 아니라 '코드 진행을 가장 빨리 들어보는 흐름'에 둔다.

참고 사례:
- ManyHand Chord Player
- ChordProgressions.org
- MuseScore Chord Progression Player
- MoChord
- keystrum

특히 브라우저에서 기타 스트럼을 Web Audio로 생성하는 접근은 keystrum의 Karplus-Strong 구현 사례를 참고할 수 있다.


## 14. 배포

GitHub Pages를 사용한다.

배포 주소:
https://youngseokchomajn-web.github.io/Chords/

배포 방식:
- `main` push
- GitHub Actions 실행
- `npm ci`
- `npm run build`
- `dist/`를 GitHub Pages에 배포

Vite의 `base`는 저장소 이름에 맞춰 `/Chords/`로 설정한다.

따라서 코드가 완성될수록 별도의 서버 작업 없이 GitHub에 push하는 것만으로 웹페이지가 자동 업데이트되는 구조를 사용한다.


## 개발 계획

현재 구현 상태를 기준으로 한 다음 개발 단계는 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)에 정리해두었다.
