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
    closedUrl: `${base}close.png`,
    openUrl:   `${base}open.png`,
  };
}

function checkImageExists(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img   = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src     = url;
  });
}

function useMouthFrames(fighter: Fighter | undefined) {
  const [closedUrl, setClosedUrl] = useState<string | null>(null);
  const [openUrl,   setOpenUrl]   = useState<string | null>(null);

  useEffect(() => {
    if (!fighter) { setClosedUrl(null); setOpenUrl(null); return; }
    const { closedUrl: cu, openUrl: ou } = getMouthUrls(fighter.imageUrl);

    let cancelled = false;
    Promise.all([checkImageExists(cu), checkImageExists(ou)]).then(([hasClosed, hasOpen]) => {
      if (cancelled) return;
      setClosedUrl(hasClosed ? cu : fighter.imageUrl);
      setOpenUrl(hasOpen   ? ou : fighter.imageUrl);
    });

    return () => { cancelled = true; };
  }, [fighter]);

  return { closedUrl, openUrl };
}

// Toggles mouth open/closed at a flapping rate while speaking
function useMouthFlap(speaking: boolean) {
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return; }
    const interval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 130);
    return () => clearInterval(interval);
  }, [speaking]);

  return mouthOpen;
}

export default function TtsOverlay() {
  const params    = new URLSearchParams(window.location.search);
  const urlTwitch = params.get("channel") || params.get("twitch") || "";
  const urlKick   = params.get("kick") || "";

  const [twitchInput, setTwitchInput] = useState(urlTwitch || import.meta.env.VITE_TWITCH_CHANNEL || "");
  const [kickInput,   setKickInput]   = useState(urlKick   || import.meta.env.VITE_KICK_CHANNEL   || "");
  const [showSetup,   setShowSetup]   = useState(!urlTwitch && !urlKick && !import.meta.env.VITE_TWITCH_CHANNEL);

  const [selection,   setSelection]   = useState<Selection>({});
  const [p1Speaking,  setP1Speaking]  = useState(false);
  const [p2Speaking,  setP2Speaking]  = useState(false);
  const [p1Text,      setP1Text]      = useState("");
  const [p2Text,      setP2Text]      = useState("");

  const speechQueueRef = useRef<SpeechJob[]>([]);
  const isSpeakingRef  = useRef(false);
  const pollChannelRef = useRef("");

  const p1 = selection.p1Fighter;
  const p2 = selection.p2Fighter;

  const { closedUrl: p1Closed, openUrl: p1Open } = useMouthFrames(p1);
  const { closedUrl: p2Closed, openUrl: p2Open } = useMouthFrames(p2);

  // Animate mouth flapping while speaking
  const p1MouthOpen = useMouthFlap(p1Speaking);
  const p2MouthOpen = useMouthFlap(p2Speaking);

  const p1ImgSrc = p1Speaking && p1MouthOpen && p1Open ? p1Open : p1Closed ?? p1?.imageUrl;
  const p2ImgSrc = p2Speaking && p2MouthOpen && p2Open ? p2Open : p2Closed ?? p2?.imageUrl;

  const pollSelection = useCallback(async (ch: string) => {
    try {
      if (ch) {
        const res = await fetch(`/api/selections/${encodeURIComponent(ch)}`);
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
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pollChannelRef.current) pollSelection(pollChannelRef.current);
      else pollSelection("");
    }, 3000);
    return () => clearInterval(interval);
  }, [pollSelection]);

  useEffect(() => {
    pollSelection("");
  }, [pollSelection]);

  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    const job = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const setSpeaking = job.player === 1 ? setP1Speaking : setP2Speaking;
    const setText     = job.player === 1 ? setP1Text     : setP2Text;

    setSpeaking(true);
    setText(job.text);

    if (!window.speechSynthesis) {
      setSpeaking(false); isSpeakingRef.current = false; processQueue(); return;
    }

    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(job.text);
    utt.rate   = 0.95;
    utt.pitch  = job.player === 1 ? 1.15 : 0.82;
    utt.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    utt.voice = job.player === 1
      ? (voices.find(v => v.lang === "en-US" && /female|zira|samantha|karen/i.test(v.name)) || voices.find(v => v.lang === "en-US") || voices[0])
      : (voices.find(v => v.lang === "en-US" && /male|david|alex|daniel/i.test(v.name))   || voices.find(v => v.lang === "en-US") || voices[0]);

    const finish = () => {
      setSpeaking(false);
      setTimeout(() => setText(""), 700);
      isSpeakingRef.current = false;
      processQueue();
    };
    utt.onend   = finish;
    utt.onerror = finish;

    window.speechSynthesis.speak(utt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enqueueSpeech = useCallback((player: 1 | 2, text: string) => {
    if (speechQueueRef.current.length >= 3) return;
    speechQueueRef.current.push({ text, player });
    processQueue();
  }, [processQueue]);

  const handleTwitchMessage = useCallback((_user: string, msg: string) => {
    const lower    = msg.trim().toLowerCase();
    const prefixes = ["!tts ", "!say ", "!p1 "];
    for (const pfx of prefixes) {
      if (lower.startsWith(pfx)) {
        const text = msg.trim().slice(pfx.length).trim();
        if (text) enqueueSpeech(1, text);
        return;
      }
    }
  }, [enqueueSpeech]);

  const handleKickMessage = useCallback((_user: string, msg: string) => {
    const lower    = msg.trim().toLowerCase();
    const prefixes = ["!tts ", "!say ", "!p2 "];
    for (const pfx of prefixes) {
      if (lower.startsWith(pfx)) {
        const text = msg.trim().slice(pfx.length).trim();
        if (text) enqueueSpeech(2, text);
        return;
      }
    }
  }, [enqueueSpeech]);

  const twitch = useTwitchControls({ onCommand: handleTwitchMessage });
  const kick   = useKickControls({ onCommand: handleKickMessage });

  useEffect(() => {
    const ch = twitch.channel || kick.channel;
    if (ch && ch !== pollChannelRef.current) {
      pollChannelRef.current = ch;
      pollSelection(ch);
    }
  }, [twitch.channel, kick.channel, pollSelection]);

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

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "transparent" }}>

      {showSetup && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          zIndex: 50, background: "rgba(0,0,0,0.94)", border: "2px solid #fff",
          padding: "28px 36px", minWidth: 360, fontFamily: "monospace",
        }}>
          <p style={{ color: "#ffdd00", fontSize: 13, marginBottom: 6, fontWeight: "bold", textAlign: "center" }}>
            FIGHTER TTS BOTS — SETUP
          </p>
          <p style={{ color: "#888", fontSize: 10, textAlign: "center", marginBottom: 18 }}>
            Twitch chat → P1 fighter speaks · Kick chat → P2 fighter speaks
          </p>
          <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ color: "#9146FF", fontSize: 10, marginBottom: 4 }}>TWITCH CHANNEL → P1 Fighter speaks</div>
              <input value={twitchInput} onChange={e => setTwitchInput(e.target.value)}
                placeholder="your twitch channel"
                style={{ width: "100%", background: "#111", border: "1px solid #9146FF", color: "#fff", padding: "7px 10px", fontSize: 12 }}
                data-testid="tts-input-twitch" />
            </div>
            <div>
              <div style={{ color: "#53FC18", fontSize: 10, marginBottom: 4 }}>KICK CHANNEL → P2 Fighter speaks</div>
              <input value={kickInput} onChange={e => setKickInput(e.target.value)}
                placeholder="your kick channel (optional)"
                style={{ width: "100%", background: "#111", border: "1px solid #53FC18", color: "#fff", padding: "7px 10px", fontSize: 12 }}
                data-testid="tts-input-kick" />
            </div>
            <button type="submit"
              style={{ marginTop: 4, background: "#ffdd00", color: "#000", border: "none", padding: "9px", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
              data-testid="tts-button-connect">
              CONNECT &amp; START
            </button>
          </form>
          <div style={{ marginTop: 16, padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
            <p style={{ color: "#aaa", fontSize: 10, marginBottom: 4 }}>Chat commands:</p>
            <p style={{ color: "#9146FF", fontSize: 10 }}>Twitch: <span style={{ color: "#fff" }}>!tts hello chat</span></p>
            <p style={{ color: "#53FC18", fontSize: 10 }}>Kick: &nbsp;&nbsp;<span style={{ color: "#fff" }}>!tts lets go</span></p>
          </div>
        </div>
      )}

      {!showSetup && (
        <button onClick={() => setShowSetup(true)}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 50,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 14, cursor: "pointer",
          }}
          data-testid="tts-button-settings" title="Settings">⚙</button>
      )}

      {!showSetup && (
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 50 }}>
          {twitch.isConnected
            ? <span style={{ background: "#9146FF", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#fff", fontFamily: "monospace" }}>TW P1 ✓</span>
            : <span style={{ background: "rgba(145,70,255,0.15)", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#9146FF", fontFamily: "monospace", border: "1px solid #9146FF55" }}>TW P1 ✗</span>
          }
          {kick.isConnected
            ? <span style={{ background: "#53FC18", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#000", fontFamily: "monospace" }}>KK P2 ✓</span>
            : <span style={{ background: "rgba(83,252,24,0.1)", borderRadius: 4, padding: "2px 8px", fontSize: 9, color: "#53FC18", fontFamily: "monospace", border: "1px solid #53FC1855" }}>KK P2 ✗</span>
          }
        </div>
      )}

      {!p1 && !p2 && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#777", padding: "8px 18px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap",
        }}>
          Waiting for fighters to be selected on the select screen...
        </div>
      )}

      {/* Both fighters side-by-side, centered at the bottom */}
      {(p1 || p2) && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 20,
        }}>
          {p1 && (
            <FighterBot
              fighter={p1}
              imgSrc={p1ImgSrc}
              side="left"
              speaking={p1Speaking}
              speechText={p1Text}
              playerLabel="P1"
              platformLabel="TWITCH"
              playerColor="#6699ff"
              platformColor="#9146FF"
              platformTextColor="#fff"
            />
          )}
          {p2 && (
            <FighterBot
              fighter={p2}
              imgSrc={p2ImgSrc}
              side="right"
              speaking={p2Speaking}
              speechText={p2Text}
              playerLabel="P2"
              platformLabel="KICK"
              playerColor="#ff6666"
              platformColor="#53FC18"
              platformTextColor="#000"
            />
          )}
        </div>
      )}
    </div>
  );
}

interface FighterBotProps {
  fighter: Fighter;
  imgSrc: string | null | undefined;
  side: "left" | "right";
  speaking: boolean;
  speechText: string;
  playerLabel: string;
  platformLabel: string;
  playerColor: string;
  platformColor: string;
  platformTextColor: string;
}

function FighterBot({ fighter, imgSrc, side, speaking, speechText, playerLabel, platformLabel, playerColor, platformColor, platformTextColor }: FighterBotProps) {
  const isLeft = side === "left";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        maxWidth: 240,
        background: "rgba(0,0,0,0.90)",
        border: `2px solid ${playerColor}`,
        borderRadius: 10,
        padding: "9px 16px",
        marginBottom: 10,
        fontSize: 13,
        lineHeight: 1.4,
        color: "#fff",
        fontFamily: "monospace",
        wordBreak: "break-word",
        boxShadow: `0 0 20px ${playerColor}44`,
        opacity: speechText ? 1 : 0,
        transition: "opacity 0.3s ease",
        position: "relative",
        textAlign: "center",
      }}>
        {speechText || " "}
        <div style={{
          position: "absolute", bottom: -11,
          left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
          borderTop: `11px solid ${playerColor}`,
        }} />
      </div>

      <img
        src={imgSrc || fighter.imageUrl}
        alt={fighter.name}
        data-testid={`tts-fighter-${side}`}
        style={{
          width: 200,
          height: 200,
          objectFit: "contain",
          imageRendering: "pixelated",
          transform: isLeft ? "scaleX(1)" : "scaleX(-1)",
          filter: speaking
            ? `drop-shadow(0 0 22px ${playerColor}) brightness(1.18)`
            : `drop-shadow(0 0 8px ${playerColor}66)`,
          transition: "filter 0.2s ease",
        }}
      />

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
          background: platformColor, color: platformTextColor,
          fontSize: 8, fontFamily: "monospace", fontWeight: "bold",
          padding: "1px 5px", borderRadius: 2,
        }}>
          {platformLabel}
        </span>
        <span style={{ color: playerColor, fontSize: 10, fontFamily: "monospace" }}>
          [{playerLabel}] {fighter.name.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
