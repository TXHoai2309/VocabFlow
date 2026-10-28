import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnv(): Record<string, string> {
  const envText = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  const env: Record<string, string> = {};
  for (const line of envText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const neonApiKey = env.NEON_API_KEY;
  const projectId = "silent-sky-84582895";

  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/connection_uri?branch_id=br-cold-shadow-a17yg4k2&database_name=neondb&role_name=neondb_owner`,
    { headers: { Authorization: `Bearer ${neonApiKey}` } }
  );
  const data = await res.json() as any;
  const sql = postgres(data.uri);

  // Active projections & vocabularies
  const rows = await sql`
    SELECT
      p.proposal_key,
      v.id as vocabulary_id,
      v.word,
      p.part_of_speech,
      v.vietnamese,
      v.vietnamese_override,
      p.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
      sm.short_meaning_vi,
      sm.validation_status AS short_meaning_status,
      v.definition_en
    FROM vocabflow_app.master_v2_development_projections p
    JOIN vocabflow_app.vocabularies v on v.id = p.vocabulary_id
    LEFT JOIN vocabflow_app.master_v2_short_meanings sm
      ON sm.vocabulary_id = v.id AND sm.source_content_hash = p.content_sha256 AND sm.validation_status = 'VERIFIED'
    WHERE p.content_review_decision = 'PASS' AND p.editorial_status = 'DRAFT' AND v.enabled = true
    ORDER BY v.word ASC
  `;

  // 1. Phân tích tiếng Việt
  let noVietnameseCount = 0;
  let hasVietnameseCount = 0;
  let verifiedShortCount = 0;
  const missingViSamples: { word: string; pos: string }[] = [];

  for (const r of rows) {
    const vi = (r.vietnamese_override || r.vietnamese || r.source_meaning_vi || "").trim();
    if (r.short_meaning_status === "VERIFIED" && r.short_meaning_vi?.trim()) {
      verifiedShortCount++;
    }
    if (!vi || vi.toLowerCase() === r.word.toLowerCase()) {
      noVietnameseCount++;
      if (missingViSamples.length < 10) {
        missingViSamples.push({ word: r.word, pos: r.part_of_speech });
      }
    } else {
      hasVietnameseCount++;
    }
  }

  console.log(`- Thẻ đã có nghĩa tiếng Việt (định nghĩa hoặc nghĩa ngắn): ${hasVietnameseCount} (${((hasVietnameseCount / rows.length) * 100).toFixed(2)}%)`);
  console.log(`- Thẻ CHƯA có nghĩa tiếng Việt: ${noVietnameseCount} (${((noVietnameseCount / rows.length) * 100).toFixed(2)}%)`);
  console.log(`  + Đã có nhãn 'Nghĩa tiếng Việt' (có nghĩa ngắn gọn VERIFIED): ${verifiedShortCount} (${((verifiedShortCount / rows.length) * 100).toFixed(2)}%)`);
  console.log(`  + Đang hiển thị nhãn 'Giải thích nghĩa' (câu giải thích định nghĩa dài bằng tiếng Việt): ${rows.length - verifiedShortCount} (${(((rows.length - verifiedShortCount) / rows.length) * 100).toFixed(2)}%)`);
  if (missingViSamples.length > 0) {
    console.log("  Ví dụ từ chưa có tiếng Việt:", missingViSamples);
  }

  // 2. Phân tích đa nghĩa (1 từ có nhiều nghĩa)
  const sensesByWord = new Map<string, Array<(typeof rows)[number]>>();
  for (const r of rows) {
    const lemma = (r.word ?? "").trim().toLowerCase();
    if (!sensesByWord.has(lemma)) sensesByWord.set(lemma, []);
    sensesByWord.get(lemma)!.push(r);
  }

  const distinctWordsCount = sensesByWord.size;
  console.log(`\n=== THỐNG KÊ ĐA NGHĨA (HEADWORD & SENSES) ===`);
  console.log(`Tổng số từ vựng duy nhất (Headwords): ${distinctWordsCount}`);

  const distribution = new Map<number, number>();
  let singleSenseWords = 0;
  let multiSenseWords = 0;

  for (const [w, senses] of sensesByWord.entries()) {
    const count = senses.length;
    distribution.set(count, (distribution.get(count) ?? 0) + 1);
    if (count === 1) singleSenseWords++;
    else multiSenseWords++;
  }

  console.log(`- Từ có duy nhất 1 nghĩa (Single sense): ${singleSenseWords} (${((singleSenseWords / distinctWordsCount) * 100).toFixed(2)}%)`);
  console.log(`- Từ có NHIỀU NGHĨA (>= 2 senses): ${multiSenseWords} (${((multiSenseWords / distinctWordsCount) * 100).toFixed(2)}%)`);

  console.log("\nPhân bố số lượng nghĩa trên mỗi từ:");
  const sortedDist = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
  for (const [sensesCount, wordsCount] of sortedDist) {
    console.log(`  * ${sensesCount} nghĩa: ${wordsCount} từ (${((wordsCount / distinctWordsCount) * 100).toFixed(2)}%)`);
  }

  // Top từ có nhiều nghĩa nhất
  const topMulti = [...sensesByWord.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);

  console.log("\nTop 15 từ có nhiều nghĩa nhất trong hệ thống:");
  for (const [w, senses] of topMulti) {
    const poses = [...new Set(senses.map((s) => s.part_of_speech))].join(", ");
    console.log(`  - "${w}": ${senses.length} nghĩa (${poses})`);
  }

  await sql.end();
}

main().catch(console.error);
