let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

// Global user interaction listener to resume audio context
if (typeof window !== 'undefined') {
  const resumeContext = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  window.addEventListener('click', resumeContext, { once: true });
  window.addEventListener('keydown', resumeContext, { once: true });
}

export function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(523.25, now); // C5
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
  gain.gain.setValueAtTime(0.1, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playErrorSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sawtooth';
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(150, now);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  
  osc.start(now);
  osc.stop(now + 0.25);
}

export function playChimeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  };
  
  playTone(587.33, now, 0.2); // D5
  playTone(659.25, now + 0.1, 0.2); // E5
  playTone(880.00, now + 0.2, 0.4); // A5
}

