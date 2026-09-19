import { useEffect, useRef, useState } from "react";

export type PronunciationAudioState = "idle" | "loading" | "playing" | "ended" | "error";

type AudioOwner = symbol;

type ActivePlayback = {
  owner: AudioOwner;
  audio: HTMLAudioElement;
  requestId: number;
};

let activePlayback: ActivePlayback | null = null;

function resetAudioPosition(audio: HTMLAudioElement) {
  try {
    audio.currentTime = 0;
  } catch {
    // Some browser implementations can reject currentTime while media is unavailable.
  }
}

export function stopActivePronunciationAudio(owner?: AudioOwner) {
  if (!activePlayback || (owner && activePlayback.owner !== owner)) return;

  const { audio } = activePlayback;
  activePlayback = null;
  audio.pause();
  resetAudioPosition(audio);
}

function claimPronunciationAudio(owner: AudioOwner, audio: HTMLAudioElement, requestId: number) {
  stopActivePronunciationAudio();
  activePlayback = { owner, audio, requestId };
}

function ownsActivePlayback(owner: AudioOwner, audio: HTMLAudioElement, requestId: number) {
  return activePlayback?.owner === owner
    && activePlayback.audio === audio
    && activePlayback.requestId === requestId;
}

function finishPronunciationAudio(owner: AudioOwner, audio: HTMLAudioElement, requestId: number) {
  if (!ownsActivePlayback(owner, audio, requestId)) return;
  activePlayback = null;
}

export function usePronunciationAudio(
  audioUrl: string | null,
  word: string,
  vocabularyId: number,
  onError?: () => void
) {
  const [owner] = useState<AudioOwner>(() => Symbol("pronunciation-audio-owner"));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const onErrorRef = useRef(onError);
  const normalizedAudioUrl = audioUrl?.trim() || null;
  const audioIdentity = `${vocabularyId}:${word}:${normalizedAudioUrl ?? ""}`;
  const [audioState, setAudioState] = useState<{ identity: string; value: PronunciationAudioState }>({
    identity: audioIdentity,
    value: "idle"
  });
  const state = audioState.identity === audioIdentity ? audioState.value : "idle";
  const setState = (value: PronunciationAudioState) => setAudioState({ identity: audioIdentity, value });

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    requestIdRef.current += 1;
    stopActivePronunciationAudio(owner);
    audioRef.current = null;
  }, [audioIdentity, owner]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    stopActivePronunciationAudio(owner);
  }, [owner]);

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("playing", () => {
      const requestId = requestIdRef.current;
      if (ownsActivePlayback(owner, audio, requestId)) setState("playing");
    });
    audio.addEventListener("ended", () => {
      const requestId = requestIdRef.current;
      if (!ownsActivePlayback(owner, audio, requestId)) return;
      finishPronunciationAudio(owner, audio, requestId);
      setState("ended");
    });
    audio.addEventListener("error", () => {
      const requestId = requestIdRef.current;
      if (!ownsActivePlayback(owner, audio, requestId)) return;
      stopActivePronunciationAudio(owner);
      setState("error");
      onErrorRef.current?.();
    });
    audioRef.current = audio;
    return audio;
  };

  const play = () => {
    if (!normalizedAudioUrl || state === "loading" || state === "error") return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    stopActivePronunciationAudio();
    setState("loading");

    let audio: HTMLAudioElement | null = null;
    try {
      const nextAudio = ensureAudio();
      audio = nextAudio;
      claimPronunciationAudio(owner, nextAudio, requestId);
      nextAudio.src = normalizedAudioUrl;
      resetAudioPosition(nextAudio);
      nextAudio.load();
      const playResult = nextAudio.play();
      if (playResult && typeof playResult.then === "function") {
        void playResult.then(() => {
          if (ownsActivePlayback(owner, nextAudio, requestId)) setState("playing");
        }).catch(() => {
          if (!ownsActivePlayback(owner, nextAudio, requestId)) return;
          stopActivePronunciationAudio(owner);
          setState("error");
          onErrorRef.current?.();
        });
      } else if (ownsActivePlayback(owner, audio, requestId)) {
        setState("playing");
      }
    } catch {
      if (audio && ownsActivePlayback(owner, audio, requestId)) {
        stopActivePronunciationAudio(owner);
      }
      setState("error");
      onErrorRef.current?.();
    }
  };

  const pause = () => {
    if (state !== "playing") return;
    stopActivePronunciationAudio(owner);
    setState("idle");
  };

  return {
    hasAudio: normalizedAudioUrl !== null,
    state,
    word,
    play,
    pause
  };
}
