import sys, json, re
from pathlib import Path
import numpy as np, soundfile as sf
from huggingface_hub import hf_hub_download
from style_bert_vits2.nlp import bert_models
from style_bert_vits2.constants import Languages
from style_bert_vits2.tts_model import TTSModel
bert_models.load_model(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
bert_models.load_tokenizer(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
voice = sys.argv[1]; files = {"M1": "jvnv-M1-jp/jvnv-M1-jp_e158_s14000.safetensors", "M2": "jvnv-M2-jp/jvnv-M2-jp_e159_s17000.safetensors"}
mf = files[voice]; d = mf.split("/")[0]
root = Path("tts/model_assets")
for f in [mf, f"{d}/config.json", f"{d}/style_vectors.npy"]:
    hf_hub_download("litagin/style_bert_vits2_jvnv", f, local_dir=root)
model = TTSModel(model_path=root / mf, config_path=root / d / "config.json", style_vec_path=root / d / "style_vectors.npy", device="cpu")
def norm(s):
    s = s.replace("ASEAN", "アセアン").replace("——", "").replace("GDP", "ジーディーピー")
    s = s.replace("2％", "2パーセント").replace("「", "").replace("」", "")
    return s
items = json.load(open(sys.argv[2]))  # list of {"id":..., "text":...}
outdir = Path(sys.argv[3]); outdir.mkdir(parents=True, exist_ok=True)
for it in items:
    sr, audio = model.infer(text=norm(it["text"]), length=float(sys.argv[4]) if len(sys.argv) > 4 else 1.08, style="Neutral", sdp_ratio=0.2, noise=0.5, noise_w=0.7)
    sf.write(outdir / f"{it['id']}.wav", audio, sr)
    print(it["id"], len(audio) / sr, flush=True)
