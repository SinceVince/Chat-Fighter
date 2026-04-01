import { useState, useEffect } from "react";
import { useFighters } from "@/hooks/use-fighters";
import { useFighterSelect } from "@/hooks/use-fighter-select";
import { useTwitchControls } from "@/hooks/use-twitch-controls";
import { useKickControls } from "@/hooks/use-kick-controls";
import { FighterCard } from "@/components/FighterCard";
import { AdminPanel } from "@/components/AdminPanel";
import { RetroButton } from "@/components/RetroButton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Gamepad2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelectScreen() {
  const { data: fighters, isLoading } = useFighters();
  const [twitchInput, setTwitchInput] = useState("");
  const [kickInput, setKickInput]     = useState("");

  const defaultTwitch = import.meta.env.VITE_TWITCH_CHANNEL || "";
  const defaultKick   = import.meta.env.VITE_KICK_CHANNEL   || "";

  const COLUMNS      = 8;
  const fightersList = fighters || [];

  // Shared game state — Twitch always moves P1, Kick always moves P2
  const {
    p1Cursor,
    p2Cursor,
    p1Selection,
    p2Selection,
    lastP1Action,
    lastP2Action,
    handleP1Command,
    handleP2Command,
    reset,
  } = useFighterSelect({ gridSize: fightersList.length, columns: COLUMNS });

  const twitch = useTwitchControls({ onCommand: handleP1Command }); // Twitch → P1
  const kick   = useKickControls({ onCommand: handleP2Command });   // Kick   → P2

  const activeChannel = twitch.channel || kick.channel;

  // Auto-connect on mount from env vars
  useEffect(() => {
    if (defaultTwitch && !twitch.isConnected) twitch.connect(defaultTwitch);
    if (defaultKick   && !kick.isConnected)   kick.connect(defaultKick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save selections to DB whenever either player locks in
  useEffect(() => {
    if (!activeChannel || fightersList.length === 0) return;
    const p1FighterId = p1Selection ? fightersList[p1Selection.index]?.id : null;
    const p2FighterId = p2Selection ? fightersList[p2Selection.index]?.id : null;
    if (!p1FighterId && !p2FighterId) return;

    fetch(`/api/selections/${encodeURIComponent(activeChannel)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p1FighterId, p2FighterId }),
    }).catch(() => {});
  }, [activeChannel, p1Selection, p2Selection, fightersList]);

  const handleDisconnectAll = () => {
    if (twitch.isConnected) twitch.disconnect();
    if (kick.isConnected)   kick.disconnect();
    reset();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-primary font-arcade animate-pulse">
        INSERT COIN...
      </div>
    );
  }

  const isAnyConnected = twitch.isConnected || kick.isConnected;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 crt-scanline z-50 pointer-events-none opacity-20" />
      <AdminPanel />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl mb-6 border-b-2 border-white/10 pb-4">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-secondary animate-pulse uppercase italic tracking-tighter drop-shadow-lg">
              Select Your Fighter
            </h1>
            <p className="font-arcade text-xs text-muted-foreground mt-2 tracking-widest text-secondary">
              {isAnyConnected
                ? [
                    twitch.isConnected && `TWITCH→P1: ${twitch.channel.toUpperCase()}`,
                    kick.isConnected   && `KICK→P2: ${kick.channel.toUpperCase()}`,
                  ].filter(Boolean).join("  •  ")
                : "CONNECT TWITCH FOR P1 · CONNECT KICK FOR P2"}
            </p>
          </div>

          {/* Connection forms */}
          <div className="flex flex-col gap-2">

            {/* Twitch = P1 */}
            {!twitch.isConnected ? (
              <form onSubmit={e => { e.preventDefault(); twitch.connect(twitchInput); }} className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5 bg-black/50 border border-[#9146FF]/50 rounded px-2 h-9">
                  <span className="text-[#9146FF] font-arcade text-[9px]">P1</span>
                  <div className="w-px h-4 bg-[#9146FF]/30" />
                  <Input
                    placeholder="Twitch channel"
                    value={twitchInput}
                    onChange={e => setTwitchInput(e.target.value)}
                    className="border-0 bg-transparent text-white font-body p-0 h-auto w-36 focus-visible:ring-0"
                    data-testid="input-twitch-channel"
                  />
                </div>
                <RetroButton type="submit" size="sm" variant="primary" data-testid="button-connect-twitch">
                  Connect <Wifi className="w-3 h-3 ml-1" />
                </RetroButton>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[#9146FF] font-arcade text-[10px]">
                  <span className="text-[8px] px-1 py-0.5 bg-[#9146FF]/20 border border-[#9146FF]/40 rounded">P1</span>
                  {twitch.channel.toUpperCase()} ✓
                </div>
                <RetroButton onClick={() => { twitch.disconnect(); reset(); }} size="sm" variant="danger" data-testid="button-disconnect-twitch">
                  <WifiOff className="w-3 h-3" />
                </RetroButton>
              </div>
            )}

            {/* Kick = P2 */}
            {!kick.isConnected ? (
              <form onSubmit={e => { e.preventDefault(); kick.connect(kickInput); }} className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5 bg-black/50 border border-[#53FC18]/50 rounded px-2 h-9">
                  <span className="text-[#53FC18] font-arcade text-[9px]">P2</span>
                  <div className="w-px h-4 bg-[#53FC18]/30" />
                  <Input
                    placeholder="Kick channel"
                    value={kickInput}
                    onChange={e => setKickInput(e.target.value)}
                    className="border-0 bg-transparent text-white font-body p-0 h-auto w-36 focus-visible:ring-0"
                    data-testid="input-kick-channel"
                  />
                </div>
                <RetroButton type="submit" size="sm" variant="primary" data-testid="button-connect-kick">
                  Connect <Wifi className="w-3 h-3 ml-1" />
                </RetroButton>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[#53FC18] font-arcade text-[10px]">
                  <span className="text-[8px] px-1 py-0.5 bg-[#53FC18]/20 border border-[#53FC18]/40 rounded">P2</span>
                  {kick.channel.toUpperCase()} ✓
                </div>
                <RetroButton onClick={kick.disconnect} size="sm" variant="danger" data-testid="button-disconnect-kick">
                  <WifiOff className="w-3 h-3" />
                </RetroButton>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-screen grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-screen">

        {/* ── LEFT: P1 (Twitch) ──────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-start space-y-2 pt-4">
          <div className={cn(
            "bg-card/60 border p-3 rounded-lg backdrop-blur-sm transition-all flex flex-col",
            twitch.isConnected ? "border-[#9146FF]/60" : "border-primary/20 opacity-50"
          )}>
            <h2 className="text-[#9146FF] font-arcade text-[10px] mb-1 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" /> P1 — TWITCH
            </h2>
            <div className="font-display text-lg text-white uppercase tracking-wider">
              {twitch.isConnected ? twitch.channel : "Not connected"}
            </div>

            {p1Selection && fightersList[p1Selection.index] ? (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 space-y-2">
                <div className="p-1 bg-[#9146FF]/30 text-white rounded text-[9px] font-arcade text-center border border-[#9146FF]/50">
                  ✓ LOCKED IN
                </div>
                <div className="relative w-full h-32 rounded overflow-hidden border-2 border-[#9146FF]/50">
                  <img
                    src={fightersList[p1Selection.index].imageUrl}
                    alt={fightersList[p1Selection.index].name}
                    className="w-full h-full object-cover"
                    data-testid="img-p1-selection"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/90 px-1 py-0.5">
                    <p className="text-[8px] font-arcade text-[#9146FF] text-center truncate">
                      {fightersList[p1Selection.index].name}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <p className="text-[9px] text-muted-foreground font-arcade mt-1">
                  {twitch.isConnected ? "Twitch chat navigating..." : "Waiting for Twitch..."}
                </p>
                {lastP1Action && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={lastP1Action.command + Date.now()}
                    className="mt-1 p-1 bg-black/60 rounded border-l border-[#9146FF] text-[9px]"
                  >
                    <div className="text-muted-foreground">{lastP1Action.user}</div>
                    <div className="text-[#9146FF] font-arcade">{lastP1Action.command}</div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Fighter Grid ────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex items-center justify-center p-2">
          <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`, columnGap: 4, rowGap: 0 }}>
            {fightersList.map((fighter, idx) => (
              <FighterCard
                key={fighter.id}
                fighter={fighter}
                isP1Active={idx === p1Cursor && !p1Selection}
                isP2Active={idx === p2Cursor && !p2Selection}
                isActive={idx === p1Cursor || idx === p2Cursor}
                isSelected={p1Selection?.index === idx || p2Selection?.index === idx}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: P2 (Kick) ───────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-start space-y-2 pt-4">
          <div className={cn(
            "bg-card/60 border p-3 rounded-lg backdrop-blur-sm transition-all flex flex-col",
            kick.isConnected ? "border-[#53FC18]/60" : "border-secondary/20 opacity-50"
          )}>
            <h2 className="text-[#53FC18] font-arcade text-[10px] mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> P2 — KICK
            </h2>
            <div className="font-display text-lg text-white uppercase tracking-wider">
              {kick.isConnected ? kick.channel : "Not connected"}
            </div>

            {p2Selection && fightersList[p2Selection.index] ? (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 space-y-2">
                <div className="p-1 bg-[#53FC18]/20 text-[#53FC18] rounded text-[9px] font-arcade text-center border border-[#53FC18]/40">
                  ✓ LOCKED IN
                </div>
                <div className="relative w-full h-32 rounded overflow-hidden border-2 border-[#53FC18]/50">
                  <img
                    src={fightersList[p2Selection.index].imageUrl}
                    alt={fightersList[p2Selection.index].name}
                    className="w-full h-full object-cover"
                    data-testid="img-p2-selection"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/90 px-1 py-0.5">
                    <p className="text-[8px] font-arcade text-[#53FC18] text-center truncate">
                      {fightersList[p2Selection.index].name}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <p className="text-[9px] text-muted-foreground font-arcade mt-1">
                  {kick.isConnected ? "Kick chat navigating..." : "Waiting for Kick..."}
                </p>
                {lastP2Action && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={lastP2Action.command + Date.now()}
                    className="mt-1 p-1 bg-black/60 rounded border-l border-[#53FC18] text-[9px]"
                  >
                    <div className="text-muted-foreground">{lastP2Action.user}</div>
                    <div className="text-[#53FC18] font-arcade">{lastP2Action.command}</div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Controls reference */}
          <div className="bg-black/40 p-3 rounded text-[9px] text-muted-foreground font-mono space-y-0.5">
            <div>!UP / !DOWN</div>
            <div>!LEFT / !RIGHT</div>
            <div className="text-accent">!SELECT to pick</div>
            <div className="mt-2 pt-2 border-t border-white/10 text-[8px] space-y-1">
              <div className="text-[#9146FF]">▶ Twitch → P1</div>
              <div className="text-[#53FC18]">▶ Kick → P2</div>
            </div>
            {isAnyConnected && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <RetroButton onClick={handleDisconnectAll} size="sm" variant="danger" className="w-full text-[8px]" data-testid="button-disconnect-all">
                  Disconnect All
                </RetroButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
