# Real Guitar Sample Manifest

Source: Discord SFZ GM Bank, instrument 026 Acoustic Guitar (steel)
Instrument: 2017 Martin HD28 Vintage Series
Author: Jeff Learman
License: Creative Commons CC0
Pinned source revision: 7a9c478fe331f94f246d33332f0adedb25bbbe27

The source instrument contains 16 pitch points from E2 through B5.

Initial Chords subset:
- E2
- G2
- Bb2
- Db3
- E3
- G3
- Bb3
- Db4
- E4
- Ab4

Playback rule:
1. Use the nearest available sample.
2. Pitch-shift with playbackRate.
3. Add a short offset between strings for strumming.
4. Keep the existing chord voicing and rhythm system.

Runtime path:
public/samples/guitar/

If a sample is unavailable, the app falls back to the existing lightweight synthesized guitar tone.
