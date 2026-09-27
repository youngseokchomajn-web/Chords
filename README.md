# Chords

기타 작곡을 위한 초간단 코드 / 코드 진행 소리 확인 툴.

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

## 3. 예상 화면
CHORDS

Key: [C] [D] [E] [F] [G] [A] [B]

Chord: [C] [Dm] [Em] [F] [G] [Am]

Progression: [1-5-6-4] [1-6-4-5] [1-4-5] [1-5-4]

Current: C - G - Am - F

▶ PLAY

## 4. 기타 사운드
단순한 피아노/신스 음보다 실제 기타로 코드 진행을 연주하는 느낌을 우선한다.
- 기타 스트럼 기반 재생
- 일정한 기본 BPM
- 코드 간 자연스러운 연결
- 설정 없이 즉시 재생

## 5. 핵심 데이터 구조
Major scale degree: 1=I, 2=ii, 3=iii, 4=IV, 5=V, 6=vi, 7=vii°

C Major:
1=C, 2=Dm, 3=Em, 4=F, 5=G, 6=Am, 7=Bdim

1-5-6-4 → C-G-Am-F
D Major에서는 1-5-6-4 → D-A-Bm-G

## 6. 대표 진행
- 1-5-6-4
- 6-4-1-5
- 1-4-5
- 1-6-4-5
- 1-5-4
- 6-5-4-5

이는 평가나 추천이 아니라 빠르게 들어보기 위한 프리셋이다.

## 7. 모바일 Chrome 오디오 이슈
모바일 Chrome에서는 페이지 로딩 시 생성한 Web Audio의 AudioContext가 suspended 상태로 남을 수 있다.
따라서 첫 사용자 터치에서 오디오 컨텍스트를 활성화해야 한다.

권장 구현:

let audioContext;

async function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state !== 'running') await audioContext.resume();
}

button.addEventListener('click', async () => {
  await ensureAudio();
  playChord();
});

원칙:
- 첫 코드/진행 버튼의 사용자 gesture 안에서 resume
- 필요하면 별도의 소리 켜기 버튼 제공
- iOS Safari / 모바일 Chrome에서 직접 테스트
- 오디오 실패가 UI 전체를 멈추게 하지 않음

## 8. 기존 제품 조사
ManyHand Chord Player — 코드와 코드 진행을 버튼으로 선택하고 재생하는 경험이 프로젝트와 상당히 유사하다.
https://manyhand.com/chords/

ChordProgressions.org — 코드 진행과 기타 운지를 함께 확인할 수 있는 참고 사례.
https://chordprogressions.org/

MuseScore Chord Progression Player — 대표적인 코드 진행을 선택하고 재생하는 참고 사례.
https://musescore.com/tools/chord-progression-player

MoChord — 기타 코드, 프렛보드, 진행, 재생 등을 포함하는 오픈소스 참고 프로젝트.
https://github.com/Mocha-Yuan/MoChord

## 9. 차별화 방향
기능을 계속 추가하는 대신 극단적으로 단순한 사용 경험을 목표로 한다.

앱 열기 → Key 선택 → 코드 또는 숫자 진행 선택 → 바로 기타 소리

사용자가 작곡 프로그램을 배우는 느낌을 받으면 실패한 것으로 본다.

## 10. MVP
P0
- [ ] Key 선택
- [ ] 다이아토닉 코드 버튼
- [ ] 코드 즉시 재생
- [ ] 숫자 코드 진행 버튼
- [ ] 진행 즉시 재생
- [ ] 모바일 Chrome 오디오 활성화
- [ ] 기타 계열 사운드

P1
- [ ] BPM
- [ ] 스트럼 속도
- [ ] 진행 직접 조합
- [ ] 코드 순서 변경
- [ ] 반복 재생

P2
- [ ] 기타 보이싱 선택
- [ ] 카포
- [ ] 코드 운지 표시
- [ ] 진행 저장 / 공유

## 11. 개발 판단
첫 버전은 작게 만든다.

'코드 진행을 생성하는 앱'이 아니라 '코드 진행을 3초 만에 들어보는 앱'으로 정의한다.

핵심 검증 질문:
기타를 치다가 이 진행이 어떤 느낌이지?라는 순간에 앱을 열었을 때 5초 안에 답을 얻을 수 있는가?