import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { neon } from "@neondatabase/serverless";

const TARGET = Object.freeze({
  projectId: "shy-hill-72364426",
  branchId: "br-square-grass-b3af0nte",
  endpointId: "ep-small-shadow-b3ny4993",
  database: "neondb",
  role: "vocabflow_identity_bootstrap",
  schema: "vocabflow_editorial_staging",
});
const HOST = "127.0.0.1";
const PORT = 3003;
const PAGE_SIZE = 25;
const STATUSES = new Set(["ALL", "EFFECTIVE", "PENDING_CONTENT_VALIDATION", "PENDING_VERSION_DECISION"]);

function requireSafeEnvironment() {
  if (process.env.VOCABFLOW_STAGING_PREVIEW !== "1") throw new Error("Set VOCABFLOW_STAGING_PREVIEW=1 to enable this local read-only preview.");
  if (process.env.VOCABFLOW_ENV !== "development" || process.env.DATABASE_ENV !== "development" || process.env.EXECUTION_CONTEXT !== "local-development" || process.env.VERCEL_ENV) {
    throw new Error("The staging preview requires the local Development environment.");
  }
  const connectionString = process.env.BOOTSTRAP_DATABASE_URL;
  const apiKey = process.env.NEON_API_KEY;
  if (!connectionString || !apiKey) throw new Error("Development staging preview credentials are unavailable.");
  const parsed = new URL(connectionString);
  const endpointId = parsed.hostname.split(".")[0].replace(/-pooler$/, "");
  const role = decodeURIComponent(parsed.username).split(".")[0];
  if (endpointId !== TARGET.endpointId || parsed.pathname.slice(1) !== TARGET.database || role !== TARGET.role) {
    throw new Error("The configured database connection does not match the approved Development target.");
  }
  return { connectionString, apiKey };
}

async function verifyNeonTarget(apiKey) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const branchResponse = await fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/branches/${TARGET.branchId}`, { headers });
  if (!branchResponse.ok) throw new Error("Development branch verification failed.");
  const branchPayload = await branchResponse.json();
  if (branchPayload?.branch?.project_id !== TARGET.projectId || branchPayload?.branch?.id !== TARGET.branchId) throw new Error("Development project/branch identity mismatch.");

  const endpointsResponse = await fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/endpoints`, { headers });
  if (!endpointsResponse.ok) throw new Error("Development endpoint verification failed.");
  const endpointsPayload = await endpointsResponse.json();
  const endpoint = (endpointsPayload?.endpoints ?? []).find((entry) => entry.id === TARGET.endpointId);
  if (!endpoint || endpoint.branch_id !== TARGET.branchId || endpoint.type !== "read_write") throw new Error("Development endpoint/branch identity mismatch.");
}

function pendingReason(row) {
  if (row.resolutionStatus === "PENDING_VERSION_DECISION") return "Có nhiều candidate version; chưa chọn bản effective và đang chờ quyết định.";
  if (row.resolutionStatus === "PENDING_CONTENT_VALIDATION") {
    const forms = [...new Set((row.candidateVersions ?? []).map((candidate) => candidate.candidateContent?.displayForm).filter(Boolean))];
    if (!row.draft && forms.length > 1) return "Các candidate đưa ra nhiều display form khác nhau; chưa có effective DRAFT projection.";
    if (!row.draft && row.candidateVersions?.some((candidate) => candidate.candidateContent && !candidate.candidateContent.displayForm)) return "Candidate content có nhưng display form đang thiếu; chưa có effective DRAFT projection.";
    if (!row.draft) return "Chưa có effective DRAFT projection. Staging không lưu chi tiết gate finding theo từng identity.";
    if (!row.draft.displayForm) return "Display form đang thiếu trong DRAFT projection; staging không lưu chi tiết gate finding theo từng identity.";
    return "Đang chờ content validation. Chi tiết finding theo từng identity không được lưu trong schema staging.";
  }
  return "DRAFT trong staging; trạng thái này không phải APPROVED hoặc PUBLISHED.";
}

const BLOCKED_PROVENANCE_KEYS = /(text|excerpt|snippet|content|definition|meaning|example|translation|quote|body|raw)/i;
const ALLOWED_PROVENANCE_KEYS = /(source|corpus|record|evidence|artifact|hash|fingerprint|citation|identity|group|proposal|verification|verified|filename|path|status|rights)/i;
function safeProvenance(value, depth = 0) {
  if (depth > 5 || value == null) return null;
  if (Array.isArray(value)) return value.slice(0, 30).map((entry) => safeProvenance(entry, depth + 1)).filter((entry) => entry != null);
  if (typeof value !== "object") return typeof value === "string" ? value.slice(0, 400) : value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => ALLOWED_PROVENANCE_KEYS.test(key) && !BLOCKED_PROVENANCE_KEYS.test(key))
    .slice(0, 60)
    .map(([key, nested]) => [key, safeProvenance(nested, depth + 1)])
    .filter(([, nested]) => nested != null));
}

function parseQuery(c) {
  const params = new URL(c.req.url).searchParams;
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const status = params.get("status") ?? "ALL";
  const pageValue = Number(params.get("page") ?? "1");
  if (!STATUSES.has(status) || !Number.isSafeInteger(pageValue) || pageValue < 1 || pageValue > 400) return null;
  return { search, status, page: pageValue };
}

const { connectionString, apiKey } = requireSafeEnvironment();
await verifyNeonTarget(apiKey);
const sql = neon(connectionString);

const identity = await sql.transaction((tx) => [
  tx`SELECT current_database() AS database_name, current_user AS role_name, current_setting('transaction_read_only') AS read_only`,
  tx`SELECT resolution_status, count(*)::int AS count FROM vocabflow_editorial_staging.identity_registry GROUP BY resolution_status`,
], { readOnly: true, isolationLevel: "RepeatableRead" });
const databaseIdentity = identity[0][0];
if (databaseIdentity.database_name !== TARGET.database || databaseIdentity.role_name !== TARGET.role || databaseIdentity.read_only !== "on") {
  throw new Error("Development database identity/read-only transaction verification failed.");
}

const app = new Hono();
app.get("/api/dev/staging-preview", async (c) => {
  const host = (c.req.header("host") ?? "").split(":")[0].toLowerCase();
  const origin = c.req.header("origin");
  if (host !== HOST || (origin && origin !== "http://127.0.0.1:5173")) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
  const query = parseQuery(c);
  if (!query) return c.json({ message: "Invalid preview query." }, 400, { "Cache-Control": "no-store" });

  const pattern = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
  const statusFilter = query.status;
  const offset = (query.page - 1) * PAGE_SIZE;
  try {
    const [statusRows, totals, rows] = await sql.transaction((tx) => [
      tx`SELECT resolution_status, count(*)::int AS count FROM vocabflow_editorial_staging.identity_registry GROUP BY resolution_status`,
      tx`
        SELECT count(*)::int AS count
        FROM vocabflow_editorial_staging.identity_registry i
        LEFT JOIN vocabflow_editorial_staging.draft_proposals d ON d.proposal_key = i.proposal_key
        WHERE (${statusFilter} = 'ALL' OR i.resolution_status = ${statusFilter})
          AND (${query.search} = '' OR i.proposal_key ILIKE ${pattern} OR i.source_group_key ILIKE ${pattern}
            OR COALESCE(d.headword, '') ILIKE ${pattern} OR COALESCE(d.part_of_speech, '') ILIKE ${pattern}
            OR COALESCE(d.sense_identity->>'senseLabelEn', '') ILIKE ${pattern} OR COALESCE(d.definition_en, '') ILIKE ${pattern}
            OR COALESCE(d.meaning_vi, '') ILIKE ${pattern} OR EXISTS (
              SELECT 1 FROM vocabflow_editorial_staging.candidate_versions cv
              WHERE cv.proposal_key = i.proposal_key AND cv.candidate_content IS NOT NULL
                AND (cv.candidate_content->>'headword' ILIKE ${pattern} OR cv.candidate_content->>'partOfSpeech' ILIKE ${pattern}
                  OR cv.candidate_content->>'displayForm' ILIKE ${pattern} OR cv.candidate_content->>'definitionEn' ILIKE ${pattern}
                  OR cv.candidate_content->>'meaningVi' ILIKE ${pattern})
            ))
      `,
      tx`
        SELECT i.proposal_key, i.source_group_key, i.resolution_status, i.effective_content_hash,
          i.rights_status, i.source_provenance AS identity_source_provenance,
          d.headword, d.part_of_speech, d.sense_identity, d.definition_en, d.meaning_vi,
          d.examples, d.usage_notes, d.display_form, d.source_provenance AS draft_source_provenance,
          d.editorial_status,
          COALESCE(candidate_list.versions, '[]'::jsonb) AS candidate_versions
        FROM vocabflow_editorial_staging.identity_registry i
        LEFT JOIN vocabflow_editorial_staging.draft_proposals d ON d.proposal_key = i.proposal_key
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object(
            'candidateContentHash', selected.candidate_content_hash,
            'selectionStatus', selected.selection_status,
            'candidateContent', selected.candidate_content,
            'sourceProvenanceReferences', selected.source_provenance_references,
            'artifactIdentity', selected.original_artifact_identity
          ) ORDER BY selected.candidate_content_hash) AS versions
          FROM (
            SELECT candidate_content_hash, selection_status, candidate_content, source_provenance_references, original_artifact_identity
            FROM vocabflow_editorial_staging.candidate_versions
            WHERE proposal_key = i.proposal_key
            ORDER BY candidate_content_hash
          ) selected
        ) candidate_list ON true
        WHERE (${statusFilter} = 'ALL' OR i.resolution_status = ${statusFilter})
          AND (${query.search} = '' OR i.proposal_key ILIKE ${pattern} OR i.source_group_key ILIKE ${pattern}
            OR COALESCE(d.headword, '') ILIKE ${pattern} OR COALESCE(d.part_of_speech, '') ILIKE ${pattern}
            OR COALESCE(d.sense_identity->>'senseLabelEn', '') ILIKE ${pattern} OR COALESCE(d.definition_en, '') ILIKE ${pattern}
            OR COALESCE(d.meaning_vi, '') ILIKE ${pattern} OR EXISTS (
              SELECT 1 FROM vocabflow_editorial_staging.candidate_versions cv
              WHERE cv.proposal_key = i.proposal_key AND cv.candidate_content IS NOT NULL
                AND (cv.candidate_content->>'headword' ILIKE ${pattern} OR cv.candidate_content->>'partOfSpeech' ILIKE ${pattern}
                  OR cv.candidate_content->>'displayForm' ILIKE ${pattern} OR cv.candidate_content->>'definitionEn' ILIKE ${pattern}
                  OR cv.candidate_content->>'meaningVi' ILIKE ${pattern})
            ))
        ORDER BY d.headword NULLS LAST, d.part_of_speech NULLS LAST, i.proposal_key
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `,
    ], { readOnly: true, isolationLevel: "RepeatableRead" });

    const statusCounts = Object.fromEntries(statusRows.map((row) => [row.resolution_status, row.count]));
    const items = rows.map((row) => {
      const draft = row.headword == null ? null : {
        headword: row.headword,
        partOfSpeech: row.part_of_speech,
        senseIdentity: row.sense_identity,
        definitionEn: row.definition_en,
        meaningVi: row.meaning_vi,
        examples: row.examples,
        usageNotes: row.usage_notes,
        displayForm: row.display_form,
        editorialStatus: row.editorial_status,
        sourceProvenance: safeProvenance(row.draft_source_provenance),
      };
      return {
        proposalKey: row.proposal_key,
        sourceGroupKey: row.source_group_key,
        resolutionStatus: row.resolution_status,
        effectiveContentHash: row.effective_content_hash?.trim() ?? null,
        rightsStatus: row.rights_status,
        pendingReason: pendingReason({ resolutionStatus: row.resolution_status, draft, candidateVersions: row.candidate_versions?.map((candidate) => ({ candidateContent: candidate.candidateContent })) ?? [] }),
        draft,
        identitySourceProvenance: safeProvenance(row.identity_source_provenance),
        candidateVersions: (row.candidate_versions ?? []).map((candidate) => ({
          candidateContent: candidate.candidateContent == null ? null : {
            headword: candidate.candidateContent.headword ?? null,
            partOfSpeech: candidate.candidateContent.partOfSpeech ?? null,
            displayForm: candidate.candidateContent.displayForm ?? null,
            senseLabelEn: candidate.candidateContent.senseLabelEn ?? null,
            definitionEn: candidate.candidateContent.definitionEn ?? null,
            meaningVi: candidate.candidateContent.meaningVi ?? null,
            examples: candidate.candidateContent.examples ?? null,
            usageNotes: candidate.candidateContent.grammarNotesEn ?? null,
          },
          candidateContentHash: candidate.candidateContentHash,
          selectionStatus: candidate.selectionStatus,
          sourceProvenanceReferences: safeProvenance(candidate.sourceProvenanceReferences),
          artifactIdentity: safeProvenance(candidate.artifactIdentity),
        })),
      };
    });
    return c.json({
      target: { projectId: TARGET.projectId, branchId: TARGET.branchId, endpointId: TARGET.endpointId, database: TARGET.database, schema: TARGET.schema },
      statusCounts,
      page: query.page,
      pageSize: PAGE_SIZE,
      total: totals[0].count,
      items,
    }, 200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  } catch {
    return c.json({ message: "Không đọc được staging Development. Kiểm tra lại target và thử tải lại." }, 503, { "Cache-Control": "no-store" });
  }
});

app.all("*", (c) => c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" }));
serve({ fetch: app.fetch, hostname: HOST, port: PORT });
console.log(`Development staging preview API listening on http://${HOST}:${PORT}; target ${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}; read-only queries only.`);
