import postgres from "postgres";

const required = ["DATABASE_URL", "DATABASE_ENV", "VOCABFLOW_ENV", "VOCAB_DATASET_VERSION"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const url = new URL(process.env.DATABASE_URL);
if (process.env.DATABASE_ENV !== "development" || process.env.VOCABFLOW_ENV !== "development" || process.env.VOCAB_DATASET_VERSION !== "v2") {
  throw new Error("Vercel Preview variables do not identify V2 Development");
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10 });
try {
  const [identity] = await sql`
    select environment, provider, project_id, branch_id
    from vocabflow_meta.environment_identity where id = 1
  `;
  if (!identity || identity.environment !== "development" || identity.provider !== "neon"
    || identity.project_id !== "silent-sky-84582895" || identity.branch_id !== "br-cold-shadow-a17yg4k2") {
    throw new Error("NEON_DEVELOPMENT_IDENTITY_MISMATCH");
  }
  const [meta] = await sql`
    select current_database() as database_name,
      current_setting('neon.tenant_id', true) as neon_tenant_id,
      current_setting('neon.branch_id', true) as neon_branch_id,
      current_setting('neon.project_id', true) as neon_project_id
  `;
  const [counts] = await sql`
    select count(*)::int as senses,
      count(distinct m.master_sense_id)::int as stable_ids,
      count(*) filter (where p.content_review_decision = 'PASS' and p.editorial_status = 'DRAFT')::int as pass_draft,
      count(*) filter (where p.content_sha256 is null or p.content_sha256 !~ '^[0-9a-f]{64}$')::int as bad_hashes,
      count(*) filter (where nullif(trim(v.vietnamese), '') is not null)::int as vietnamese_rows,
      count(*) filter (where nullif(trim(v.definition_en), '') is not null)::int as english_definition_rows
    from vocabflow_app.vocabularies v
    join vocabflow_app.master_vocabulary_mappings m on m.vocabulary_id = v.id
    join vocabflow_app.master_v2_development_projections p on p.vocabulary_id = v.id
    where v.enabled = true and v.source_dataset = 'VOCABFLOW_MASTER_V2'
  `;
  const specialSamples = await sql`
    select v.id, v.word, p.part_of_speech, m.master_sense_id, p.content_sha256,
      v.vietnamese, v.vietnamese_override, v.definition_en, p.examples,
      p.source_provenance->'masterV2Identity'->>'sourceMeaningVi' as source_meaning_vi
    from vocabflow_app.vocabularies v
    join vocabflow_app.master_vocabulary_mappings m on m.vocabulary_id = v.id
    join vocabflow_app.master_v2_development_projections p on p.vocabulary_id = v.id
    where v.enabled = true and v.source_dataset = 'VOCABFLOW_MASTER_V2'
      and lower(v.word) in ('banana','age','about','a','an','abandon','abuse','block','book','tear','academic')
    order by v.word, p.part_of_speech, m.master_sense_id
  `;
  console.log(JSON.stringify({
    environment: { databaseEnv: process.env.DATABASE_ENV, dataset: process.env.VOCAB_DATASET_VERSION, database: url.pathname.slice(1), endpointHost: url.hostname },
      neon: { ...meta, ...identity },
    counts,
    specialSamples
  }, null, 2));
} catch (error) {
  console.error("PREFLIGHT_ERROR", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error");
  process.exitCode = 1;
} finally {
  await sql.end();
}
