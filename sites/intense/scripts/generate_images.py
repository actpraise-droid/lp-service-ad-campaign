#!/usr/bin/env python3
"""
Gemini APIでINTENSE給湯器LP用の画像を生成するスクリプト。
使い方:
  scripts/.env に GEMINI_API_KEY=... を記載（su-lineと共通のキーをコピー済み）
  python3 generate_images.py            # 全画像を生成
  python3 generate_images.py --only hero-bg   # 一部だけ生成
標準ライブラリのみで動作。
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

DEFAULT_MODEL = "gemini-2.5-flash-image"
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

COMMON_STYLE = (
    "実写風のプロフェッショナルな写真。清潔感があり信頼感のある構図。"
    "広告的なわざとらしさは避け、自然なドキュメンタリータッチで。"
    "【重要】画像の中に文字・単語・キャプション・タイポグラフィ・ロゴ・透かしは絶対に描かないこと。被写体のみの純粋な写真。"
)

# key, filename, aspect ratio, description
JOBS = [
    (
        "hero-02",
        "hero-02.png",
        "16:9",
        "日本の戸建て住宅の側面に設置された、日本製エコキュートの角型貯湯タンクと室外機型ヒートポンプ。"
        "夕暮れどきの深いネイビーブルーの色調で、落ち着いたシネマティックな雰囲気。全体的に暗めのトーンで、"
        "上に白い文字を重ねても読めるようにする。人物なし。",
    ),
    (
        "hero-03",
        "hero-03.png",
        "16:9",
        "蛇口から勢いよく流れるお湯とわずかに立ちのぼる湯気のクローズアップ。深いネイビーブルーの色調で、"
        "湯気に柔らかな光が反射するシネマティックで温かみのある雰囲気。全体的に暗めのトーンで、"
        "上に白い文字を重ねても読めるようにする。人物なし。",
    ),
    (
        "before-gas",
        "before-gas.png",
        "16:9",
        "日本の戸建て住宅の窯業系サイディング外壁に長年設置され、古く劣化した壁掛け式ガス給湯器。"
        "筐体は色褪せて黄ばみ、雨だれの黒ずみと錆が浮き、排気口ルーバーは変色している。"
        "下部の配管の保温材は破れて劣化している。曇り空の下の自然光で、全体的にくすんだ印象。"
        "product-gasと同じく給湯器を正面やや斜めからとらえた構図。人物なし。"
        "日本の古い住宅設備の実例写真のような、リアルで生活感のある雰囲気。",
    ),
    (
        "reason-01",
        "reason-01.png",
        "4:3",
        "作業服を着た設備業者が工具箱を持って住宅へ向かって歩いている場面。明るい日中の自然光、"
        "清潔感のある住宅街。スピード感と信頼感のある雰囲気。人物の顔ははっきり写らない。",
    ),
    (
        "reason-02",
        "reason-02.png",
        "4:3",
        "きれいなデスクの上に置かれた見積書とボールペン、電卓。明るく清潔な事務所の自然光。"
        "誠実で分かりやすい料金提示をイメージさせる。人物なし。",
    ),
    (
        "reason-03",
        "reason-03.png",
        "4:3",
        "作業用手袋をした職人の手元のクローズアップ。住宅の壁掛け式ガス給湯器の配管を工具で"
        "接続している場面。明るい自然光で、丁寧でプロフェッショナルな作業の雰囲気。顔は写らない。",
    ),
    (
        "reason-04",
        "reason-04.png",
        "4:3",
        "日本の穏やかな住宅街の風景。戸建て住宅が並び、青空が広がる明るい日中。"
        "地域に密着した安心感のある雰囲気。人物なし。",
    ),
    (
        "reason-05",
        "reason-05.png",
        "4:3",
        "作業服の担当者がクリップボードを持ち、住宅の給湯器を点検・確認している場面。"
        "明るい自然光、丁寧な現地調査の雰囲気。顔ははっきり写らない。",
    ),
    (
        "reason-06",
        "reason-06.png",
        "4:3",
        "住宅の外壁にきれいに新しく設置された壁掛け式ガス給湯器のクローズアップ。配管も整然と"
        "仕上げられている。明るい自然光で、安心・保証をイメージさせる清潔で丁寧な仕上がり。人物なし。",
    ),
    (
        "hero-bg",
        "hero-bg.png",
        "16:9",
        "日本の戸建て住宅の窯業系サイディング外壁に設置された、日本製の壁掛け式ガス給湯器"
        "（縦長の長方形でアイボリーホワイトの金属筐体、前面上部に横長のステンレス排気口ルーバー、"
        "筐体下部から銅管と白い給水管が数本、化粧カバー付きで壁沿いに配管）を、"
        "作業服の作業員が点検している場面。手元中心で顔は写らない。"
        "深いネイビーブルーの色調で落ち着いたシネマティックな雰囲気。全体的に暗めのトーンで、"
        "上に白い文字を重ねても読めるようにする。日本の住宅街の風景。",
    ),
    (
        "product-gas",
        "product-gas.png",
        "16:9",
        "日本の戸建て住宅の外壁に取り付けられた、新品の日本製壁掛け式ガス給湯器（24号クラス）。"
        "縦長の長方形でアイボリーホワイトの金属筐体、前面上部に横長のステンレス製排気口ルーバー、"
        "前面下部に小さな点検パネル。筐体の下から銅管・白い給水給湯管・ガス管が整然と接続され、"
        "配管には保温材と白い化粧カバー。背景は日本の住宅でよく見る窯業系サイディングの外壁。"
        "自然光の明るく清潔感のある写真。日本の住宅設備カタログの施工例写真のような雰囲気。人物なし。",
    ),
    (
        "product-ecocute",
        "product-ecocute.png",
        "16:9",
        "日本の戸建て住宅の側面に設置された、新品の日本製エコキュートのセット。"
        "左に460Lクラスの貯湯タンクユニット（断面が長方形の角型で、縦長の白いスチール筐体、"
        "前面下部に点検パネル、高さ約180cm）、右にエアコンの室外機とそっくりな形の"
        "ヒートポンプユニット（横長の白い筐体、側面に黒いファンガード）。"
        "どちらも打ちっぱなしのコンクリート基礎の上に設置され、配管は保温材で覆われている。"
        "背景は日本の住宅の窯業系サイディング外壁と砂利。自然光の明るく清潔感のある写真。"
        "日本の住宅設備カタログの施工例写真のような雰囲気。人物なし。",
    ),
]


def load_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    if os.path.isfile(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate_image(api_key, model, prompt, aspect_ratio):
    url = f"{API_BASE}/{model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio},
        },
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
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
    parser.add_argument("--only", help="カンマ区切りでkeyを指定すると一部だけ生成")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    api_key = load_api_key()
    if not api_key:
        print(f"エラー: {ENV_FILE} に GEMINI_API_KEY がありません。", file=sys.stderr)
        sys.exit(1)

    only = set(args.only.split(",")) if args.only else None
    jobs = [j for j in JOBS if not only or j[0] in only]

    os.makedirs(IMAGES_DIR, exist_ok=True)

    ok, ng = 0, 0
    for key, filename, aspect, desc in jobs:
        prompt = f"{COMMON_STYLE} {desc} アスペクト比 {aspect}。"
        print(f"[{key}] 生成中... -> {filename}")
        try:
            resp = generate_image(api_key, args.model, prompt, aspect)
            img_bytes, mime = extract_image_bytes(resp)
            if not img_bytes:
                print(f"  失敗: 画像データなし: {json.dumps(resp, ensure_ascii=False)[:400]}")
                ng += 1
                continue
            out_path = os.path.join(IMAGES_DIR, filename)
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"  保存: {out_path} ({mime}, {len(img_bytes)} bytes)")
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
