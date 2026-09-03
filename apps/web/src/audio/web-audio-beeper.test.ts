import { assertEquals } from "@std/assert";
import { WebAudioBeeper } from "./web-audio-beeper.ts";

Deno.test("WebAudioBeeper creates audio lazily when unlocked", async () => {
  const context = new FakeAudioContext();

  let creations = 0;

  const beeper = new WebAudioBeeper(() => {
    creations++;

    return context as unknown as AudioContext;
  });

  assertEquals(creations, 0);

  await beeper.unlock();

  assertEquals(creations, 1);
  assertEquals(context.oscillator.started, true);

  assertEquals(context.oscillator.type, "square");

  assertEquals(context.oscillator.frequency.value, 440);

  assertEquals(context.state, "running");
});

Deno.test("WebAudioBeeper gates the tone through gain", async () => {
  const context = new FakeAudioContext();

  const beeper = new WebAudioBeeper(() => context as unknown as AudioContext);

  await beeper.unlock();

  beeper.setActive(true);

  assertEquals(context.gain.gain.lastTarget, 0.05);

  beeper.setActive(false);

  assertEquals(context.gain.gain.lastTarget, 0);
});

Deno.test("WebAudioBeeper remembers requested state before audio is unlocked", async () => {
  const context = new FakeAudioContext();

  const beeper = new WebAudioBeeper(() => context as unknown as AudioContext);

  beeper.setActive(true);

  await beeper.unlock();

  assertEquals(context.gain.gain.lastTarget, 0.05);
});

class FakeAudioParam {
  public value = 0;

  public lastTarget: number | undefined;

  public cancelScheduledValues(_startTime: number): AudioParam {
    return this as unknown as AudioParam;
  }

  public setValueAtTime(value: number, _startTime: number): AudioParam {
    this.value = value;

    return this as unknown as AudioParam;
  }

  public linearRampToValueAtTime(value: number, _endTime: number): AudioParam {
    this.value = value;
    this.lastTarget = value;

    return this as unknown as AudioParam;
  }
}

class FakeOscillator {
  public type: OscillatorType = "sine";

  public readonly frequency = new FakeAudioParam();

  public started = false;

  public connect(_destination: AudioNode): AudioNode {
    return _destination;
  }

  public start(): void {
    this.started = true;
  }
}

class FakeGain {
  public readonly gain = new FakeAudioParam();

  public connect(destination: AudioNode): AudioNode {
    return destination;
  }
}

class FakeAudioContext {
  public state: AudioContextState = "suspended";

  public readonly currentTime = 1;

  public readonly destination = {} as AudioDestinationNode;

  public readonly oscillator = new FakeOscillator();

  public readonly gain = new FakeGain();

  public createOscillator(): OscillatorNode {
    return this.oscillator as unknown as OscillatorNode;
  }

  public createGain(): GainNode {
    return this.gain as unknown as GainNode;
  }

  public resume(): Promise<void> {
    this.state = "running";

    return Promise.resolve();
  }
}
