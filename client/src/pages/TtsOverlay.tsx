import { useState, useEffect, useRef, useCallback } from "react";
import { useTwitchControls } from "@/hooks/use-twitch-controls";
import { useKickControls } from "@/hooks/use-kick-controls";

interface Fighter {
  id: number;
  name: string;
  imageUrl: string;
}

interface Selection {
  p1Fighter?: Fighter;
  p2Fighter?: Fighter;
}

type SpeechJob = { text: string; player: 1 | 2 };

function getMouthUrls(imageUrl: string) {
  const base = imageUrl.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");
  return {
    closed: `${base}close.png`,
    open: `${base}open.png`,
  };
}

function useMouthFlap(speaking: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!speaking) {
      setIsOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setIsOpen((prev) => !prev);
    }, 130);
    return () => clearInterval(interval);
  }, [speaking]);
  return isOpen;
}

export default function TtsOverlay() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [speaking, setSpeaking] = useState<1 | 2 | null>(null);

  const speechQueueRef = useRef<SpeechJob[]>([]);
  const isSpeakingRef = useRef(false);

  // Read channel names from URL params: ?twitch=channelname&kick=channelname
  const params = new URLSearchParams(window.location.search);
  const twitchChannel = params.get("twitch") || "";
  const kickChannel = params.get("kick") || "";

  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;
    const job = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    setSpeaking(job.player);

    const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(job.text)}`;
    const audio = new Audio(url);

    const finish = () => {
      isSpeakingRef.current = false;
      setSpeaking(null);
      setTimeout(() => processQueue(), 300);
    };

    audio.addEventListener("ended", finish);
    audio.addEventListener("error", (e) => {
      console.error("TTS audio error:", e, "URL:", url);
      finish();
    });
    audio.play().catch((err) => {
      console.error("TTS play() failed:", err);
      finish();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enqueueSpeech = useCallback(
    (text: string, player: 1 | 2) => {
      if (!text.trim()) return;
      speechQueueRef.current.push({ text: text.trim(), player });
      processQueue();
    },
    [processQueue]
  );

  const pollSelection = useCallback(async () => {
    try {
      const res = await fetch(`/api/selections/latest`);
      if (res.ok) setSelection(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    pollSelection();
  }, [pollSelection]);

  useEffect(() => {
    const interval = setInterval(() => pollSelection(), 3000);
    return () => clearInterval(interval);
  }, [pollSelection]);

  // Twitch — auto-connect on load if ?twitch= is set
  const { connect: connectTwitch } = useTwitchControls({
    onCommand: (_user, cmd) => {
      if (cmd.startsWith("!tts ")) enqueueSpeech(cmd.slice(5), 1);
      else if (cmd.startsWith("!say ")) enqueueSpeech(cmd.slice(5), 1);
    },
  });

  useEffect(() => {
    if (twitchChannel) connectTwitch(twitchChannel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Kick — auto-connect on load if ?kick= is set
