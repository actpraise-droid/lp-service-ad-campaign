// 「最終更新」を3か所すべて git の最終コミット日へ同期する。
//   1. sitemap.xml の <lastmod>
//   2. JSON-LD の "dateModified"
//   3. 可視の <time datetime="...">最終更新 YYYY.MM.DD</time>
// 手で書くと必ずずれる。実際 guides/local.html は
// 可視 2026.08.02 / JSON-LD 2026-07-23 / 実際 2026-08-26 と三者三様だった。
// 使い方: node sync-dates.mjs <repo> [--dry]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const REPO = process.argv[2];
const DRY = process.argv[3] === "--dry";
process.chdir(REPO);

const lastCommitDate = (p) => {
  try {
    const d = execSync(`git log -1 --format=%cs -- "${p}"`, { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  } catch {
    return null;
  }
};
const dots = (iso) => iso.replace(/-/g, ".");

// ---- 1. sitemap.xml ----
let sm = fs.readFileSync("sitemap.xml", "utf8");
let smFixed = 0;
sm = sm.replace(
  /(<loc>https:\/\/dosen-lab\.co\.jp\/([^<]*)<\/loc>\s*<lastmod>)([^<]+)(<\/lastmod>)/g,
  (full, head, loc, old, tail) => {
    let p = loc === "" ? "index.html" : loc;
    if (p.endsWith("/")) p += "index.html";
    if (!fs.existsSync(p)) return full;
    const real = lastCommitDate(p);
    if (!real || real === old) return full;
    smFixed++;
    return head + real + tail;
  },
);
if (!DRY) fs.writeFileSync("sitemap.xml", sm, "utf8");
console.log(`sitemap.xml: ${smFixed}件の lastmod を更新\n`);

// ---- 2 と 3. 各HTML ----
let files = 0;
let ldTotal = 0;
let visTotal = 0;

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/^(\.git|node_modules|sites)$/.test(e.name)) walk(p);
      continue;
    }
    if (!e.name.endsWith(".html")) continue;
    const rel = path.relative(REPO, p).split(path.sep).join("/");
    const src = fs.readFileSync(p, "utf8");
    const hasLd = src.includes('"dateModified"');
    const hasVis = src.includes("最終更新");
    if (!hasLd && !hasVis) continue;

    const real = lastCommitDate(rel);
    if (!real) continue;

    let ld = 0;
    let vis = 0;
    let out = src;

    out = out.replace(/("dateModified"\s*:\s*")([0-9-]+)(")/g, (full, a, old, c) => {
      if (old === real) return full;
      ld++;
      return a + real + c;
    });

    // 可視の <time datetime="YYYY-MM-DD">最終更新 YYYY.MM.DD</time>
    out = out.replace(
      /<time datetime="([0-9-]+)">最終更新\s*([0-9.]+)<\/time>/g,
      (full, attr, shown) => {
        if (attr === real && shown === dots(real)) return full;
        vis++;
        return `<time datetime="${real}">最終更新 ${dots(real)}</time>`;
      },
    );

    if (ld === 0 && vis === 0) continue;
    if (!DRY) fs.writeFileSync(p, out, "utf8");
    console.log(`  ${rel.padEnd(44)} JSON-LD:${ld} 可視:${vis} → ${real}`);
    files++;
    ldTotal += ld;
    visTotal += vis;
  }
};
walk(REPO);
console.log(`\n${files}ファイル / JSON-LD ${ldTotal}箇所 / 可視 ${visTotal}箇所${DRY ? " (ドライラン)" : ""}`);
