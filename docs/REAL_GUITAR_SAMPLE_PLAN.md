# 실제 기타 샘플 전환 계획

## 결정

Chords의 기타 사운드는 복잡한 가상 기타/샘플러를 만드는 방향으로 확장하지 않는다.

핵심은 **기존 코드/보이싱 로직에 실제 기타 음 샘플을 붙여서, 코드 진행을 빠르게 들어보게 하는 것**이다.

## 왜 개별 음 샘플인가

완성된 코드 샘플(C, G, Am, F...)을 사용하는 방식은 구현은 쉽지만 지원 가능한 코드와 Key가 제한된다.

개별 음 샘플을 사용하면 기존 기타 보이싱을 그대로 활용하면서 다양한 코드로 확장할 수 있다.

따라서 다음 구조를 사용한다.

Key → Chord → Guitar voicing → Notes → Guitar samples → Strum

## 구현 범위

### 1. 샘플 확보

- 실제 어쿠스틱 기타 WAV 사용
- 상업적 이용 및 웹앱 배포/재배포 조건을 확인한 샘플만 사용
- 처음부터 대규모 멀티샘플을 확보하지 않는다
- 필요한 음을 중심으로 소수의 샘플로 시작한다

주의: 상업적 이용 가능 여부와 원본 샘플 파일을 웹앱에 포함/재배포할 수 있는 권리는 별도로 확인한다.

### 2. 샘플 저장

초기 구조:

```
public/
  samples/
    guitar/
      C3.wav
      D3.wav
      E3.wav
      ...
```

실제 확보한 샘플 구성에 맞춰 파일 수는 조정한다.

### 3. 샘플 재생

간단한 Web Audio 기반 sampler를 만든다.

필요 기능:

- 샘플 preload
- note → 가장 적합한 sample 선택
- 필요한 경우 playbackRate를 이용한 pitch shift
- gain 조절
- note 시작 시점 지정

### 4. 코드 재생

기존 chordBuilder의 기타 voicing을 그대로 사용한다.

예:

```
C = x 3 2 0 1 0
```

해당 voicing에서 실제 울리는 음을 계산하고 각 음에 대응하는 샘플을 재생한다.

### 5. 스트럼

모든 음을 동시에 재생하지 않는다.

Down:

낮은 현 → 높은 현

Up:

높은 현 → 낮은 현

각 음 사이에는 짧은 시간차를 둔다.

처음에는 대략 5~20ms 범위에서 청감 테스트한다.

### 6. 기존 리듬과 연결

현재의 BPM / 4 Beat / 8 Beat 시스템을 그대로 사용한다.

리듬 이벤트가 발생하면:

```
rhythm event
→ strum
→ chord voicing
→ sample notes
```

구조로 재생한다.

## 단계별 개발

### Phase 1 — 사운드 검증

C / G / Am / F만 대상으로 한다.

- 샘플 로딩
- C 코드 재생
- G / Am / F 재생
- 실제 기타처럼 들리는지 확인

### Phase 2 — 기존 코드 시스템 연결

- 모든 Major Key
- 기존 diatonic chord
- 기존 progression
- 기존 guitar voicing

을 실제 샘플 재생에 연결한다.

### Phase 3 — Strum / Rhythm

- Down strum
- Up strum
- 4 Beat
- 8 Beat
- BPM

을 연결한다.

### Phase 4 — 모바일 검증

- iOS Safari
- iOS Chrome
- Android Chrome
- Desktop Chrome

에서 샘플 로딩과 첫 재생을 확인한다.

## 처음에는 만들지 않는 것

다음 기능은 사운드 품질 문제가 실제로 발견될 때만 검토한다.

- round robin
- velocity layer
- string별 별도 샘플 시스템
- fret position 자동 선택
- release sample
- finger noise
- palm mute
- SFZ/복잡한 sampler 포맷
- 대규모 멀티샘플 라이브러리

## 완료 기준

다음 시나리오가 동작하면 1차 완료다.

> C Key → 1-5-6-4 → C-G-Am-F → 실제 기타 샘플 기반 스트럼 재생

그리고:

> D Key → 1-5-6-4 → D-A-Bm-G → 동일하게 재생

핵심 제품 기준은 전문적인 기타 가상악기 품질이 아니라 **떠오른 코드 진행을 5초 안에 실제 기타 느낌으로 확인할 수 있는가**이다.
