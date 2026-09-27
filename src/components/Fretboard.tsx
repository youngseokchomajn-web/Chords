import React from 'react';
import { GuitarVoicing } from '../types/music';

interface FretboardProps {
  voicing: GuitarVoicing;
  chordName: string;
  onPlayString?: (stringIdx: number, fret: number) => void;
}

export const Fretboard: React.FC<FretboardProps> = ({ voicing, chordName, onPlayString }) => {
  const { frets, baseFret = 1 } = voicing;
  const numFrets = 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
      <h2 style={{ margin: '8px 0', fontSize: '24px', fontWeight: 'bold' }}>{chordName}</h2>
      <svg width="240" height="280" viewBox="0 0 240 280" style={{ background: '#fff', borderRadius: '8px' }}>
        {/* Nut or Base Fret */}
        {baseFret === 1 ? (
          <line x1="30" y1="40" x2="210" y2="40" stroke="#111" strokeWidth="6" strokeLinecap="round" />
        ) : (
          <>
            <text x="16" y="65" fontSize="14" fontWeight="bold" fill="#555">{baseFret}fr</text>
            <line x1="30" y1="40" x2="210" y2="40" stroke="#888" strokeWidth="2" />
          </>
        )}

        {/* Fret lines */}
        {[1, 2, 3, 4, 5].map((fret) => (
          <line key={fret} x1="30" y1={40 + fret * 42} x2="210" y2={40 + fret * 42} stroke="#bbb" strokeWidth="1.5" />
        ))}

        {/* Strings (6 strings: 30px to 210px) */}
        {[0, 1, 2, 3, 4, 5].map((strIdx) => {
          const x = 30 + strIdx * 36;
          const strokeWidth = 2.5 - strIdx * 0.3;
          return <line key={strIdx} x1={x} y1="40" x2={x} y2="250" stroke="#444" strokeWidth={strokeWidth} />;
        })}

        {/* Frets markers (Mute / Open / Finger Dots) */}
        {frets.map((fret, strIdx) => {
          const stringNum = 6 - strIdx;
          const x = 30 + strIdx * 36;

          if (fret === -1) {
            return (
              <text key={strIdx} x={x} y="28" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#d32f2f">
                ✕
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={strIdx}
                cx={x}
                cy="24"
                r="7"
                fill="none"
                stroke="#111"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onClick={() => onPlayString?.(stringNum, 0)}
              />
            );
          }
          const relFret = fret - baseFret + 1;
          if (relFret >= 1 && relFret <= numFrets) {
            const y = 40 + relFret * 42 - 21;
            return (
              <circle
                key={strIdx}
                cx={x}
                cy={y}
                r="10"
                fill="#111"
                style={{ cursor: 'pointer' }}
                onClick={() => onPlayString?.(stringNum, fret)}
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};
