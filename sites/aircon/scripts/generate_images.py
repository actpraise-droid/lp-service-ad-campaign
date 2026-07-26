#!/usr/bin/env python3
"""
Gemini APIでINTENSE 法人向けエアコン洗浄LP用の画像を生成するスクリプト。
共有の gemini-lp-automation と同じ .env（GEMINI_API_KEY / GEMINI_IMAGE_MODEL）を使用。
  python3 generate_images.py            # 全画像
  python3 generate_images.py --only hero-bg,before-dirty
標準ライブラリのみで動作（PNGで保存。アスペクト調整・圧縮は別途 compress で行う）。
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "images"))
ENV_FILE = os.path.join(SCRIPT_DIR, ".env")

DEFAULT_MODEL = "gemini-3.1-flash-image"
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

COMMON = (
    "プロフェッショナルな実写風の写真。清潔感と信頼感のある構図。広告的なわざとらしさは避け、"
    "自然なドキュメンタリータッチで。"
    "【重要】画像の中に文字・単語・キャプション・タイポグラフィ・ロゴ・透かしは絶対に描かないこと。被写体のみの純粋な写真。"
)

JOBS = [
    ("industry-01", "industry-01.png",
     "にぎやかな飲食店・レストランの店内。テーブルと椅子、あたたかい照明。天井には業務用エアコン。"
     "清潔感のある内装。人物なし。横長の構図。"),
    ("industry-02", "industry-02.png",
     "モダンなオフィスの室内。デスクとオフィスチェアが並び、大きな窓から自然光。天井に業務用エアコン。"
     "清潔で整然とした空間。人物なし。横長の構図。"),
    ("industry-03", "industry-03.png",
     "きれいなアパレル・小売店の店内。商品棚とディスプレイ、明るい照明。天井に業務用エアコン。"
     "清潔感のある内装。人物なし。横長の構図。"),
    ("industry-04", "industry-04.png",
     "清潔なクリニック・医療機関の待合室。ソファと受付、明るく衛生的な空間。天井に業務用エアコン。"
     "人物なし。横長の構図。"),
    ("industry-05", "industry-05.png",
     "明るく清潔な介護施設の共用スペース。ゆったりした椅子とテーブル、大きな窓。天井に業務用エアコン。"
     "落ち着いた雰囲気。人物なし。横長の構図。"),
    ("industry-06", "industry-06.png",
     "広い工場または倉庫の内部。天井が高く、設備や棚が並ぶ。天吊り形や大型の業務用空調設備が見える。"
     "整然とした産業空間。人物なし。横長の構図。"),

    ("article-mold", "article-mold.png",
     "業務用エアコンの吹き出し口（ルーバー）のクローズアップ。羽根の表面や奥に黒いカビと"
     "ホコリが点々と付着している、汚れて不衛生な状態。リアルで生々しい質感。明るめの照明で"
     "汚れがはっきり分かる。人物なし。横長16:9の構図。"),

    ("hero-bg", "hero-bg.png",
     "オフィスまたは店舗の天井に設置された業務用の天井カセット形エアコンを、作業服の技術者が"
     "パネルを外して洗浄・メンテナンスしている場面。深いネイビーブルーの色調で落ち着いた"
     "シネマティックな雰囲気。顔ははっきり写らない。全体的に暗めのトーンで、上に白い文字を"
     "重ねても読めるようにする。横長16:9の構図。"),

    ("service-ceiling", "service-ceiling.png",
     "オフィスの天井に設置された白い業務用エアコン（天井カセット形・4方向吹き出し）を、"
     "作業服の技術者が高圧洗浄機で洗浄している場面。養生シートで保護され、明るく清潔感のある室内、"
     "自然光。プロの丁寧な作業の雰囲気。顔ははっきり写らない。横長の構図。"),

    ("service-wall", "service-wall.png",
     "事務所の壁に設置された業務用の壁掛け形エアコンを、作業服の技術者が分解して内部を"
     "クリーニングしている場面。養生され、明るく清潔感のある室内、自然光。顔ははっきり写らない。横長の構図。"),

    ("service-outdoor", "service-outdoor.png",
     "ビルの外や屋上に並んだ業務用エアコンの室外機（金属製の四角い機器、側面にファン）を、"
     "作業服の技術者が洗浄している場面。明るい日中の自然光、清潔でプロフェッショナルな雰囲気。"
     "顔ははっきり写らない。横長の構図。"),

    ("reason-01", "reason-01.png",
     "早朝または夜、営業していない静かな飲食店・オフィスの店内で、作業服の技術者が"
     "業務用エアコンのメンテナンスをしている場面。落ち着いた照明。営業時間外の作業をイメージ。"
     "顔ははっきり写らない。横長の構図。"),

    ("reason-02", "reason-02.png",
     "きれいなデスクの上に置かれた請求書などの書類とボールペン、電卓。明るく清潔なオフィスの自然光。"
     "法人向けの事務手続きをイメージさせる。人物なし。横長の構図。"),

    ("reason-03", "reason-03.png",
     "日本の街並みに並ぶ複数の店舗・商業ビルの外観。明るい日中。チェーン店や複数拠点をイメージさせる。"
     "人物なし。横長の構図。"),

    ("reason-04", "reason-04.png",
     "作業用手袋をした技術者の手元のクローズアップ。業務用エアコンの内部（アルミの熱交換器フィンや"
     "送風ファン）を専用ブラシや高圧洗浄で丁寧に洗浄している。明るい自然光でプロフェッショナルな雰囲気。"
     "顔は写らない。横長の構図。"),

    ("reason-05", "reason-05.png",
     "見積書とボールペン、電卓が置かれた明るく清潔なデスク。分かりやすく誠実な料金提示をイメージ。"
     "人物なし。横長の構図。"),

    ("reason-06", "reason-06.png",
     "日本の都市の広がりを俯瞰した明るい風景。街とビル群が広がり、広域対応をイメージさせる。"
     "晴れた日中。人物なし。横長の構図。"),

    ("before-dirty", "before-dirty.png",
     "業務用エアコンの内部（送風ファンとアルミの熱交換器フィン）のクローズアップ。長年使用され、"
     "黒いカビ・ホコリ・汚れがびっしり付着して非常に汚れている状態。リアルで生々しい質感。"
     "明るめの照明で汚れがはっきり分かる。人物なし。横長16:9の構図。"),

    ("after-clean", "after-clean.png",
     "洗浄後の業務用エアコンの内部（送風ファンとアルミの熱交換器フィン）のクローズアップ。"
     "汚れやカビが完全に取り除かれ、新品のように清潔でピカピカな状態。明るい照明で清潔感が伝わる。"
     "before-dirtyと同じアングル・構図。人物なし。横長16:9の構図。"),
]


def load_env():
    env = dict(os.environ)
    if os.path.isfile(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def generate_image(api_key, model, prompt):
    url = f"{API_BASE}/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def extract_image_bytes(response_json):
    for cand in response_json.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                return base64.b64decode(inline["data"]), mime
    return None, None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only")
    parser.add_argument("--model")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("GEMINI_API_KEY")
    model = args.model or env.get("GEMINI_IMAGE_MODEL") or DEFAULT_MODEL
    if not api_key:
        print(f"エラー: {ENV_FILE} に GEMINI_API_KEY がありません。", file=sys.stderr)
        sys.exit(1)

    only = set(args.only.split(",")) if args.only else None
    jobs = [j for j in JOBS if not only or j[0] in only]
    os.makedirs(IMAGES_DIR, exist_ok=True)

    ok, ng = 0, 0
    for key, filename, desc in jobs:
        prompt = f"{COMMON} {desc}"
        print(f"[{key}] 生成中 ({model}) -> {filename}")
        try:
            resp = generate_image(api_key, model, prompt)
            img_bytes, mime = extract_image_bytes(resp)
            if not img_bytes:
                print(f"  失敗: 画像データなし: {json.dumps(resp, ensure_ascii=False)[:400]}")
                ng += 1
                continue
            with open(os.path.join(IMAGES_DIR, filename), "wb") as f:
                f.write(img_bytes)
            print(f"  保存: {filename} ({mime}, {len(img_bytes)} bytes)")
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"  APIエラー ({e.code}): {e.read().decode('utf-8', errors='replace')[:600]}")
            ng += 1
        except Exception as e:
            print(f"  エラー: {e}")
            ng += 1
        time.sleep(2)

    print(f"\n完了: 成功 {ok} 件 / 失敗 {ng} 件")
    if ng:
        sys.exit(1)


if __name__ == "__main__":
    main()
