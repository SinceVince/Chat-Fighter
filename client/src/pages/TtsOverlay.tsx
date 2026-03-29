import { useState, useEffect, useRef, useCallback } from "react";
import { useTwitchControls } from "@/hooks/use-twitch-controls";
import { useKickControls } from "@/hooks/use-kick-controls";
import { cn } from "@/lib/utils";

interface Fighter {
  id: number;
  name: string;
  imageUrl: string;
}

interface Selection {
  p1Fighter?: Fighter;
  p2Fighter?: Fighter;
  updatedAt?: string;
}

// --- Speech queue so messages don't overlap ---
type SpeechJob = { text: string; player: 1 | 2 };

export default function TtsOverlay() {
  // Read channel from URL param: /tts?channel=mychannel
  const params = new URLSearchParams(window.location.search);
  const urlChannel = params.get("channel") || "";

  const [twitchInput, setTwitchInput]   = useState(urlChannel || import.meta.env.VITE_TWITCH_CHANNEL || "");
  const [kickInput, setKickInput]       = useState(import.meta.env.VITE_KICK_CHANNEL || "");
  const [showSetup, setShowSetup]       = useState(!urlChannel && !import.meta.env.VITE_TWITCH_CHANNEL);
  const [selection, setSelection]       = useState<Selection>({});
  const [p1Speaking, setP1Speaking]     = useState(false);
  const [p2Speaking, setP2Speaking]     = useState(false);
  const [p1Text, setP1Text]             = useState("");
  const [p2Text, setP2Text]             = useState("");

  const speechQueueRef  = useRef<SpeechJob[]>([]);
  const isSpeakingRef   = useRef(false);
  const pollChannelRef  = useRef<string>("");

  // --- Poll API for fighter selections ---
  const pollSelection = useCallback(async (ch: string) => {
    if (!ch) return;
    try {
      const res = await fetch(`/api/selections/${encodeURIComponent(ch)}`);
      if (!res.ok) return;
      const data: Selection = await res.json();
      setSelection(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!pollChannelRef.current) return;
    const interval = setInterval(() => pollSelection(pollChannelRef.current), 3000);
    pollSelection(pollChannelRef.current);
    return () => clearInterval(interval);
  }, [pollSelection]);

  // --- TTS engine using Web Speech API ---
  const processQueue = useCallback(() => {
    if (isSpeakingRef.current) return;
    if (speechQueueRef.current.length === 0) return;

    const job = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const setSpeaking = job.player === 1 ? setP1Speaking : setP2Speaking;
    const setText     = job.player === 1 ? setP1Text : setP2Text;

    setSpeaking(true);
    setText(job.text);

    if (!window.speechSynthesis) {
      setSpeaking(false);
      isSpeakingRef.current = false;
      processQueue();
      return;
    }

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(job.text);
    utt.rate   = 0.95;
    utt.pitch  = job.player === 1 ? 1.1 : 0.85;
    utt.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (job.player === 1) {
      const v = voices.find(v => v.lang === "en-US" && /female|zira|samantha/i.test(v.name))
             || voices.find(v => v.lang === "en-US")
             || voices[0];
      if (v) utt.voice = v;
    } else {
      const v = voices.find(v => v.lang === "en-US" && /male|david|alex/i.test(v.name))
             || voices.find(v => v.lang === "en-US")
             || voices[0];
      if (v) utt.voice = v;
    }

    utt.onend = () => {
      setSpeaking(false);
      setTimeout(() => setText(""), 600);
      isSpeakingRef.current = false;
      processQueue();
    };

    utt.onerror = () => {
      setSpeaking(false);
      setText("");
      isSpeakingRef.current = false;
      processQueue();
    };

    window.speechSynthesis.speak(utt);
  }, []);

  const enqueueSpeech = useCallback((player: 1 | 2, text: string) => {
    // Limit queue to 3 messages so it doesn't pile up endlessly
    if (speechQueueRef.current.length >= 3) return;
    speechQueueRef.current.push({ text, player });
    processQueue();
  }, [processQueue]);

  // --- Chat command handler ---
  const handleCommand = useCallback((user: string, rawMessage: string) => {
    const msg = rawMessage.trim();

    if (msg.toLowerCase().startsWith("!p1 ")) {
      const text = msg.slice(4).trim();
      if (text) enqueueSpeech(1, text);
    } else if (msg.toLowerCase().startsWith("!p2 ")) {
      const text = msg.slice(4).trim();
      if (text) enqueueSpeech(2, text);
    }
  }, [enqueueSpeech]);

  const twitch = useTwitchControls({ onCommand: handleCommand });
  const kick   = useKickControls({ onCommand: handleCommand });

  // When a channel connects, start polling selections with it
  useEffect(() => {
    const ch = twitch.channel || kick.channel;
    if (ch) {
      pollChannelRef.current = ch;
      pollSelection(ch);
    }
  }, [twitch.channel, kick.channel, pollSelection]);

  // Auto-connect on load if URL param or env var is set
  useEffect(() => {
    const ch = urlChannel || import.meta.env.VITE_TWITCH_CHANNEL;
    if (ch && !twitch.isConnected) {
      twitch.connect(ch);
    }
    const kc = import.meta.env.VITE_KICK_CHANNEL;
    if (kc && !kick.isConnected) {
      kick.connect(kc);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (twitchInput) twitch.connect(twitchInput);
    if (kickInput) kick.connect(kickInput);
    setShowSetup(false);
  };

  const isConnected = twitch.isConnected || kick.isConnected;
  const p1 = selection.p1Fighter;
  const p2 = selection.p2Fighter;

  return (
    // Transparent background — designed as an OBS Browser Source overlay
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: "transparent" }}>

      {/* Setup Panel — only shown when not connected via URL param */}
      {showSetup && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          style={{ background: "rgba(0,0,0,0.92)", border: "2px solid #fff", padding: "24px 32px", minWidth: 340, fontFamily: "monospace" }}
        >
          <p style={{ color: "#ffdd00", fontSize: 13, marginBottom: 16, fontWeight: "bold", textAlign: "center" }}>
            🎮 TTS BOT — SETUP
          </p>
          <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#9146FF", fontSize: 11, width: 60 }}>TWITCH</span>
              <input
                value={twitchInput}
                onChange={e => setTwitchInput(e.target.value)}
                placeholder="channel name"
                style={{ flex: 1, background: "#111", border: "1px solid #9146FF", color: "#fff", padding: "6px 10px", fontSize: 12 }}
                data-testid="tts-input-twitch"
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#53FC18", fontSize: 11, width: 60 }}>KICK</span>
              <input
                value={kickInput}
                onChange={e => setKickInput(e.target.value)}
                placeholder="channel name (optional)"
                style={{ flex: 1, background: "#111", border: "1px solid #53FC18", color: "#fff", padding: "6px 10px", fontSize: 12 }}
                data-testid="tts-input-kick"
              />
            </div>
            <button
              type="submit"
              style={{ marginTop: 8, background: "#ffdd00", color: "#000", border: "none", padding: "8px", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
              data-testid="tts-button-connect"
            >
              CONNECT &amp; START
            </button>
          </form>
          <p style={{ color: "#666", fontSize: 10, marginTop: 14, textAlign: "center" }}>
            Chat uses: !p1 &lt;message&gt; or !p2 &lt;message&gt;
          </p>
        </div>
      )}

      {/* Gear icon to re-open setup */}
      {!showSetup && (
        <button
          onClick={() => setShowSetup(true)}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 50,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: "50%", width: 28, height: 28,
            fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
          }}
          data-testid="tts-button-settings"
          title="Settings"
        >
          ⚙
        </button>
      )}

      {/* Connection status dots (top-left, small) */}
      {!showSetup && (
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 50 }}>
          {twitch.isConnected && (
            <span style={{ background: "#9146FF", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#fff", fontFamily: "monospace" }}>
              TW ✓
            </span>
          )}
          {kick.isConnected && (
            <span style={{ background: "#53FC18", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#000", fontFamily: "monospace" }}>
              KK ✓
            </span>
          )}
          {!isConnected && (
            <span style={{ background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#888", fontFamily: "monospace" }}>
              NOT CONNECTED
            </span>
          )}
        </div>
      )}

      {/* No fighters selected yet */}
      {isConnected && !p1 && !p2 && (
        <div
          style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#888", padding: "8px 16px", fontSize: 11, fontFamily: "monospace",
            whiteSpace: "nowrap"
          }}
        >
          Waiting for fighters to be selected on the select screen...
        </div>
      )}

      {/* P1 Fighter — bottom left */}
      {p1 && (
        <FighterBot
          fighter={p1}
          side="left"
          speaking={p1Speaking}
          speechText={p1Text}
          playerLabel="P1"
          playerColor="#6699ff"
        />
      )}

      {/* P2 Fighter — bottom right */}
      {p2 && (
        <FighterBot
          fighter={p2}
          side="right"
          speaking={p2Speaking}
          speechText={p2Text}
          playerLabel="P2"
          playerColor="#ff6666"
        />
      )}
    </div>
  );
}

// ── Individual fighter TTS bot component ──────────────────────────────────────
interface FighterBotProps {
  fighter: Fighter;
  side: "left" | "right";
  speaking: boolean;
  speechText: string;
  playerLabel: string;
  playerColor: string;
}

function FighterBot({ fighter, side, speaking, speechText, playerLabel, playerColor }: FighterBotProps) {
  const isLeft = side === "left";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        [isLeft ? "left" : "right"]: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: isLeft ? "flex-start" : "flex-end",
        gap: 0,
        zIndex: 10,
      }}
    >
      {/* Speech bubble */}
      <div
        style={{
          maxWidth: 280,
          background: "rgba(0,0,0,0.88)",
          border: `2px solid ${playerColor}`,
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 8,
          [isLeft ? "marginLeft" : "marginRight"]: 20,
          fontSize: 13,
          color: "#fff",
          fontFamily: "monospace",
          wordBreak: "break-word",
          boxShadow: `0 0 16px ${playerColor}55`,
          opacity: speechText ? 1 : 0,
          transition: "opacity 0.3s ease",
          position: "relative",
        }}
      >
        {speechText}
        {/* Speech bubble tail */}
        <div style={{
          position: "absolute",
          bottom: -10,
          [isLeft ? "left" : "right"]: 20,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `10px solid ${playerColor}`,
        }} />
      </div>

      {/* Fighter image */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          src={fighter.imageUrl}
          alt={fighter.name}
          data-testid={`tts-fighter-${side}`}
          style={{
            width: 180,
            height: 180,
            objectFit: "contain",
            imageRendering: "pixelated",
            filter: speaking
              ? `drop-shadow(0 0 20px ${playerColor}) brightness(1.15)`
              : `drop-shadow(0 0 8px ${playerColor}88)`,
            transform: speaking ? "translateY(-8px) scale(1.05)" : "translateY(0px) scale(1)",
            transition: speaking
              ? "transform 0.12s steps(2), filter 0.15s ease"
              : "transform 0.3s ease, filter 0.3s ease",
            animation: speaking ? "tts-bob 0.22s steps(2) infinite" : "none",
          }}
        />

        {/* Name plate */}
        <div style={{
          background: "rgba(0,0,0,0.85)",
          border: `1px solid ${playerColor}`,
          padding: "3px 10px",
          fontSize: 10,
          fontFamily: "monospace",
          color: playerColor,
          marginTop: 2,
          textAlign: "center",
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          [{playerLabel}] {fighter.name.toUpperCase()}
        </div>
      </div>

      <style>{`
        @keyframes tts-bob {
          0%   { transform: translateY(-8px) scale(1.05); }
          50%  { transform: translateY(-14px) scale(1.06); }
          100% { transform: translateY(-8px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
