# Decision Log

## 2026-09-27 — 실제 기타 사운드 구현 방향 결정

### 배경

기존 Chords는 Web Audio 기반 기타 합성음을 사용하고 있었다.

실제 기타 느낌을 개선하기 위해 처음에는 다음과 같은 복잡한 샘플러 구조가 검토되었다.

- 여러 현/프렛 샘플
- velocity layer
- round robin
- release/noise
- string-aware sample selection
- 복잡한 샘플 포맷

검토 결과 현재 제품 목적에 비해 구현 복잡도가 크다고 판단했다.

### 결정

**복잡한 가상 기타 악기를 만들지 않는다.**

실제 기타 음 샘플을 소수 확보하고, 기존 기타 voicing에서 필요한 음을 골라 간단히 조합한다.

구조:

Key → Chord → Guitar voicing → Notes → Sample playback → Strum

### 코드 샘플 대신 개별 음 샘플을 선택한 이유

완성된 코드 샘플을 사용하면 초기 구현은 가장 쉽지만:

- 지원 코드가 샘플에 종속됨
- Key가 늘어날수록 코드 샘플을 계속 확보해야 함
- 기존 guitar voicing 시스템과의 연결성이 낮음

개별 음 샘플은:

- 기존 chord/voicing 로직을 그대로 활용할 수 있고
- 다양한 Major Key와 progression으로 확장할 수 있으며
- 샘플 수를 작게 시작할 수 있다.

따라서 현재 제품에서는 **개별 음 샘플 + 간단한 pitch shift + 간단한 strum**을 선택한다.

### 샘플 소스 조사 결과

2026-09-27 기준으로 다음 후보를 확인했다.

#### 1차 후보 — Discord SFZ GM Bank의 Steel-String Acoustic Guitar

`026-Acoustic Guitar (steel)` / `jMartin HD28`

- 2017 Martin HD28 Vintage Series
- Author: Jeff Learman
- CC0
- 개별 악기 SFZ 헤더에 라이선스가 명시됨
- 원본 프로젝트는 상업적 사용을 허용하는 무료 오픈소스 GM bank를 목표로 함

중요: Discord SFZ GM Bank 전체가 하나의 라이선스로 묶여 있는 것은 아니므로, 프로젝트 전체의 CC0를 가정하지 않는다. **해당 기타의 개별 SFZ에 명시된 CC0를 기준으로 사용한다.**

이 후보를 **실제 Chords용 1차 샘플 소스**로 선정한다.

#### 2차 후보 — FreePats Spanish Classical Guitar

- Spanish classical / nylon-string guitar
- CC0
- WAV sound bank 약 6.9 MiB

라이선스와 배포 조건은 매우 명확하지만 nylon-string이므로 Chords의 기본적인 어쿠스틱 기타 느낌에는 steel-string 후보보다 우선순위를 낮춘다.

### 샘플 선정 원칙

단순히 '상업적 이용 가능'만 확인하지 않는다.

다음 조건을 모두 확인한다.

1. 실제 녹음 샘플일 것
2. CC0 또는 이에 준하는 명확한 라이선스일 것
3. 상업적 이용이 가능할 것
4. 웹앱에 샘플 파일을 포함해 배포 가능한 조건일 것
5. 원본/저작자/라이선스 정보를 저장소에 기록할 수 있을 것

### 단순화 원칙

1. 실제 기타 샘플을 먼저 사용한다.
2. 샘플이 없는 음은 가까운 샘플을 pitch shift한다.
3. 각 음에 짧은 시간차를 두어 스트럼을 만든다.
4. 기존 BPM / rhythm 로직을 재사용한다.
5. 사운드 문제가 실제로 발생하기 전까지 고급 샘플러 기능을 만들지 않는다.

### 하지 않기로 한 것

초기 구현에서는 다음을 제외한다.

- round robin
- velocity layers
- fret/string별 복잡한 sample selection
- release samples
- finger noise
- palm mute
- SFZ
- 대규모 multisample library
- 전문적인 virtual guitar engine

### 판단 기준

이 프로젝트의 목표는 전문적인 기타 가상악기를 만드는 것이 아니다.

> **떠오른 코드 진행을 5초 안에 기타로 들어보는 것**

따라서 구현 복잡도보다 빠른 사용 경험과 실제 기타에 가까운 최소 품질을 우선한다.

### 다음 단계

1. 선정한 steel-string 샘플의 실제 WAV 구성 확인
2. 필요한 최소 음 샘플 추출/선정
3. C/G/Am/F 4개 코드로 샘플 재생 프로토타입
4. 기존 chord voicing과 연결
5. down/up strum 적용
6. 기존 BPM/rhythm 연결
7. 모바일에서 청감 확인
8. 문제가 있는 경우에만 샘플 수와 엔진 기능을 확대


## 2026-09-27 — 오디오 재생 장애 현황 고정

### 당시 상태

- GitHub Pages 배포 자체는 정상적으로 빌드되는 상태.
- 실제 기타 WAV 샘플 10개가 `public/samples/guitar/`에 존재한다.
- 기존 코드/보이싱/리듬 로직은 유지되고 있었다.
- iOS 첫 터치에서 오디오가 재생되지 않는 문제가 재현되었다.
- AudioContext를 사용자 gesture에서 동기적으로 unlock하도록 수정했다.
- 이후 여러 iOS 오디오 세션 관련 수정과 fallback 실험을 거쳤다.

### 현재 상태로 갱신

위 초기 장애 대응 기록은 **역사적 기록**으로 유지한다. 현재 구현의 기준은 이후 성공한 수정이다.

- synthetic oscillator fallback은 현재 사용하지 않는다.
- chord playback은 recorded guitar sample만 사용한다.
- chord/progression 재생은 사용자 gesture 안에서 동기적으로 scheduling한다.
- 현재 배포에서 사용자가 실제 소리를 확인했다.
- 따라서 앞으로는 '소리가 나는가'보다 **'실제 기타 코드가 얼마나 자연스러운가'**를 주된 개발 목표로 둔다.


## 2026-09-29 — 기타 코드 음질 개선 개발계획 v2

### 현재 진단

현재 chord engine은 다음 구조다.

```
Chord voicing
  → 각 string/fret의 target MIDI
  → 전체 sample pool에서 가장 가까운 MIDI sample 선택
  → playbackRate로 pitch shift
  → string별 gain
  → 수 ms 간격으로 strum
```

이 구조는 작동은 하지만 실제 기타의 중요한 특성을 충분히 반영하지 못한다.

가장 중요한 문제는 **같은 음정이라도 어느 기타 줄/프렛에서 연주했는지에 따라 음색이 달라진다**는 점이다.

현재 엔진은 target MIDI만 보고 샘플을 선택하므로 string/fret 정보가 sample selection에 반영되지 않는다.

또한 현재 샘플 간격이 3 semitone이어서 여러 음에서 pitch shift가 발생한다.

### 개발 원칙

1. 현재 소리가 나는 상태를 먼저 보존한다.
2. 샘플 교체와 엔진 구조 변경을 동시에 하지 않는다.
3. 한 번에 하나의 변수만 변경하고 A/B 비교한다.
4. C/G/Am/F를 고정 테스트 세트로 사용한다.
5. 고급 기타 샘플러 기능은 기본 구조가 검증된 뒤에만 추가한다.
6. 지금까지 실패한 오디오 출력/합성 방식을 다시 기본 경로로 되돌리지 않는다.

### Phase 0 — 현재 기준점 고정

현재 Martin 샘플을 그대로 사용한다.

테스트:

- RAW E2/G2/E3/G3/E4
- C/G/Am/F
- down/up
- 4-beat/8-beat

목표:

- 현재 소리를 비교 기준으로 보존
- 샘플 자체 문제와 chord 조립 문제를 분리

### Phase 1 — 매핑 진단

재생 로직은 변경하지 않고 다음 정보를 확인할 수 있는 diagnostic을 만든다.

- chord
- string
- fret
- target MIDI
- 선택 sample MIDI/file
- pitch shift semitone

예:

```
C major
5th string / fret 3 → C3 → Db3 sample → -1
4th string / fret 2 → E3 → E3 sample → 0
3rd string / open      → G3 → G3 sample → 0
2nd string / fret 1 → C4 → Db4 sample → -1
1st string / open      → E4 → E4 sample → 0
```

목표는 현재 음질 문제의 구조적 원인을 실제 데이터로 확인하는 것이다.

### Phase 2 — string/fret-aware selector 구조

현재:

```
target MIDI → nearest sample
```

에서 다음 구조로 분리한다.

```
string + fret + target MIDI
        ↓
sample selector
        ↓
같은 string을 우선
        ↓
가까운 fret/sample 선택
        ↓
필요할 때만 pitch shift
```

단, 현재 Martin 10개 샘플에는 충분한 string/fret 메타데이터가 없으므로 **1차 구현은 selector 구조만 만들고 기존 샘플을 임시로 공유**한다.

이 단계에서 구조 변경 자체가 음질을 얼마나 개선하는지 A/B한다.

### Phase 3 — 실제 string-aware 샘플 세트 조사/교체

Phase 2의 결과가 확인된 뒤 샘플 라이브러리를 검토한다.

필수 조건:

- 실제 기타 녹음
- steel-string acoustic 우선
- 명확한 라이선스
- 상업적 사용 가능
- 웹 배포 가능
- 저작자/라이선스 기록 가능
- 가능하면 string/fret 또는 string별 매핑 정보 존재

샘플 교체 후에는 기존 Martin 세트와 동일한 C/G/Am/F 테스트를 수행한다.

### Phase 4 — pitch shift 최소화

새 샘플 세트에서는 MIDI 근접성만 보지 않고 **같은 string의 인접 fret을 우선**한다.

목표:

- 큰 pitch shift 감소
- string 특유의 timbre 유지
- unnatural upper harmonic 변화 감소

### Phase 5 — strum timing

샘플 선택이 안정된 뒤 strum timing을 조정한다.

현재 7 ms 고정값을 기준으로:

- down
- up
- 느린 strum
- 빠른 strum

을 A/B한다.

목표는 코드가 arpeggio처럼 들리지 않으면서 실제 손 스트럼의 시간차가 느껴지는 지점을 찾는 것이다.

### Phase 6 — string balance

현재 임의의 string weight를 데이터 기반으로 재검토한다.

- string별 peak/RMS 비교
- open/fretted note 비교
- chord 합산 시 clipping 확인
- 필요한 최소 gain correction만 적용

RAW SAMPLE의 음색을 EQ/compressor로 숨기는 방식은 기본 해결책으로 사용하지 않는다.

### Phase 7 — 제품 기준 검증

고정 테스트:

- C / G / Am / F
- down / up
- 4-beat / 8-beat
- progression

검증 기준:

1. 코드가 기타로 명확하게 들리는가
2. 개별 음이 따로 노는 느낌이 적은가
3. pitch-shifted 느낌이 과하지 않은가
4. strum이 자연스러운가
5. 모바일에서 즉시 재생되는가
6. 샘플 준비 시간이 과도하지 않은가

### Phase 8 — 필요할 때만 고급 기능

Phase 7까지 만족하지 못할 경우에만 검토:

- round robin
- velocity layer
- multiple takes
- pick/finger variation
- fret/release noise
- dedicated strum samples

목표는 전문적인 virtual guitar engine이 아니라 **떠오른 코드 진행을 짧은 시간 안에 실제 기타 느낌으로 들어보게 하는 것**이다.

### 별도 트랙 — 샘플 준비 시간

현재 preload는 priority 3개를 먼저 병렬 로드하고 나머지를 순차 로드한다.

음질 개선과 분리하여 다음 순서로 최적화한다.

1. 10개 샘플 병렬 로딩 실험
2. progress 표시 유지
3. 초기 사용에 필요한 최소 샘플 우선 로딩 검토
4. 클릭 시 network/decode를 기다리지 않는 현재 원칙 유지

### 작업 순서 요약

```
현재 기준점
   ↓
매핑 diagnostic
   ↓
string/fret-aware selector
   ↓
Martin 샘플로 A/B
   ↓
실제 string-aware 샘플 조사
   ↓
샘플 교체 A/B
   ↓
pitch shift 최소화
   ↓
strum timing
   ↓
string balance
   ↓
제품 테스트
   ↓
필요할 때만 고급 기능
```

### 완료 조건

다음 단계로 넘어갈 때마다 반드시 이전 단계와 비교한다.

특히:

**샘플을 바꿨는데 좋아졌다/나빠졌다**와  
**엔진 구조를 바꿨는데 좋아졌다/나빠졌다**를 섞지 않는다.

이 원칙을 유지하여 오디오 개발 과정에서 원인을 추적할 수 있도록 한다.


## 2026-09-29 — M9 String/Fret-aware selector 구현

### 구현 내용
- `sampleCatalog.ts`를 추가해 샘플 목록과 선택 메타데이터를 playback 코드에서 분리했다.
- `sampleSelector.ts`를 catalog에 의존하는 순수 선택 계층으로 변경했다.
- verified string/fret metadata가 있는 샘플은 같은 string → 가까운 fret → 작은 pitch shift 순으로 우선한다.
- metadata가 없는 현재 Martin 샘플은 기존과 동일하게 MIDI-nearest fallback을 사용한다.
- diagnostic에 source string/fret, selection reason, selection score를 추가했다.
- `guitarSynth.ts`가 catalog만 참조하도록 바꾸어 selector ↔ playback 순환 의존성을 제거했다.

### 음질 보존 원칙
이번 변경에서는 WAV 파일, gain, strum timing, AudioContext, iOS playback 경로를 변경하지 않았다. 따라서 현재 사용자가 확인한 좋은 소리를 selector 구조 변경과 혼동하지 않고 비교할 수 있다.

### 다음 검증
1. GitHub Actions build 확인
2. 현재 Martin 샘플에서 C/G/Am/F diagnostic의 fallback 결과 확인
3. 실제 string/fret metadata 샘플을 추가한 테스트 fixture로 selector 우선순위 검증
4. 검증 후 Phase 3 steel-string string/fret 샘플 조사


## 2026-09-29 — 기타 샘플 준비 시간 최적화 1차

### 문제
UI에서 `🎸 마틴 어쿠스틱 준비됨 (5/10)` 상태가 오래 유지되는 현상을 확인했다. 기존 `preloadSamples()`는 우선 샘플 3개를 병렬 로드한 뒤 나머지 7개를 **순차적으로 하나씩** fetch/decode했다.

### 변경
- 10개 WAV를 모두 동시에 `loadSample()`에 전달하도록 변경했다.
- 기존의 priority 3개 → 나머지 7개 순차 대기 구조를 제거했다.
- WAV 파일, 샘플 선택, gain, strum timing, AudioContext, playback path는 변경하지 않았다.

### 판단
현재 샘플은 짧은 mono WAV이며 Web Audio에서는 파일을 fetch한 뒤 `decodeAudioData()`로 AudioBuffer를 만드는 구조다. 따라서 이번 변경은 **음질 변경이 아니라 준비시간 단축 실험**이다.

### 주의
동시 decode가 모든 모바일 기기에서 항상 더 빠르다고 단정하지 않는다. 실제 iPhone에서 기존 버전과 비교한다. 만약 CPU/decode 경쟁으로 오히려 느려지면 3개/4개 단위의 제한 동시성으로 되돌린다.

### 다음 측정
- iPhone Safari/Chrome에서 0/10 → 10/10까지 걸리는 시간 비교
- 첫 코드 재생까지의 체감 지연 비교
- 10개 병렬 로딩 중 스크롤/터치 UI 반응성 확인
