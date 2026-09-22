/**
 * Fake SpeechRecognition for the LISTENING driver.
 *
 * A real microphone test is IMPOSSIBLE headless (no audio input device, and Chrome's
 * recognizer is an online service), so Step 4 is reported as BLOCKED (real microphone).
 * This stub exercises the WIRING ONLY: listenToSpeech -> evaluatePronunciation ->
 * onSuccess -> shadowScores, the result card, the error branches. Every result it
 * produces is marked "UI wiring only" in the driver's output.
 *
 * window.__fakeTranscript:
 *   string  -> recognised as that transcript
 *   null    -> a "no-speech" error
 *   "__not-allowed__" -> a "not-allowed" error (permission denied branch)
 */
(() => {
  if (window.__kigFakeStt) return;
  window.__kigFakeStt = true;
  window.__fakeTranscript = null;

  class FakeRecognition {
    constructor() {
      this.lang = "en-US";
      this.continuous = false;
      this.interimResults = true;
      this.maxAlternatives = 1;
      this._stopped = false;
    }
    start() {
      setTimeout(() => {
        if (this._stopped) return;
        if (this.onstart) this.onstart({});
        const t = window.__fakeTranscript;
        if (t === null || t === undefined) {
          if (this.onerror) this.onerror({ error: "no-speech" });
          if (this.onend) this.onend({});
          return;
        }
        if (t === "__not-allowed__") {
          if (this.onerror) this.onerror({ error: "not-allowed" });
          if (this.onend) this.onend({});
          return;
        }
        if (this.onresult) {
          const result = [{ 0: { transcript: String(t) }, isFinal: true, length: 1 }];
          result[0].item = (i) => result[0][i];
          const results = { 0: result[0], length: 1, item: (i) => result[i] };
          this.onresult({ resultIndex: 0, results });
        }
        if (this.onend) this.onend({});
      }, 30);
    }
    stop() {
      this._stopped = true;
      if (this.onend) this.onend({});
    }
    abort() {
      this._stopped = true;
    }
    addEventListener() {}
    removeEventListener() {}
  }

  try {
    Object.defineProperty(window, "SpeechRecognition", { value: FakeRecognition, configurable: true, writable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: FakeRecognition, configurable: true, writable: true });
  } catch {
    window.SpeechRecognition = FakeRecognition;
    window.webkitSpeechRecognition = FakeRecognition;
  }
})();
