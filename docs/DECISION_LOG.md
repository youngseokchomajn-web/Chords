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

### 현재 상태

- GitHub Pages 배포 자체는 정상적으로 빌드되는 상태.
- 실제 기타 WAV 샘플 10개가 `public/samples/guitar/`에 존재한다.
- 샘플 소스는 manifest에 기록된 CC0 steel-string guitar 샘플이다.
- 기존 코드/보이싱/리듬 로직은 유지되고 있다.
- iOS 첫 터치에서 오디오가 재생되지 않는 문제가 계속 재현되고 있다.
- 1차 샘플 기반 구현에서 비동기 `fetch/decodeAudioData` 이후 재생하던 구조를 제거했다.
- AudioContext를 사용자 gesture에서 동기적으로 unlock하도록 수정했다.
- 첫 재생은 샘플 로딩을 기다리지 않고 기존 fallback oscillator를 즉시 재생하도록 수정했다.
- 위 수정은 PR #2로 `main`에 병합되었다.
- 그럼에도 실제 기기에서 소리가 나지 않는 상태다.

### 현재 결론

현재 문제는 단순한 WAV 파일 누락이나 TypeScript/build 오류로 확정할 수 없다.

다음 디버깅에서는 같은 Web Audio 구조를 계속 조금씩 수정하기보다 **오디오 출력 경로 자체를 분리해서 검증**해야 한다.

우선순위:

1. 브라우저에서 최소 oscillator 1음이 실제로 출력되는지 확인
2. oscillator도 무음이면 Web Audio / 사용자 gesture / 브라우저 환경 문제로 범위를 좁힌다.
3. oscillator는 들리는데 WAV만 무음이면 sample decode/fetch 또는 BufferSource 문제로 범위를 좁힌다.
4. WAV 재생만 문제라면 HTMLAudioElement 기반 직접 재생도 검토한다.
5. 원인이 확인되기 전에는 기능을 더 추가하지 않는다.

### 중요한 원칙

이번 단계의 목표는 '더 좋은 기타 소리'가 아니라 **어떤 방식으로든 버튼을 눌렀을 때 소리가 나는 최소 경로를 확보하는 것**이다.

원인 확인 후 실제 기타 샘플 재생을 다시 연결한다.
