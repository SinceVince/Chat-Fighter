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

  // Poll for latest fighter selection
  const pollSelection = useCallback(async (channel: string) => {
    try {
      if (channel) {
        const res = await fetch(`/api/selections/${encodeURIComponent(channel)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.p1Fighter || data.p2Fighter) {
            setSelection(data);
            return;
          }
        }
      }
      const res2 = await fetch(`/api/selections/latest`);
      if (res2.ok) setSelection(await res2.json());
    } catch {
      /* silent */
    }
  }, []);

  // Initial load
  useEffect(() => {
    pollSelection("");
  }, [pollSelection]);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(() => pollSelection(""), 3000);
    return () => clearInterval(interval);
  }, [pollSelection]);

  // Parse !tts / !say commands from Twitch (player 1)
  useTwitchControls({
    onCommand: (_user, cmd) => {
      if (cmd.startsWith("!tts ")) {
        enqueueSpeech(cmd.slice(5), 1);
      } else if (cmd.startsWith("!say ")) {
        enqueueSpeech(cmd.slice(5), 1);
      }
    },
  });

  // Parse !tts / !say commands from Kick (player 2)
  useKickControls({
    onCommand: (_user, cmd) => {
      if (cmd.startsWith("!tts ")) {
        enqueueSpeech(cmd.slice(5), 2);
      } else if (cmd.startsWith("!say ")) {
        enqueueSpeech(cmd.slice(5), 2);
      }
    },
  });

  const p1Speaking = speaking === 1;
  const p2Speaking = speaking === 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 0,
        gap: 20,
      }}
    >
      {!selection?.p1Fighter && !selection?.p2Fighter ? (
        <div style={{ color: "white", fontFamily: "monospace", fontSize: 14 }}>
          Waiting for fighters to be selected...
        </div>
      ) : (
        <>
          {selection?.p1Fighter && (
            <FighterCard
              fighter={selection.p1Fighter}
              player={1}
              isSpeaking={p1Speaking}
              mirrored={false}
            />
          )}
          {selection?.p2Fighter && (
            <FighterCard
              fighter={selection.p2Fighter}
              player={2}
              isSpeaking={p2Speaking}
              mirrored={true}
            />
          )}
        </>
      )}
    </div>
  );
}

function FighterCard({
  fighter,
  player,
  isSpeaking,
  mirrored,
}: {
  fighter: Fighter;
  player: 1 | 2;
  isSpeaking: boolean;
  mirrored: boolean;
}) {
  const mouthOpen = useMouthFlap(isSpeaking);
  const { closed, open } = getMouthUrls(fighter.imageUrl);
  const imgSrc = isSpeaking && mouthOpen ? open : closed;

  const playerColor = player === 1 ? "#00aaff" : "#ff4444";
  const playerLabel = player === 1 ? "P1" : "P2";
  const platformColor = player === 1 ? "#9146ff" : "#53fc18";
  const platformTextColor = player === 1 ? "#fff" : "#000";
  const platformLabel = player === 1 ? "TWITCH" : "KICK";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: mirrored ? "scaleX(-1)" : "none",
      }}
    >
      <img
        data-testid={`tts-fighter-${player === 1 ? "left" : "right"}`}
        src={imgSrc}
        alt={fighter.name}
        style={{
          width: 200,
          height: 200,
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
      />
      <div
        style={{
          transform: mirrored ? "scaleX(-1)" : "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(0,0,0,0.6)",
          padding: "2px 6px",
          borderRadius: 4,
        }}
      >
        <span
          style={{
            background: platformColor,
            color: platformTextColor,
            fontSize: 8,
            fontFamily: "monospace",
            fontWeight: "bold",
            padding: "1px 5px",
            borderRadius: 2,
          }}
        >
          {platformLabel}
        </span>
        <span style={{ color: playerColor, fontSize: 10, fontFamily: "monospace" }}>
          [{playerLabel}] {fighter.name.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
