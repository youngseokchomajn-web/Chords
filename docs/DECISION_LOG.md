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

### 다음 결정

다음 작업은 코드를 더 복잡하게 만드는 것이 아니라 **상업적 이용 및 웹앱 배포가 가능한 실제 기타 샘플을 선정하고 C/G/Am/F 4개 코드로 먼저 청감 검증하는 것**이다.
