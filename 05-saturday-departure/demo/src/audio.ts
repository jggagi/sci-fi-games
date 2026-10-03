/** Original, local Web Audio synthesis. Never starts before an explicit unmute gesture. */
export class EnvironmentAudio {
  private context?: AudioContext;
  private master?: GainNode;
  async setMuted(muted: boolean) {
    if (muted) {
      if (this.context) await this.context.suspend();
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.06;
      this.master.connect(this.context.destination);
      // Quiet ventilation and a gently beating electrical hum, authored for this demo.
      for (const frequency of [74, 74.4, 147]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = frequency > 100 ? 0.13 : 0.28;
        oscillator.connect(gain).connect(this.master);
        oscillator.start();
      }
    }
    await this.context.resume();
  }
  lamp() {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(480, now);
    oscillator.frequency.exponentialRampToValueAtTime(640, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.25);
  }
}
