#!/usr/bin/env python3
"""
ConoHa WING (FTP) にSU-LINEサイトをアップロードするスクリプト。
標準ライブラリのみで動作します（ftplib、pip installは不要）。

使い方:
  1. su-line-website/scripts/.env に以下を追記（コミットされません）
       CONOHA_FTP_HOST=xxxx.conohawing.com
       CONOHA_FTP_USER=あなたのFTPユーザー名
       CONOHA_FTP_PASS=あなたのFTPパスワード
       CONOHA_REMOTE_DIR=/public_html         (アップロード先ディレクトリ。ConoHa WING管理画面の「FTP情報」参照)
  2. python3 deploy_conoha.py            # アップロード実行
     python3 deploy_conoha.py --dry-run  # 実際には送信せず、送信予定ファイル一覧だけ表示
"""

import argparse
import ftplib
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
ENV_FILE = os.path.join(SCRIPT_DIR, ".env")

# 本番に含めるファイル/ディレクトリ（開発用ファイルは除外）
INCLUDE_HTML = [
    "index.html",
]
INCLUDE_DIRS = ["css", "js"]
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


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


def collect_files():
    files = []  # (local_path, remote_relative_path)
    for name in INCLUDE_HTML:
        p = os.path.join(SITE_DIR, name)
        if os.path.isfile(p):
            files.append((p, name))
    for d in INCLUDE_DIRS:
        dpath = os.path.join(SITE_DIR, d)
        for root, _dirs, fnames in os.walk(dpath):
            for fn in fnames:
                local = os.path.join(root, fn)
                rel = os.path.relpath(local, SITE_DIR).replace(os.sep, "/")
                files.append((local, rel))
    images_dir = os.path.join(SITE_DIR, "images")
    if os.path.isdir(images_dir):
        for fn in os.listdir(images_dir):
            if fn.lower().endswith(IMAGE_EXT):
                files.append((os.path.join(images_dir, fn), f"images/{fn}"))
    return files


def ensure_remote_dirs(ftp, remote_dir, rel_path):
    sub_parts = rel_path.split("/")[:-1]
    full_parts = [p for p in remote_dir.strip("/").split("/") if p] + sub_parts
    ftp.cwd("/")
    for part in full_parts:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            ftp.mkd(part)
            ftp.cwd(part)
    ftp.cwd("/")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="送信せず対象ファイル一覧のみ表示")
    args = parser.parse_args()

    env = load_env()
    host = env.get("CONOHA_FTP_HOST")
    user = env.get("CONOHA_FTP_USER")
    password = env.get("CONOHA_FTP_PASS")
    remote_dir = env.get("CONOHA_REMOTE_DIR", "/").rstrip("/") or "/"

    files = collect_files()
    print(f"対象ファイル: {len(files)}件")
    for _local, rel in files:
        print(f"  {rel}")

    if args.dry_run:
        print("\n--dry-run のため送信は行いません。")
        return

    if not host or not user or not password:
        print(
            f"\nエラー: FTP接続情報が見つかりません。\n"
            f"  {ENV_FILE} に CONOHA_FTP_HOST / CONOHA_FTP_USER / CONOHA_FTP_PASS / CONOHA_REMOTE_DIR を"
            f"設定してから実行してください。",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"\n接続中: {host} ...")
    ftp = ftplib.FTP(host, timeout=30)
    ftp.login(user, password)
    ftp.set_pasv(True)
    print("接続成功。アップロードを開始します。")

    ok, ng = 0, 0
    for local, rel in files:
        try:
            ensure_remote_dirs(ftp, remote_dir, rel)
            remote_path = f"{remote_dir}/{rel}"
            with open(local, "rb") as f:
                ftp.storbinary(f"STOR {remote_path}", f)
            print(f"  送信完了: {rel}")
            ok += 1
        except Exception as e:
            print(f"  失敗: {rel} -> {e}")
            ng += 1

    ftp.quit()
    print(f"\n完了: 成功 {ok} 件 / 失敗 {ng} 件")
    if ng:
        sys.exit(1)


if __name__ == "__main__":
    main()
