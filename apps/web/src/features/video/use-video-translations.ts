import {useEffect,useState} from "react";
import {translationPageSchema} from "@vocabflow/contracts";
const base=(learner:string,video:string)=>`/api/learners/${learner}/video-library/${video}/translations`;
export function useVideoTranslations(learner: string, video: string, version: string | null) {
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), key = `${version}:${page}:${retry}`, [resource, setResource] = useState<{ key: string; data?: ReturnType<typeof translationPageSchema.parse>; error?: boolean }>({ key: "" });
  useEffect(() => { if (!version) return; let cancelled = false; void fetch(`${base(learner, video)}?${new URLSearchParams({ versionId: version, page: String(page) })}`, { credentials: "same-origin", cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); return translationPageSchema.parse(await response.json()); }).then(data => { if (!cancelled) setResource({ key, data }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); }); return () => { cancelled = true; }; }, [learner, video, version, page, key]);
  const data = resource.key === key ? resource.data : undefined, lookup = new Map<string, string>(); for (const item of data?.items ?? []) for (const cue of item.items) if (!lookup.has(cue.id)) lookup.set(cue.id, cue.vietnamese);
  return { lookup, data, error: resource.key === key && resource.error, page, setPage, refresh: () => setRetry(value => value + 1) };
}
