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

### Phase 0 — 실행 가능한 최소 골격
목표: 브라우저에서 화면이 뜨고 모바일에서도 터치 가능.

- Vite 기반 정적 웹앱
- 모바일 반응형 레이아웃
- 단일 페이지
- Key / Chord / Progression / Current UI 구현
- CSS는 단순하게 유지
- 서버/DB/로그인 없음

완료 기준:
- 모바일 Chrome에서 화면이 정상 표시됨
- 모든 주요 버튼이 터치하기 쉬움

### Phase 1 — 음악 데이터 / Key 로직
목표: Key 하나를 바꾸면 코드가 정확히 바뀌도록 함.

데이터:
- chromatic notes
- major scale
- diatonic triads
- degree → chord 변환

예:
- C → C Dm Em F G Am Bdim
- D → D Em F#m G A Bm C#dim
- G → G Am Bm C D Em F#dim

대표 진행:
- 1-5-6-4
- 6-4-1-5
- 1-4-5
- 1-6-4-5
- 1-5-4
- 6-5-4-5

완료 기준:
- Key 변경 시 모든 chord / progression 표시가 즉시 갱신됨
- 동일한 숫자 진행이 모든 Major Key에서 올바른 코드로 변환됨

### Phase 2 — 기타 사운드 엔진
목표: '코드를 보여주는 앱'이 아니라 '기타로 들어보는 앱'이 됨.

우선순위:
1. Web Audio API 기반 기타 계열 사운드
2. 실제 기타처럼 들리는 짧은 스트럼
3. 저음 → 고음 순서의 시간차
4. 각 줄의 음량/감쇠 차이
5. 코드 전환 시 자연스러운 간격

초기 구현에서는 외부 샘플 파일에 의존하지 않고 브라우저에서 생성 가능한 방식부터 검증한다.
Karplus-Strong 계열 물리 모델링은 기타다운 질감을 만드는 후보로 검토한다. 실제 기타 샘플이 더 빠르고 품질이 좋다면 이후 교체 가능하게 Audio Engine 인터페이스를 분리한다.

완료 기준:
- C 버튼을 누르면 C 기타 코드가 들림
- 1-5-6-4를 누르면 C-G-Am-F가 순서대로 들림
- 피아노처럼 동시에 모든 음이 시작되는 느낌이 아니라 스트럼 느낌이 남음

### Phase 3 — 모바일 오디오 안정화
목표: iPhone / Android에서 첫 터치부터 안정적으로 소리가 남.

필수:
- AudioContext lazy initialization
- 첫 사용자 gesture에서 resume()
- suspended 상태 재확인
- 오디오 오류가 UI를 멈추지 않도록 예외 처리

테스트:
- iOS Safari
- iOS Chrome
- Android Chrome
- 데스크톱 Chrome

완료 기준:
- 앱을 새로 열고 첫 코드 버튼을 눌렀을 때 바로 소리가 남
- 첫 버튼 이후에도 반복 재생 가능
- 화면 전환/백그라운드 복귀 후 가능한 범위에서 오디오 재개

### Phase 4 — 실제 사용 흐름 완성
목표: '생각난 진행을 5초 안에 들어본다'는 핵심 경험 검증.

사용 흐름:
1. 앱 실행
2. Key 선택
3. 코드 또는 진행 선택
4. 바로 소리
5. Current에서 실제 코드 확인

추가:
- 재생 중 현재 chord 강조
- 진행 종료 후 자동 정지
- 재생 중 다시 누르면 재생 상태를 명확히 처리
- 과도한 애니메이션 금지

완료 기준:
- 처음 사용하는 사람이 별도 설명 없이 핵심 기능을 사용할 수 있음
- 코드 하나 또는 대표 진행 하나를 5초 이내에 들을 수 있음

## 5. P0 이후 개발

### P1 — 작곡 보조 기능
핵심 MVP가 안정화된 뒤 추가.

- BPM
- 스트럼 속도
- 진행 직접 조합
- 코드 추가 / 삭제
- 순서 변경
- 반복 재생
- 재생 중 코드별 진행 표시

직접 조합 UI 예:
```
[C] [G] [Am] [F]
 + Add chord
```

처음부터 드래그앤드롭 편집기를 만들지 않는다. 모바일에서 가장 단순한 방식부터 검증한다.

### P2 — 기타 중심 기능
사용자가 실제로 필요하다는 근거가 생긴 뒤 추가.

- 기타 보이싱 선택
- 오픈 코드 / 다른 포지션
- 카포
- 코드 운지 표시
- 스트럼 패턴
- 진행 저장 / 공유

### P3 — 확장 기능 후보
초기 제품 방향을 검증한 이후에만 검토.

- 7th / maj7 / sus / add9 등 확장 코드
- 마이너 Key
- 템포/박자 세분화
- 음색 선택
- MIDI / 오디오 export

AI 작곡 기능은 핵심 제품 검증 전에는 넣지 않는다.

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
