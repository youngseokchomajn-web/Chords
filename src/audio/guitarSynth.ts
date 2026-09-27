import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

const SAMPLE_PATH = '/samples/guitar';
const SAMPLES = [
  [40,'MartinGM2_040__E2_1.wav'],[43,'MartinGM2_043__G2_1.wav'],[46,'MartinGM2_046_Bb2_1.wav'],
  [49,'MartinGM2_049_Db3_1.wav'],[52,'MartinGM2_052__E3_1.wav'],[55,'MartinGM2_055__G3_1.wav'],
  [58,'MartinGM2_058_Bb3_1.wav'],[61,'MartinGM2_061_Db4_1.wav'],[64,'MartinGM2_064__E4_1.wav'],
  [68,'MartinGM2_068_Ab4_1.wav']
] as const;

const cache = new Map<number, AudioBuffer>();
const pending = new Map<number, Promise<AudioBuffer>>();

function nearest(midi:number) {
  return SAMPLES.reduce((a,b) => Math.abs(b[0]-midi) < Math.abs(a[0]-midi) ? b : a);
}

async function sampleFor(midi:number) {
  const [sampleMidi,file] = nearest(midi);
  const cached = cache.get(sampleMidi);
  if (cached) return {buffer:cached,sampleMidi};
  const existing = pending.get(sampleMidi);
  if (existing) return {buffer:await existing,sampleMidi};

  const ctx = audioContextManager.getContext();
  const job = fetch(`${SAMPLE_PATH}/${file}`)
    .then(r => { if (!r.ok) throw new Error('sample missing'); return r.arrayBuffer(); })
    .then(b => ctx.decodeAudioData(b))
    .then(b => { cache.set(sampleMidi,b); pending.delete(sampleMidi); return b; });
  pending.set(sampleMidi,job);
  return {buffer:await job,sampleMidi};
}

function fallback(stringIdx:number,fret:number,offset:number,velocity:number) {
  const now=startAt;
  const freq=midiToFrequency(STANDARD_TUNING_MIDI[stringIdx]+fret);
  const gain=ctx.createGain(); gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(velocity*.55,now+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,now+1.35);
  const osc=ctx.createOscillator(); osc.type='triangle'; osc.frequency.value=freq;
  osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now+1.4);
}

export class GuitarSoundEngine {
  public static async playString(stringIdx:number,fret:number,offset=0,velocity=.8) {
    if(fret<0)return;
    const target=STANDARD_TUNING_MIDI[stringIdx]+fret;
    const ctx=audioContextManager.getContext();
    const startAt=ctx.currentTime+offset;
    try {
      const {buffer,sampleMidi}=await sampleFor(target);
      const ctx=audioContextManager.getContext(), now=ctx.currentTime+offset;
      const source=ctx.createBufferSource(); source.buffer=buffer;
      source.playbackRate.value=Math.pow(2,(target-sampleMidi)/12);
      const gain=ctx.createGain(); gain.gain.setValueAtTime(.0001,now);
      gain.gain.linearRampToValueAtTime(velocity*.82,now+.004);
      gain.gain.exponentialRampToValueAtTime(.0001,now+Math.min(2.8,Math.max(.75,buffer.duration)));
      source.connect(gain).connect(ctx.destination); source.start(now);
    } catch { fallback(stringIdx,fret,offset,velocity); }
  }

  public static strum(frets:[number,number,number,number,number,number],options:StrumOptions={}) {
    const speed=options.speedSec??.025, dir=options.direction??'down', vel=options.velocity??.8;
    const indices=dir==='down'?[0,1,2,3,4,5]:[5,4,3,2,1,0];
    indices.forEach((idx,pos)=>{
      const fret=frets[idx]; if(fret<0)return;
      void this.playString(6-idx,fret,Math.max(0,pos*speed+((pos%3)-1)*.002),vel*(.94+(pos%2)*.03));
    });
  }
}
