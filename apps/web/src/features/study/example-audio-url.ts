/** Public HTTPS audio, or the exact owner-catalog route in a local DEV build. */
export function isExampleAudioUrl(value: string | undefined): value is string {
  return Boolean(value && (/^https:\/\//i.test(value)
    || (import.meta.env.DEV && /^\/api\/local-owner-editorial-media\/[a-f0-9]{64}\.mp3$/.test(value))));
}
