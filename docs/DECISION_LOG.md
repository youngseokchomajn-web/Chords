# Decision Log

## 2026-09-29 — 다음 기타 코드 음질 개선 개발계획

### 현재 위치
Phase 1 매핑 진단은 완료되었고 Phase 2 selector interface가 구현되어 있다. 하지만 실제 선택은 아직 MIDI-nearest fallback 중심이다.

### 목표
이번 사이클은 샘플 교체가 아니라 **실제 String/Fret-aware selector 기반을 완성**한다.

### 1. 구조 정리
```
sampleCatalog.ts
  └─ sample id / file / midi / string? / fret? / source / license

sampleSelector.ts
  └─ 후보 생성 / 점수 계산 / 선택

guitarSynth.ts
  └─ 실제 Web Audio 재생
```
현재 SAMPLES와 selector 사이 순환 의존성을 제거한다.

### 2. Note representation 고정
각 기타 음을 `{ string: 1..6, fret: 0.., midi: number }`로 통일한다. 기존 voicing 순서 `[6,5,4,3,2,1]`를 유지한다.

### 3. 실제 selector 정책
샘플에 string/fret metadata가 있으면:
1. 같은 string
2. 가까운 fret
3. 작은 absolute pitch shift
4. MIDI distance

순으로 선택한다.

metadata가 없으면 현재처럼 MIDI-nearest를 안전한 fallback으로 사용한다. 현재 Martin 샘플에 임의의 string/fret 정보를 추정해서 넣지 않는다.

### 4. Diagnostic 강화
각 note에 target string/fret/MIDI, selected sample, source string/fret(알 수 있을 때), semitone shift, selection reason/score를 표시한다.

### 5. 단위 테스트
- 같은 string의 가까운 fret가 우선
- 같은 string 후보가 없으면 pitch shift가 작은 후보 선택
- metadata가 없으면 MIDI-nearest fallback
- mute string 제외
- C/G/Am/F 결과가 기존 diagnostic과 일관됨

### 6. 현재 Martin으로 회귀/A-B
샘플은 바꾸지 않는다. C/G/Am/F, down/up, 4/8 beat를 기존 버전과 비교한다. selector 구조와 샘플 품질을 섞어서 판단하지 않는다.

### 7. 이후 Phase 3
Phase 2가 통과한 뒤에만 실제 steel-string acoustic string/fret 샘플을 조사한다. 라이선스 원문, 상업 사용, 웹 배포 조건을 파일 단위로 확인한 뒤 도입한다.

### 이후 순서
```
selector 구조 정리
→ 실제 정책 구현
→ 테스트/diagnostic
→ Martin 회귀/A-B
→ string/fret 샘플 조사 + license 검증
→ 샘플 교체 A/B
→ pitch shift 최소화
→ strum timing
→ string balance
→ 제품 검증
```

### 이번 사이클 완료 조건
- catalog / selector / playback 분리
- string/fret note representation 고정
- metadata 기반 selector 동작
- Martin은 안전한 MIDI-nearest fallback
- 선택 이유까지 diagnostic에 표시
- 테스트 통과
- 현재 모바일 오디오 재생 경로 회귀 없음

### 진단 해석 주의
F 코드의 6개 음이 모두 ±1 semitone pitch shift된 것은 확인되지만, 이를 '위상 간섭'의 원인이라고 단정하지 않는다. 현재 데이터가 직접 보여주는 것은 sample pool의 음정 커버리지 부족과 pitch-shift 의존이다.
