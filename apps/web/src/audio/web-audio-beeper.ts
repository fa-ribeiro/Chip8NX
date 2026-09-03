const BEEP_FREQUENCY_HZ = 440;
const BEEP_GAIN = 0.05;
const GAIN_RAMP_SECONDS = 0.005;

type AudioContextFactory = () => AudioContext;

/**
 * Produces the simple CHIP-8 buzzer tone using the Web Audio API.
 *
 * The beeper owns host audio presentation only. CHIP-8 timing remains owned
 * by the Core sound timer.
 *
 * Audio creation is lazy because browsers generally require Web Audio to be
 * created or resumed from a user gesture.
 */
export class WebAudioBeeper {
  private context: AudioContext | undefined;
  private gain: GainNode | undefined;

  private requestedActive = false;
  private appliedActive: boolean | undefined;

  public constructor(
    private readonly createAudioContext: AudioContextFactory = () => new AudioContext(),
  ) {}

  /**
   * Creates and resumes the Web Audio graph.
   *
   * Call this from a browser user gesture so autoplay policy can permit sound.
   */
  public async unlock(): Promise<void> {
    const context = this.ensureAudioGraph();

    if (context.state === "suspended") {
      await context.resume();
    }

    this.applyRequestedState();
  }

  /**
   * Requests whether the CHIP-8 buzzer should currently be audible.
   */
  public setActive(active: boolean): void {
    this.requestedActive = active;

    this.applyRequestedState();
  }

  private ensureAudioGraph(): AudioContext {
    if (this.context !== undefined) {
      return this.context;
    }

    const context = this.createAudioContext();

    const oscillator = context.createOscillator();

    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = BEEP_FREQUENCY_HZ;

    gain.gain.value = 0;

    oscillator.connect(gain);
    gain.connect(context.destination);

    /*
     * Keep one oscillator alive for the page lifetime and gate it through the
     * gain node. This avoids repeatedly creating oscillator nodes for every
     * CHIP-8 sound-timer transition.
     */
    oscillator.start();

    this.context = context;
    this.gain = gain;

    return context;
  }

  private applyRequestedState(): void {
    const context = this.context;
    const gain = this.gain;

    if (
      context === undefined ||
      gain === undefined ||
      context.state !== "running" ||
      this.appliedActive === this.requestedActive
    ) {
      return;
    }

    const targetGain = this.requestedActive ? BEEP_GAIN : 0;

    const now = context.currentTime;

    /*
     * A very short ramp avoids audible clicks when the buzzer switches on
     * and off while remaining effectively instantaneous to the user.
     */
    gain.gain.cancelScheduledValues(now);

    gain.gain.setValueAtTime(gain.gain.value, now);

    gain.gain.linearRampToValueAtTime(targetGain, now + GAIN_RAMP_SECONDS);

    this.appliedActive = this.requestedActive;
  }
}
