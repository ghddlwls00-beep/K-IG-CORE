"""LECTURE voice — step C (cross-check): transcribe an original with faster-whisper (local, CPU), word times.

    python scripts/lecture/voice/transcribe-whisper.py <id> [<id> ...]   (model: large-v3-turbo, int8, CPU — slow)

Input  .lecture-media/voice/<id>/orig.wav   Output .lecture-media/voice/<id>/whisper.json
    { "language": ..., "segments": [ { "start", "end", "text", "words": [ { "start", "end", "word", "probability" } ] } ] }
Paid content: stays in .lecture-media (git-ignored).
"""
import json
import os
import sys
import time
import wave

import numpy as np
from faster_whisper import WhisperModel


def read_wav_16k(path):
    """16 kHz mono PCM16 → float32 samples (the installed PyAV is older than faster-whisper's decoder expects)."""
    with wave.open(path, "rb") as w:
        assert w.getframerate() == 16000 and w.getnchannels() == 1 and w.getsampwidth() == 2, "need 16 kHz mono PCM16"
        data = w.readframes(w.getnframes())
    return np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
VOICE = os.path.join(ROOT, ".lecture-media", "voice")

model = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
for lecture_id in sys.argv[1:]:
    wav = os.path.join(VOICE, lecture_id, "orig.wav")
    out = os.path.join(VOICE, lecture_id, "whisper.json")
    t0 = time.time()
    # the teacher explains in Korean and reads the passage in English: no fixed language, VAD to skip silence
    segments, info = model.transcribe(read_wav_16k(wav), word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False)
    rows = []
    for s in segments:
        rows.append({
            "start": round(s.start, 3), "end": round(s.end, 3), "text": s.text,
            "words": [{"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word, "probability": round(w.probability, 3)} for w in (s.words or [])],
        })
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"language": info.language, "language_probability": round(info.language_probability, 3), "duration": info.duration, "segments": rows}, f, ensure_ascii=False, indent=1)
    words = sum(len(r["words"]) for r in rows)
    print(f"{lecture_id}: {info.language} ({info.language_probability:.2f}) · segments {len(rows)} · words {words} · {time.time() - t0:.0f} s → {out}", flush=True)
