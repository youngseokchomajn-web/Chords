import { NoteName } from '../types/music';
import { getDiatonicChords } from '../theory/notes';
import { ProgressionItem } from '../types/progression';
import { getChordDefinition, getAvailableVoicings } from '../theory/chordBuilder';

export interface MoneyChordPreset {
  id: string;
  title: string;
  badge: string;
  degrees: number[];
  degreeText: string;
  mood: string;
  famousSongs: string[];
  description: string;
}

export const MONEY_CHORDS: MoneyChordPreset[] = [
  {
    id: 'pop_4chord',
    title: '팝의 불패 공식 (4-Chord)',
    badge: '★ 가장 인기',
    degrees: [1, 5, 6, 4],
    degreeText: '1 - 5 - 6 - 4',
    mood: '벅차오름, 속 시원함, 대중적인 쾌감',
    famousSongs: ['버스커버스커 - 벚꽃엔딩', '비틀즈 - Let It Be', 'Adele - Someone Like You'],
    description: '전 세계 팝과 가요 수백 곡에 쓰인 마법의 머니코드'
  },
  {
    id: 'emotional_pop',
    title: '새벽 감성 팝',
    badge: '감성 폭발',
    degrees: [6, 4, 1, 5],
    degreeText: '6 - 4 - 1 - 5',
    mood: '몽환적, 아련함, 세련된 슬픔',
    famousSongs: ['Alan Walker - Faded', '악뮤(AKMU) 노래 다수', '감성 팝 발라드'],
    description: '마이너(단조)로 시작해 아련하게 빠져드는 감성 코드'
  },
  {
    id: 'royal_road',
    title: 'K-POP / 애니 벅참 (왕도 진행)',
    badge: '킬링 후렴',
    degrees: [4, 5, 3, 6],
    degreeText: '4 - 5 - 3 - 6',
    mood: '극적인 전개, 가슴 뭉클한 하이라이트',
    famousSongs: ['아이유 - 좋은 날', 'J-POP / 애니송 명곡', '가요 후렴구 단골'],
    description: '후렴구에 들어서는 순간 소름 돋게 만드는 한국/일본 음악의 치트키'
  },
  {
    id: 'canon',
    title: '클래식 & 캐논 진행',
    badge: '힐링 & 기품',
    degrees: [1, 5, 6, 3, 4, 1, 4, 5],
    degreeText: '1 - 5 - 6 - 3 - 4 - 1 - 4 - 5',
    mood: '편안하고 따뜻함, 익숙한 힐링',
    famousSongs: ['자전거 탄 풍경 - 너에게 난 나에게 넌', '신승훈 - I Believe'],
    description: '파헬벨 캐논에서 유래한 한국인이 가장 사랑하는 화성'
  },
  {
    id: 'doo_wop',
    title: '레트로 50s 둘왑 발라드',
    badge: '달콤한 고백',
    degrees: [1, 6, 4, 5],
    degreeText: '1 - 6 - 4 - 5',
    mood: '따뜻한 옛날 감성, 안정적인 순환',
    famousSongs: ['Ben E. King - Stand By Me', '포크/발라드 명곡'],
    description: '끝없이 기분 좋게 맴도는 클래식 레트로 발라드의 정석'
  },
  {
    id: 'folk_3chord',
    title: '통기타 3화음 치트키',
    badge: '초보 첫걸음',
    degrees: [1, 4, 5, 1],
    degreeText: '1 - 4 - 5 - 1',
    mood: '신나고 맑은 캠핑송, 포크/록',
    famousSongs: ['동물원 노래', '비틀즈 초기곡', '캠핑/포크송 다수'],
    description: '오직 3개 코드로 노래가 완성되는 캠핑/포크 필수 진행'
  }
];

export function buildProgressionFromDegrees(
  key: NoteName,
  degrees: number[],
  prefix = 'simple'
): ProgressionItem[] {
  const diatonic = getDiatonicChords(key, false);
  return degrees.map((deg, i) => {
    const info = diatonic[deg - 1];
    const root = info ? info.root : key;
    const quality = info ? info.quality : 'major';
    const def = getChordDefinition(root, quality);
    const voicings = getAvailableVoicings(root, quality);
    const voicingType = voicings.some(v => v.type === 'open') ? 'open' : (voicings[0]?.type || 'barre');
    return {
      id: `${prefix}_${Date.now()}_${i}`,
      chordName: def.displayName,
      root,
      quality,
      degree: deg,
      voicingType
    };
  });
}

export function getDifficultyBadge(chordNames: string[]): { text: string; isEasy: boolean } {
  const hasBarre = chordNames.some(c => c.startsWith('F') || c.startsWith('B') || c.includes('#') || c.includes('b'));
  if (!hasBarre) {
    return { text: '✨ F코드 없음 (초보자 쉬운 연주)', isEasy: true };
  }
  return { text: '🎸 바레코드 포함 (F or B 계열)', isEasy: false };
}
