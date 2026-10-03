# CHORDS 개발계획 v3 — V2 완성 로드맵

> 기준일: 2026-10-03
>
> 제품 목표: **떠오른 코드 진행을 5초 안에 기타로 들어보는 도구**
>
> 이번 문서는 현재 MVP에서 V2까지 한 번에 바라보되, 실제 개발은 기능 단위로 안전하게 쪼개서 진행하기 위한 실행 계획이다.

---

## 0. 이번 개발의 목표

이번 개발의 목표는 기능을 많이 넣는 것이 아니다.

최종 사용 흐름을 다음까지 완성한다.

```
앱 실행
  ↓
Key 선택
  ↓
코드 선택
  ↓
코드 추가
  ↓
C → G → Am → F
  ↓
BPM / Rhythm 선택
  ↓
Play
  ↓
현재 / 다음 코드 확인
  ↓
Loop
  ↓
Voicing 변경
  ↓
Save / Share
```

여기까지가 **CHORDS V2의 핵심 완성 범위**다.

P6의 기능은 전부 넣는 것이 아니라 실제 사용 과정에서 필요성이 확인된 것만 선택한다.

---

# 1. 현재 상태

현재 구현되어 있는 것:

- Major Key 선택
- Key별 diatonic chord 표시
- 대표 숫자 코드 진행 선택
- 단일 코드 즉시 기타 재생
- preset progression 재생
- BPM
- 기본 5개 rhythm
- 재생 중 현재 chord 강조
- 실제 기타 샘플 기반 재생
- 모바일 Web Audio 초기화 / preload
- diminished chord voicing 수정
- GitHub Pages 자동 배포

현재 가장 큰 문제:

- 사용자가 직접 progression을 만들 수 없음
- Stop 없음
- Loop 없음
- 재생 상태가 단순함
- 현재/다음 코드 UX가 부족함
- voicing 선택이 제한적임
- 저장/공유 없음
- Minor/확장 코드가 제한적임

---

# 2. V2 개발 범위

## 반드시 V2에 포함

### P1. Progression Editor + Transport
- 코드 추가
- 개별 코드 삭제
- 전체 초기화
- 순서 표시
- Play
- Stop
- Loop
- 재생 중 편집 안전 처리

### P2. Playback UX
- 현재 코드
- 다음 코드
- 현재 beat / 진행 위치
- 안정적인 BPM
- rhythm UX 개선
- loop boundary 개선
- 필요하면 Tap Tempo / count-in

### P3. Guitar Voicing
- Open
- Barre
- Alternative
- fretboard
- 실제 voicing별 재생
- progression 안에서 chord별 voicing 관리

### P4. Save / Share
- local save
- 최근 진행 불러오기
- URL 기반 share
- key / progression / BPM / rhythm / voicing 상태 복원

### P5. Theory Expansion
- Minor Key
- 7
- maj7
- m7
- sus2
- sus4
- add9
- m7b5
- dim
- aug
- transpose

### P6 중 V2에 선택적으로 포함
- Capo
- 간단한 metronome
- count-in
- progression transpose

## V2에서 일단 제외

- AI 코드 추천
- AI 작곡
- 자동 편곡
- 로그인
- 서버 / DB
- 클라우드 동기화
- 소셜 / 커뮤니티
- 광고
- 멀티트랙 DAW
- MIDI export
- Audio export
- 이미지 export
- alternate tuning
- 복잡한 곡 편집

이 기능들은 V2 핵심 흐름을 방해하지 않는 별도 후보로 유지한다.

---

# 3. 개발 순서

전체 개발을 한 번에 설계하되, 구현은 다음 순서로 한다.

```
0. 현재 MVP 기준선 고정
        ↓
1. 데이터 구조 정리
        ↓
2. Progression Editor
        ↓
3. Stop / Loop
        ↓
4. Playback Engine 분리
        ↓
5. Playback UX
        ↓
6. Voicing 구조
        ↓
7. Save / Share
        ↓
8. Minor / Extended Chords
        ↓
9. Capo / Transpose 등 선택 기능
        ↓
10. 통합 테스트
        ↓
11. V2 배포
```

중요한 점:

**UI → 음악 로직 → 오디오 → 저장 구조를 한 번에 뒤섞지 않는다.**

---

# 4. P0 — 기준선 고정

현재 동작하는 기능을 먼저 보호한다.

## 반드시 유지

- C / D / G Key
- 1-5-6-4
- 단일 chord
- diminished
- BPM
- 5개 rhythm
- 실제 기타 sample
- Pages deployment

## 테스트

### Theory

모든 Major Key:

C / D / E / F / G / A / B

각각 I~vii° 확인.

특히:

- C → Bdim
- D → C#dim
- E → D#dim
- F → Edim
- G → F#dim
- A → G#dim
- B → A#dim

### Audio

- 단일 코드
- progression
- 빠른 버튼 입력
- BPM 변경
- rhythm 변경

### Mobile

- iPhone Safari
- iPhone Chrome
- Android Chrome
- 320 / 375 / 390 / 430px

## 완료 기준

기준선 기능이 모두 살아 있는 상태에서 다음 단계로 넘어간다.

---

# 5. P1 — Progression Editor

## 5-1. 데이터 구조

현재처럼 단순 `number[]`에만 의존하지 말고 progression item을 확장할 수 있는 구조를 만든다.

초기:

```ts
type ProgressionItem = {
  degree: number;
}
```

향후:

```ts
type ProgressionItem = {
  degree: number;
  voicingId?: string;
}
```

필요하면:

```ts
type Progression = {
  key: NoteName;
  items: ProgressionItem[];
  bpm: number;
  rhythmId: string;
}
```

이렇게 확장할 수 있도록 한다.

## 5-2. 첫 버전 편집

처음부터 drag & drop을 만들지 않는다.

화면:

```
CURRENT

[C] [G] [Am] [F]

[ + 코드 추가 ]  [ 초기화 ]
```

코드 선택 후:

- 듣기
- 추가

동작을 명확하게 분리한다.

## 5-3. 필수

- 코드 추가
- 개별 삭제
- 전체 초기화
- 같은 코드 여러 번 추가
- 순서 유지
- 현재 선택 코드 preview

## 5-4. 이후

사용성이 확인되면:

- 특정 위치에 삽입
- 순서 이동
- drag & drop

을 추가한다.

## 완료 기준

사용자가 preset 없이:

```
C → G → Am → F → G → C
```

를 직접 만들 수 있다.

---

# 6. P1-Transport — Stop / Loop

Progression Editor와 같은 단계에서 구현한다.

## Stop

Stop을 누르면:

1. 예약된 모든 timer 취소
2. 현재 기타 음 정지
3. currentIndex 초기화
4. isPlaying false
5. loop 상태 유지
6. stale callback 실행 방지

## Loop

기본 동작:

```
C → G → Am → F
       ↓
C → G → Am → F
       ↓
...
```

단순히 playback 함수를 무한 재귀 호출하지 않는다.

재생 세대 또는 cancellation token을 사용한다.

예:

```ts
playbackGeneration += 1;
const generation = playbackGeneration;
```

timer callback에서:

```ts
if (generation !== playbackGeneration) return;
```

이런 방식으로 이전 재생의 callback이 새 재생에 침투하지 못하게 한다.

## 편집 중 처리

재생 중 progression을 수정하면:

- 현재 재생 즉시 중단
- progression 업데이트
- currentIndex 초기화
- 새 progression은 사용자가 다시 Play

로 한다.

처음부터 복잡한 live-edit playback은 만들지 않는다.

---

# 7. P1 완료 기준

다음 시나리오가 가능해야 한다.

```
C Key
↓
C 추가
G 추가
Am 추가
F 추가
↓
Play
↓
Stop
↓
Play
↓
Loop ON
↓
계속 반복
↓
Loop OFF
↓
Stop
↓
초기화
```

그리고 preset progression도 기존처럼 동작해야 한다.

**Preset과 Custom progression은 가능한 한 같은 playback engine을 사용한다.**

---

# 8. P2 — Playback Engine 분리

현재 App.tsx에 들어 있는 재생 scheduling 책임을 점진적으로 분리한다.

목표 구조:

```
src/audio/
  guitarSynth.ts
  sampleSelector.ts
  audioContext.ts
  playbackEngine.ts
```

## playbackEngine 책임

- progression scheduling
- BPM
- rhythm
- current index
- loop
- stop
- cancellation
- playback callbacks

## guitarSynth 책임

- 실제 기타 sample 재생
- strum
- voice
- sample selection

## theory 책임

- chord
- note
- interval
- voicing

## UI 책임

- 버튼
- 상태
- 표시

**UI가 직접 오디오 scheduling을 계산하지 않도록 한다.**

---

# 9. P2 — Playback UX

## 필수

```
CURRENT
C

NEXT
G
```

또는:

```
C   G   Am   F
●   ○   ○    ○
```

## 추가

- 현재 chord
- 다음 chord
- 진행 위치
- beat 진행
- BPM
- rhythm
- Loop 상태

## BPM

현재:

- 50~160
- ±5

을 유지하되 필요하면:

- 숫자 직접 입력
- Tap Tempo

를 추가한다.

## Rhythm

현재 5개를 먼저 안정화한다.

그 다음 필요성이 확인되면:

- 16 beat
- mute
- shuffle
- swing
- arpeggio

를 검토한다.

리듬 개수보다 **실제 소리의 자연스러움**을 우선한다.

---

# 10. P2 오디오 품질 원칙

새 기능보다 음질 문제가 우선이다.

검사:

- sample 선택
- pitch shift
- string volume
- strum timing
- velocity
- sustain
- release
- chord transition
- 빠른 BPM
- 반복 재생

특히:

- 높은 fret pitch shift
- up/down strum
- diminished
- 7th
- sus
- loop boundary

를 별도로 확인한다.

음질 문제가 발견되면 다음 기능 개발을 잠시 멈추고 수정한다.

---

# 11. P3 — Guitar Voicing

## 1단계

코드별 최소 2가지:

- Open
- Barre

가능한 코드부터 시작한다.

## 2단계

- Alternative
- CAGED 기반 voicing

## 화면

```
C

[ Open ] [ Barre ] [ Alt ]

e ──●──
B ──●──
G ──●──
D ──●──
A ──●──
E ──X──
```

## 필수 검증

자동 생성 voicing마다:

- root
- chord interval
- mute
- fret
- 실제 MIDI
- 실제 재생음

을 검증한다.

**화면의 운지와 실제 소리가 다르면 해당 voicing은 배포하지 않는다.**

---

# 12. P3 — Progression과 Voicing 연결

최종적으로:

```
C(Open)
→ G(Barre)
→ Am(Open)
→ F(Barre)
```

처럼 코드마다 다른 voicing을 가질 수 있게 한다.

하지만 초기에는 전체 progression에 하나의 voicing을 적용하는 방식도 허용한다.

복잡도를 단계적으로 올린다.

---

# 13. P4 — Save

서버 없이 시작한다.

저장 대상:

```
key
progression
bpm
rhythm
voicing
```

localStorage 기반으로 시작한다.

## 저장 단위

예:

```
My Progression

C - G - Am - F
90 BPM
8 BEAT
```

최소 기능:

- 저장
- 불러오기
- 삭제

---

# 14. P4 — URL Share

로그인 없이 링크 하나로 공유한다.

예:

```
/Chords/?key=C&progression=1-5-6-4&bpm=90&rhythm=8beat
```

페이지 진입 시 URL을 읽어서 상태를 복원한다.

## 우선순위

1. key
2. progression
3. bpm
4. rhythm
5. voicing

URL이 깨져도 앱 전체가 죽으면 안 된다.

잘못된 값은 기본값으로 fallback한다.

---

# 15. P5 — Theory Expansion

## Minor

우선 Natural Minor.

예:

```
A minor
Am Bdim C Dm Em F G
```

이후 Harmonic / Melodic Minor는 실제 수요를 보고 추가한다.

## Extended Chord 순서

1. 7
2. maj7
3. m7
4. sus2
5. sus4
6. add9
7. m7b5
8. dim
9. aug

각 코드마다:

1. theory 정의
2. voicing
3. fretboard
4. sample mapping
5. single playback
6. progression playback

순서로 검증한다.

한 단계라도 실패하면 다음 코드로 넘어가지 않는다.

---

# 16. Transpose

Minor / Extended Chord 구조가 안정된 뒤 추가한다.

목표:

```
C - G - Am - F
↓
D - A - Bm - G
```

단순히 문자열을 바꾸는 것이 아니라 progression의 음악적 구조를 유지한다.

degree 기반 progression이면:

```
1-5-6-4
```

를 유지하면서 key만 변경한다.

---

# 17. Capo

Transpose 이후 구현한다.

목표:

```
Key / Chord
+
Capo
=
실제 sounding pitch
```

사용자에게는:

- 코드 모양
- 실제 음

을 혼동하지 않게 표시한다.

Capo는 theory와 voicing 두 계층 모두에 영향을 주므로 너무 일찍 넣지 않는다.

---

# 18. P6 선택 기능 판단 기준

다음 질문을 통과한 기능만 추가한다.

### 질문 1

실제로 자주 사용할 기능인가?

### 질문 2

5초 안에 진행을 듣는 핵심 흐름을 방해하지 않는가?

### 질문 3

기존 데이터 구조를 크게 망가뜨리지 않는가?

### 질문 4

모바일 UI가 복잡해지지 않는가?

### 질문 5

실제 소리 품질을 유지할 수 있는가?

하나라도 문제가 크면 보류한다.

---

# 19. 개발 행동양식

앞으로 CHORDS 개발은 다음 방식으로 한다.

## Rule 1 — 먼저 현재 코드를 읽는다

기능을 만들기 전에 관련 파일을 확인한다.

특히:

- App.tsx
- theory
- audio
- types
- deployment

를 확인한다.

기존 기능을 모르는 상태에서 새 코드를 덧붙이지 않는다.

---

## Rule 2 — 먼저 최소 동작을 만든다

예:

Loop를 만들 때:

처음부터:

- BPM
- count-in
- animation
- metronome
- waveform

을 같이 만들지 않는다.

먼저:

```
Play
→ 끝
→ 다시 처음
```

만 만든다.

그 다음 UX를 개선한다.

---

## Rule 3 — 같은 로직을 두 번 만들지 않는다

Preset playback과 Custom playback이 같은 일을 한다면 같은 playback engine을 사용한다.

코드 계산도 마찬가지다.

---

## Rule 4 — UI보다 데이터 구조를 먼저 결정한다

특히 progression / voicing / save / share는 서로 연결되므로 데이터 구조를 먼저 안정화한다.

---

## Rule 5 — 오디오 기능은 실제 소리를 확인한다

TypeScript 빌드 성공만으로 완료 처리하지 않는다.

반드시 실제 chord를 들어본다.

---

## Rule 6 — 작은 단위로 commit한다

예:

```
refactor: introduce progression item model
feat: add custom progression editor
feat: add progression item deletion
feat: add stop playback
feat: add loop playback
refactor: extract playback engine
feat: add next chord indicator
feat: add chord voicing selector
feat: add local progression save
feat: add URL progression sharing
feat: add minor key support
```

하나의 커밋에서 서로 다른 큰 기능을 섞지 않는다.

---

## Rule 7 — 매 기능마다 build한다

기본 순서:

```
코드 작성
↓
type/build
↓
기능 확인
↓
commit
↓
Pages deploy
↓
실제 모바일 확인
```

GitHub Pages는 main push 기반 자동 배포를 사용하므로 push 후 Actions 결과를 확인한다.

---

## Rule 8 — 실패하면 다음 기능으로 넘어가지 않는다

예:

```
Voicing bug
↓
Voicing 수정
↓
build
↓
audio 확인
↓
통과
↓
Save 개발
```

기능이 깨진 상태에서 위에 기능을 계속 쌓지 않는다.

---

## Rule 9 — 기존 기능을 깨뜨리지 않는다

새 기능의 완료 조건은:

> 새 기능이 동작한다 + 기존 기능이 그대로 동작한다.

---

## Rule 10 — 모바일을 우선한다

Desktop에서 예쁘게 보이는 것보다:

- 한 손 조작
- 큰 버튼
- 짧은 화면
- 즉시 피드백
- 좁은 화면

을 우선한다.

---

# 20. 개발 중 의사결정 기준

기능을 추가할지 고민될 때 우선순위:

```
사용자가 5초 안에 진행을 듣는가?
        ↓
그 흐름을 더 빠르게 만드는가?
        ↓
실제 기타 소리가 좋아지는가?
        ↓
반복 사용성이 좋아지는가?
        ↓
저장/공유가 편해지는가?
        ↓
그 이후의 부가 기능인가?
```

아래쪽일수록 뒤로 미룬다.

---

# 21. 하지 말아야 할 개발 방식

## 하지 않는다

- App.tsx에 모든 기능 계속 추가
- 같은 playback 로직 복제
- 빌드 성공만 보고 완료
- 실제 기타 소리를 듣지 않고 audio 기능 완료
- UI부터 복잡하게 만들기
- drag & drop부터 만들기
- 로그인부터 만들기
- AI 기능부터 만들기
- 서버부터 만들기
- 기능 수를 늘리기 위해 기능 추가
- 실패한 기능 위에 다음 기능을 계속 쌓기

---

# 22. 테스트 매트릭스

## Key

C / D / E / F / G / A / B

## Progression

- 1-5-6-4
- 6-4-1-5
- 1-4-5
- custom 2 chord
- custom 4 chord
- custom 8 chord
- duplicate chord

## Chord

- Major
- Minor
- dim
- 7
- maj7
- m7
- sus
- add9

## Playback

- Play
- Stop
- Loop
- Loop OFF
- 빠른 Stop
- Play → Stop → Play
- Play → Loop → Stop
- 재생 중 Key 변경
- 재생 중 progression 변경
- BPM 변경
- rhythm 변경

## Mobile

- iPhone Safari
- iPhone Chrome
- Android Chrome

## Width

- 320px
- 375px
- 390px
- 430px

---

# 23. 완료 판정

기능 하나의 완료는 다음 7개를 모두 만족해야 한다.

1. 코드 구현
2. TypeScript/build 통과
3. 기존 기능 확인
4. 실제 소리 확인
5. 모바일 UI 확인
6. commit
7. Pages 배포 확인

7개 중 하나라도 빠지면 '완료'로 기록하지 않는다.

---

# 24. 배포 행동

현재 Pages 자동 배포 구조를 유지한다.

```
main push
↓
GitHub Actions
↓
npm ci
↓
npm run build
↓
Pages deploy
↓
실제 사이트 확인
```

배포 실패 시:

1. Actions 로그 확인
2. 실패 원인 파악
3. 최소 수정
4. 다시 build
5. 다시 push
6. 성공 확인

배포 실패 상태를 방치하지 않는다.

---

# 25. 커밋 / 버전 전략

큰 단계별로 태그 또는 명확한 커밋 메시지를 남긴다.

예:

```
MVP
↓
v2-p1-editor
↓
v2-p1-transport
↓
v2-p2-playback
↓
v2-p3-voicing
↓
v2-p4-save-share
↓
v2-p5-theory
↓
v2-release
```

실제 Git tag는 필요성이 확인될 때 사용하고, 최소한 commit history만 봐도 개발 진행 상황을 이해할 수 있도록 한다.

---

# 26. 최종 V2 화면

최종적으로 화면은 복잡한 DAW처럼 만들지 않는다.

```
CHORDS

KEY
[C] [D] [E] [F] [G] [A] [B]

CHORD
[C] [Dm] [Em] [F] [G] [Am] [Bdim]

MY PROGRESSION
[C] [G] [Am] [F]
×   ×    ×    ×

[ + 코드 ]

RHYTHM
[4 BEAT] [8 BEAT] [8 BEAT 2] ...

BPM
[ − ] 90 [ + ]

CURRENT
C → G → Am → F

NOW
C

NEXT
G

[ ▶ PLAY ] [ ■ STOP ] [ LOOP ]

VOICING
[ OPEN ] [ BARRE ] [ ALT ]

[ SAVE ] [ SHARE ]
```

모든 기능을 한 화면에 무조건 표시하지 않고, 필요할 때 펼치는 방식으로 복잡도를 관리한다.

---

# 27. V2 최종 사용 시나리오

사용자가 기타를 치다가 진행을 떠올린다.

### 1

CHORDS를 연다.

### 2

Key를 고른다.

### 3

코드를 누른다.

### 4

+ 버튼으로:

```
C → G → Am → F
```

를 만든다.

### 5

8 BEAT / 90 BPM을 선택한다.

### 6

Play를 누른다.

### 7

현재 코드와 다음 코드를 보면서 실제 기타 소리를 듣는다.

### 8

Loop를 켠다.

### 9

C의 Open / Barre를 비교한다.

### 10

마음에 들면 Save한다.

### 11

URL을 복사해서 공유한다.

이 전체 흐름이 자연스럽게 되면 V2의 핵심 목표를 달성한 것으로 본다.

---

# 28. 개발 완료 후 판단

V2가 완성됐다고 해서 기능을 계속 추가하지 않는다.

실제 사용 후 다음을 확인한다.

- 어떤 기능을 가장 많이 사용하는가
- 어떤 기능을 전혀 사용하지 않는가
- 어디에서 사용자가 멈추는가
- 어떤 chord에서 소리가 이상한가
- 모바일에서 가장 불편한 부분은 무엇인가
- progression을 만드는 데 실제로 몇 번 터치하는가

그 데이터를 기준으로 V3를 결정한다.

---

# 29. 최종 개발 철학

CHORDS는 '기능이 많은 기타 앱'이 되는 것이 목표가 아니다.

**코드 진행을 생각했을 때 가장 빨리 실제 기타 소리로 확인할 수 있는 도구**가 되는 것이 목표다.

따라서 개발 순서는:

```
빠른 입력
→ 정확한 코드
→ 자연스러운 기타 소리
→ 편한 반복 재생
→ 다른 운지 비교
→ 저장 / 공유
→ 필요한 이론 확장
```

이다.

그리고 모든 새로운 기능은 이 흐름을 기준으로 판단한다.
