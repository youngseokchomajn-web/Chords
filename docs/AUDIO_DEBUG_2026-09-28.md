# Audio debugging — 2026-09-28

## User test findings

1. Guitar playback produces several sounds and then becomes silent.
2. RAW SAMPLE audition: E2 is relatively believable, while most other notes sound unnatural.

## Diagnosis

### Web Audio reliability

The app uses Web Audio `AudioBufferSourceNode` for chord playback. iOS Safari has documented cases where Web Audio can become silent after interruption/backgrounding, and newer WebKit reports also describe tab-wide audio becoming silent even when Web Audio and HTML media elements report successful playback.

Current mitigation:
- `AudioContext.resume()` is checked through `ensureRunning()`.
- The context is recovered on `visibilitychange` and `pageshow`.
- iOS `navigator.audioSession.type = 'transient'` is feature-detected when available.
- Each strum now calls `ensureRunning()` before scheduling voices.

This is a mitigation, not a guarantee against every Safari/WebKit audio-session failure.

### Sample quality

The existing ten WAV files are valid PCM16 mono 44.1 kHz files and their measured fundamentals correspond to their labeled MIDI notes. Therefore the main problem is not the WAV decoder or an obvious pitch-label mismatch.

The samples nevertheless have inconsistent timbral balance. Some notes have a strong upper harmonic dominating the fundamental, which matches the subjective report that E2 is usable but several other raw notes sound strange.

Therefore:
- Do not keep tuning the WAV parser as the primary fix.
- Do not add EQ/compression to the RAW SAMPLE path just to hide the source problem.
- Replace the sample set with a more consistent recorded guitar library.

## Candidate replacement sources

- FreePats FSS Steel-String Acoustic Guitar: recorded steel-string source, distributed as an SFZ WAV sound bank. The project states that the WAV bank is its best-quality format and describes the licensing as GPLv3-or-later with a special exception.
- ClueSurf wavebase: public-domain individual real-instrument samples, including guitar notes mapped by guitar string. The project states that the files are public domain. Its listed guitar recordings are real instruments without effects, but the guitar is not positioned as an acoustic steel-string library.

For this project, a consistent steel-string acoustic set is preferred over mixing unrelated one-shot samples.

## Next implementation step

1. Finish the iOS/Web Audio recovery test on the deployed page.
2. Replace the current `MartinGM2_*.wav` set only after auditioning a candidate library.
3. Prefer string-aware mapping (sample by guitar string + fret/nearby note), not global nearest-MIDI matching, because the same pitch can have materially different timbre on different guitar strings.
4. Keep RAW SAMPLE audition truly raw.
