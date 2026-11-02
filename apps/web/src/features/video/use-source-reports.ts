import {videoWriteHeaders} from "./video-client";
import { useEffect, useRef, useState } from "react";
import { sourceReportSchema, sourceReportsSchema, type SourceReport } from "@vocabflow/contracts";
export function useSourceReports(learner: string, video: string, version: string | null) {
  const [retry, setRetry] = useState(0), key = `${version}:${retry}`, [resource, setResource] = useState<{ key: string; items?: ReturnType<typeof sourceReportsSchema.parse>; error?: boolean }>({ key: "" }), [busy, setBusy] = useState(false), [error, setError] = useState(false), pending = useRef<{url:string;input:SourceReport} | null>(null), lock = useRef(false);
  const url = `/api/learners/${learner}/video-library/${video}/transcripts/${version}/reports`;
  useEffect(() => { if (!version) return; let cancelled = false; void fetch(url, { credentials: "same-origin", cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); return sourceReportsSchema.parse(await response.json()); }).then(items => { if (!cancelled) setResource({ key, items }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); }); return () => { cancelled = true; }; }, [url, key, version]);
  async function report(cueId?: string, reason?: "text" | "timing") { if (lock.current) return; if (!pending.current && (!cueId || !reason)) { setRetry(value => value + 1); return; } lock.current = true; setBusy(true); setError(false); pending.current ??= {url,input:sourceReportSchema.parse({ actionId: crypto.randomUUID(), cueId, reason })};
    try { const response = await fetch(pending.current.url, { method: "POST", credentials: "same-origin", headers: videoWriteHeaders(learner,video), body: JSON.stringify(pending.current.input) }); if (!response.ok) throw new Error(); pending.current = null; setRetry(value => value + 1); } catch { setError(true); } finally { lock.current = false; setBusy(false); } }
  return { items: resource.key === key ? resource.items ?? [] : [], busy, error: error || (resource.key === key && resource.error), report };
}
