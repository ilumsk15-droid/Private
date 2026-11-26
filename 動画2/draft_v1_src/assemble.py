import json, sys, wave, os
import numpy as np
items = json.load(open(sys.argv[1])); wavdir = sys.argv[2]; out = sys.argv[3]; estimate = len(sys.argv) > 4
PRE = dict(S1=2.5, S2=1.0, S3=0.8, S4=0.8, S5=2.4, S6=0.8, S7=0.8, S8=0.8, S9=0.8)
POST = dict(S1=5.5, S2=1.6, S3=1.6, S4=2.2, S5=1.2, S6=1.6, S7=2.0, S8=1.6, S9=3.2)
EXTRA = {"S3_00": 0.6, "S4_03": 0.7, "S1_01": 0.3}  # extra pause after these lines
SR = 44100
scenes, audio, cur = [], [], 0.0
def sil(s): audio.append(np.zeros(int(round(s * SR)), np.float32))
order = []
for it in items:
    if not order or order[-1][0] != it["scene"]: order.append((it["scene"], []))
    order[-1][1].append(it)
for sid, its in order:
    sc = {"id": sid, "start": cur, "lines": []}; sil(PRE[sid]); cur += PRE[sid]
    for j, it in enumerate(its):
        if estimate:
            d = len(it["text"]) / 6.0; a = np.zeros(int(d * SR), np.float32)
        else:
            with wave.open(os.path.join(wavdir, it["id"] + ".wav")) as w:
                sr = w.getframerate(); raw = w.readframes(w.getnframes())
            a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
            if sr != SR:
                idx = np.arange(0, len(a), sr / SR); a = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
            # trim leading/trailing near-silence
            nz = np.where(np.abs(a) > 0.01)[0]
            if len(nz): a = a[max(0, nz[0] - 800): nz[-1] + 2400]
            d = len(a) / SR
        sc["lines"].append({"text": it["text"], "start": round(cur, 3), "end": round(cur + d, 3)})
        audio.append(a); cur += d
        if j < len(its) - 1:
            g = 0.32 if its[j + 1]["para"] == it["para"] else 0.75
            g += EXTRA.get(it["id"], 0); sil(g); cur += g
    sil(POST[sid]); cur += POST[sid]; sc["end"] = round(cur, 3); scenes.append(sc)
json.dump({"scenes": scenes, "total": round(cur, 3)}, open(out, "w"), ensure_ascii=False, indent=1)
if not estimate:
    a = np.concatenate(audio); a = a / max(1e-6, np.abs(a).max()) * 0.89
    with wave.open(out.replace(".json", ".wav"), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())
print("total", round(cur, 1), "s")
