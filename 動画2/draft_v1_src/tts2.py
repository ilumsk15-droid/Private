import sys, json
from pathlib import Path
import soundfile as sf
from huggingface_hub import hf_hub_download
from style_bert_vits2.nlp import bert_models
from style_bert_vits2.constants import Languages
from style_bert_vits2.tts_model import TTSModel
bert_models.load_model(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
bert_models.load_tokenizer(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
FILES = {"M1": "jvnv-M1-jp/jvnv-M1-jp_e158_s14000.safetensors", "M2": "jvnv-M2-jp/jvnv-M2-jp_e159_s17000.safetensors"}
root = Path("tts/model_assets"); models = {}
def model(v):
    if v not in models:
        mf = FILES[v]; d = mf.split("/")[0]
        for f in [mf, f"{d}/config.json", f"{d}/style_vectors.npy"]: hf_hub_download("litagin/style_bert_vits2_jvnv", f, local_dir=root)
        models[v] = TTSModel(model_path=root / mf, config_path=root / d / "config.json", style_vec_path=root / d / "style_vectors.npy", device="cpu")
    return models[v]
def norm(s):
    return s.replace("ASEAN", "アセアン").replace("——", "").replace("GDP", "ジーディーピー").replace("2％", "2パーセント").replace("「", "").replace("」", "")
presets = json.load(open(sys.argv[1]))   # {name: {voice, params}}
items = json.load(open(sys.argv[2])); out = Path(sys.argv[3])
for name, pz in presets.items():
    od = out / name; od.mkdir(parents=True, exist_ok=True)
    m = model(pz["voice"])
    for it in items:
        sr, a = m.infer(text=norm(it["text"]), style="Neutral", **pz["params"])
        sf.write(od / f"{it['id']}.wav", a, sr); print(name, it["id"], round(len(a) / sr, 2), flush=True)
