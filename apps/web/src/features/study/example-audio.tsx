import { useState } from "react";
import { isExampleAudioUrl } from "./example-audio-url";

export function ExampleAudio({ audioUrl, exampleIndex, exampleText }: { audioUrl?: string; exampleIndex: number; exampleText?: string }) {
  const [failure, setFailure] = useState<{ url: string | undefined; failed: boolean }>({ url: undefined, failed: false });
  const failed = failure.url === audioUrl && failure.failed;

  if (!isExampleAudioUrl(audioUrl) || failed) {
    return failed ? <span className="vocabulary-example-audio-error" role="status">Âm thanh câu ví dụ chưa khả dụng.</span> : null;
  }

  return (
    <audio
      className="vocabulary-example-audio-control"
      controls
      preload="none"
      src={audioUrl}
      aria-label={`Nghe câu ví dụ ${exampleIndex + 1}${exampleText ? `: ${exampleText}` : ""}`}
      onError={() => setFailure({ url: audioUrl, failed: true })}
    >
      Trình duyệt không hỗ trợ phát audio.
    </audio>
  );
}
