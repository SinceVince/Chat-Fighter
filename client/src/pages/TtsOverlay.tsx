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
  updatedAt?: string;
}

type SpeechJob = { text: string; player: 1 | 2 };

// Twitch = P1's voice  |  Kick = P2's voice
// Command from either platform: !tts <message>
// Twitch !tts → P1 fighter speaks
// Kick   !tts → P2 fighter speaks

export default function TtsOverlay() {
  const params      = new URLSearchParams(window.location.search);
  const urlTwitch   = params.get("channel") || params.get("twitch") || "";
  const urlKick     = params.get("kick") || "";

  const [twitchInput, setTwitchInput] = useState(urlTwitch || import.meta.env.VITE_TWITCH_CHANNEL || "");
  const [kickInput, setKickInput]     = useState(urlKick || import.meta.env.VITE_KICK_CHANNEL || "");
  const [showSetup, setShowSetup]     = useState(!urlTwitch && !urlKick && !import.meta.env.VITE_TWITCH_CHANNEL);

  const [selection, setSelection]     = useState<Selection>({});
  const [p1Speaking, setP1Speaking]   = useState(false);
  const [p2Speaking, setP2Speaking]   = useState(false);
  const [p1Text, setP1Text]           = useState("");
  const [p2Text, setP2Text]           = useState("");

  const speechQueueRef = useRef<SpeechJob[]>([]);
  const isSpeakingRef  = useRef(false);
  const pollChannelRef = useRef("");

  // ── Poll API for current fighter selections ────────────────────────────────
  const pollSelection = useCallback(async (ch: string) => {
    if (!ch) return;
    try {
      const res  = await fetch(`/api/selections/${encodeURIComponent(ch)}`);
      if (!res.ok) return;
      const data: Selection = await res.json();
      setSelection(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pollChannelRef.current) pollSelection(pollChannelRef.current);
    }, 3000);
    return () => clearInterval(interval);
  }, [pollSelection]);

  // ── TTS engine ─────────────────────────────────────────────────────────────
  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    const job         = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;
    const setSpeaking = job.player === 1 ? setP1Speaking : setP2Speaking;
    const setText     = job.player === 1 ? setP1Text     : setP2Text;

    setSpeaking(true);
    setText(job.text);

    if (!window.speechSynthesis) {
      setSpeaking(false);
      isSpeakingRef.current = false;
      processQueue();
      return;
    }

    window.speechSynthesis.cancel();
    const utt   = new SpeechSynthesisUtterance(job.text);
    utt.rate    = 0.95;
    utt.pitch   = job.player === 1 ? 1.15 : 0.82;
    utt.volume  = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (job.player === 1) {
      // P1 (Twitch) — higher, brighter voice
      utt.voice = voices.find(v => v.lang === "en-US" && /female|zira|samantha|karen/i.test(v.name))
               || voices.find(v => v.lang === "en-US")
               || voices[0];
    } else {
      // P2 (Kick) — lower, deeper voice
      utt.voice = voices.find(v => v.lang === "en-US" && /male|david|alex|daniel/i.test(v.name))
               || voices.find(v => v.lang === "en-US")
               || voices[0];
    }

    utt.onend  = () => { done(setSpeaking, setText); };
    utt.onerror = () => { done(setSpeaking, setText); };
    window.speechSynthesis.speak(utt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const done = (setSpeaking: (v: boolean) => void, setText: (v: string) => void) => {
    setSpeaking(false);
    setTimeout(() => setText(""), 600);
    isSpeakingRef.current = false;
    processQueue();
  };

  const enqueueSpeech = useCallback((player: 1 | 2, text: string) => {
    if (speechQueueRef.current.length >= 3) return; // don't let queue pile up
    speechQueueRef.current.push({ text, player });
    processQueue();
  }, [processQueue]);

  // ── Twitch messages → P1 speaks ───────────────────────────────────────────
  const handleTwitchMessage = useCallback((user: string, msg: string) => {
    // Accept: !tts <text>  |  !say <text>  |  !p1 <text>
    const lower = msg.trim().toLowerCase();
    const prefixes = ["!tts ", "!say ", "!p1 "];
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        const text = msg.trim().slice(prefix.length).trim();
        if (text) enqueueSpeech(1, text);
        return;
      }
    }
  }, [enqueueSpeech]);

  // ── Kick messages → P2 speaks ─────────────────────────────────────────────
  const handleKickMessage = useCallback((user: string, msg: string) => {
    // Accept: !tts <text>  |  !say <text>  |  !p2 <text>
    const lower = msg.trim().toLowerCase();
    const prefixes = ["!tts ", "!say ", "!p2 "];
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        const text = msg.trim().slice(prefix.length).trim();
        if (text) enqueueSpeech(2, text);
        return;
      }
    }
  }, [enqueueSpeech]);

  const twitch = useTwitchControls({ onCommand: handleTwitchMessage });
  const kick   = useKickControls({ onCommand: handleKickMessage });

  // When either connects, start polling for fighter selections
  useEffect(() => {
    const ch = twitch.channel || kick.channel;
    if (ch && ch !== pollChannelRef.current) {
      pollChannelRef.current = ch;
      pollSelection(ch);
    }
  }, [twitch.channel, kick.channel, pollSelection]);

  // Auto-connect from URL params or env vars on first load
  useEffect(() => {
    if (urlTwitch) twitch.connect(urlTwitch);
    else if (import.meta.env.VITE_TWITCH_CHANNEL) twitch.connect(import.meta.env.VITE_TWITCH_CHANNEL);

    if (urlKick) kick.connect(urlKick);
    else if (import.meta.env.VITE_KICK_CHANNEL) kick.connect(import.meta.env.VITE_KICK_CHANNEL);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (twitchInput) twitch.connect(twitchInput);
    if (kickInput)   kick.connect(kickInput);
    setShowSetup(false);
  };

  const isConnected = twitch.isConnected || kick.isConnected;
  const p1 = selection.p1Fighter;
  const p2 = selection.p2Fighter;

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: "transparent" }}>

      {/* ── Setup panel ───────────────────────────────────────────────────── */}
      {showSetup && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", zIndex: 50,
          background: "rgba(0,0,0,0.94)", border: "2px solid #fff",
          padding: "28px 36px", minWidth: 360, fontFamily: "monospace",
        }}>
          <p style={{ color: "#ffdd00", fontSize: 13, marginBottom: 6, fontWeight: "bold", textAlign: "center" }}>
            🎮 FIGHTER TTS BOTS — SETUP
          </p>
          <p style={{ color: "#888", fontSize: 10, textAlign: "center", marginBottom: 18 }}>
            Twitch chat controls P1 · Kick chat controls P2
          </p>

          <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Twitch = P1 */}
            <div>
              <div style={{ color: "#9146FF", fontSize: 10, marginBottom: 4 }}>
                TWITCH CHANNEL → P1 Fighter speaks
              </div>
              <input
                value={twitchInput}
                onChange={e => setTwitchInput(e.target.value)}
                placeholder="your twitch channel name"
                style={{ width: "100%", background: "#111", border: "1px solid #9146FF", color: "#fff", padding: "7px 10px", fontSize: 12 }}
                data-testid="tts-input-twitch"
              />
            </div>

            {/* Kick = P2 */}
            <div>
              <div style={{ color: "#53FC18", fontSize: 10, marginBottom: 4 }}>
                KICK CHANNEL → P2 Fighter speaks
              </div>
              <input
                value={kickInput}
                onChange={e => setKickInput(e.target.value)}
                placeholder="your kick channel name (optional)"
                style={{ width: "100%", background: "#111", border: "1px solid #53FC18", color: "#fff", padding: "7px 10px", fontSize: 12 }}
                data-testid="tts-input-kick"
              />
            </div>

            <button
              type="submit"
              style={{ marginTop: 4, background: "#ffdd00", color: "#000", border: "none", padding: "9px", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
              data-testid="tts-button-connect"
            >
              CONNECT &amp; START
            </button>
          </form>

          <div style={{ marginTop: 16, padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
            <p style={{ color: "#aaa", fontSize: 10, marginBottom: 4 }}>Chat commands:</p>
            <p style={{ color: "#9146FF", fontSize: 10 }}>Twitch: <span style={{ color: "#fff" }}>!tts hello chat</span> → P1 speaks</p>
            <p style={{ color: "#53FC18", fontSize: 10 }}>Kick: &nbsp;&nbsp;<span style={{ color: "#fff" }}>!tts lets go</span> → P2 speaks</p>
          </div>
        </div>
      )}

      {/* ── Settings gear ─────────────────────────────────────────────────── */}
      {!showSetup && (
        <button
          onClick={() => setShowSetup(true)}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 50,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: "50%", width: 28, height: 28,
            fontSize: 14, cursor: "pointer",
          }}
          data-testid="tts-button-settings"
          title="Settings"
        >
          ⚙
        </button>
      )}

      {/* ── Connection status badges ───────────────────────────────────────── */}
      {!showSetup && (
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 50 }}>
          {twitch.isConnected
            ? <span style={{ background: "#9146FF", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#fff", fontFamily: "monospace" }}>TW P1 ✓</span>
            : <span style={{ background: "rgba(145,70,255,0.2)", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#9146FF", fontFamily: "monospace", border: "1px solid #9146FF55" }}>TW P1 ✗</span>
          }
          {kick.isConnected
            ? <span style={{ background: "#53FC18", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#000", fontFamily: "monospace" }}>KK P2 ✓</span>
            : <span style={{ background: "rgba(83,252,24,0.1)", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#53FC18", fontFamily: "monospace", border: "1px solid #53FC1855" }}>KK P2 ✗</span>
          }
        </div>
      )}

      {/* ── Waiting message ───────────────────────────────────────────────── */}
      {isConnected && !p1 && !p2 && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#777", padding: "8px 18px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap",
        }}>
          Waiting for fighters to be selected on the select screen...
        </div>
      )}

      {/* ── P1 Fighter (Twitch) — bottom left ────────────────────────────── */}
      {p1 && (
        <FighterBot
          fighter={p1}
          side="left"
          speaking={p1Speaking}
          speechText={p1Text}
          playerLabel="P1"
          platformLabel="TWITCH"
          playerColor="#6699ff"
          platformColor="#9146FF"
        />
      )}

      {/* ── P2 Fighter (Kick) — bottom right ─────────────────────────────── */}
      {p2 && (
        <FighterBot
          fighter={p2}
          side="right"
          speaking={p2Speaking}
          speechText={p2Text}
          playerLabel="P2"
          platformLabel="KICK"
          playerColor="#ff6666"
          platformColor="#53FC18"
        />
      )}
    </div>
  );
}

// ── Fighter bot component ──────────────────────────────────────────────────────
interface FighterBotProps {
  fighter: Fighter;
  side: "left" | "right";
  speaking: boolean;
  speechText: string;
  playerLabel: string;
  platformLabel: string;
  playerColor: string;
  platformColor: string;
}

function FighterBot({ fighter, side, speaking, speechText, playerLabel, platformLabel, playerColor, platformColor }: FighterBotProps) {
  const isLeft = side === "left";

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      [isLeft ? "left" : "right"]: 40,
      display: "flex",
      flexDirection: "column",
      alignItems: isLeft ? "flex-start" : "flex-end",
    }}>

      {/* Speech bubble */}
      <div style={{
        maxWidth: 300,
        background: "rgba(0,0,0,0.90)",
        border: `2px solid ${playerColor}`,
        borderRadius: 10,
        padding: "9px 16px",
        marginBottom: 10,
        [isLeft ? "marginLeft" : "marginRight"]: 24,
        fontSize: 13,
        lineHeight: 1.4,
        color: "#fff",
        fontFamily: "monospace",
        wordBreak: "break-word",
        boxShadow: `0 0 20px ${playerColor}44`,
        opacity: speechText ? 1 : 0,
        transition: "opacity 0.3s ease",
        position: "relative",
      }}>
        {speechText || " "}
        {/* Bubble tail */}
        <div style={{
          position: "absolute",
          bottom: -11,
          [isLeft ? "left" : "right"]: 22,
          width: 0, height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: `11px solid ${playerColor}`,
        }} />
      </div>

      {/* Fighter image */}
      <img
        src={fighter.imageUrl}
        alt={fighter.name}
        data-testid={`tts-fighter-${side}`}
        style={{
          width: 200,
          height: 200,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: speaking
            ? `drop-shadow(0 0 22px ${playerColor}) brightness(1.18)`
            : `drop-shadow(0 0 8px ${playerColor}66)`,
          animation: speaking ? "tts-bob 0.2s steps(2) infinite" : "none",
          transform: speaking ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.3s ease, filter 0.3s ease",
        }}
      />

      {/* Name plate with platform badge */}
      <div style={{
        background: "rgba(0,0,0,0.88)",
        border: `1px solid ${playerColor}`,
        padding: "4px 12px",
        marginTop: 3,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{
          background: platformColor,
          color: platformLabel === "KICK" ? "#000" : "#fff",
          fontSize: 8,
          fontFamily: "monospace",
          fontWeight: "bold",
          padding: "1px 5px",
          borderRadius: 2,
        }}>
          {platformLabel}
        </span>
        <span style={{ color: playerColor, fontSize: 10, fontFamily: "monospace" }}>
          [{playerLabel}] {fighter.name.toUpperCase()}
        </span>
      </div>

      <style>{`
        @keyframes tts-bob {
          0%   { transform: scale(1.05) translateY(0px);  }
          50%  { transform: scale(1.07) translateY(-7px); }
          100% { transform: scale(1.05) translateY(0px);  }
        }
      `}</style>
    </div>
  );
}
