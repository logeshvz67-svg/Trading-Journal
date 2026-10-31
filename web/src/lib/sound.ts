// Tiny synthesized sound effects (no audio files to download). Off unless enabled in Settings.
let enabled = false;
let ctx: AudioContext | null = null;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export function playSound(kind: 'good' | 'bad' | 'level' | 'click') {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const notes = { good: [660, 880], bad: [300, 220], level: [523, 659, 784, 1046], click: [700] }[kind];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.18);
    });
  } catch {
    /* audio not available */
  }
}
