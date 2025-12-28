import { useState, useEffect } from "react";
import { useFighters } from "@/hooks/use-fighters";
import { useTwitchControls } from "@/hooks/use-twitch-controls";
import { FighterCard } from "@/components/FighterCard";
import { AdminPanel } from "@/components/AdminPanel";
import { RetroButton } from "@/components/RetroButton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Gamepad2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelectScreen() {
  const { data: fighters, isLoading } = useFighters();
  const [channelInput, setChannelInput] = useState("");
  
  // Get channel from environment variable or use empty string
  const defaultChannel = import.meta.env.VITE_TWITCH_CHANNEL || "";
  
  // Grid Configuration
  const COLUMNS = 8;
  const fightersList = fighters || [];
  
  const { 
    connect, 
    disconnect, 
    isConnected, 
    channel, 
    p1Cursor,
    p2Cursor,
    lastAction, 
    p1Selection,
    p2Selection,
    isP1Turn
  } = useTwitchControls({
    gridSize: fightersList.length,
    columns: COLUMNS,
    enabled: true
  });

  const p1Fighter = fightersList[p1Cursor];
  const p2Fighter = fightersList[p2Cursor];

  // Auto-connect if channel is provided via environment variable
  useEffect(() => {
    if (defaultChannel && !isConnected) {
      connect(defaultChannel);
    }
  }, []); // Empty dependency array - only run once on mount

  // Manual connect handler
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    connect(channelInput);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-primary font-arcade animate-pulse">
        INSERT COIN...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 crt-scanline z-50 pointer-events-none opacity-20" />
      <AdminPanel />

      {/* Header / Connection Status */}
      <div className="w-full max-w-6xl flex justify-between items-end mb-8 border-b-2 border-white/10 pb-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-secondary animate-pulse uppercase italic tracking-tighter drop-shadow-lg">
            Select Your Fighter
          </h1>
          <p className="font-arcade text-xs text-muted-foreground mt-2 tracking-widest text-secondary">
            {isConnected ? `CONNECTED TO: ${channel.toUpperCase()}` : "WAITING FOR CONNECTION..."}
          </p>
        </div>

        {/* Connection Form */}
        {!isConnected ? (
          <form onSubmit={handleConnect} className="flex gap-2 items-center">
            <Input
              placeholder="Twitch Channel"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              className="w-48 bg-black/50 border-primary/50 text-white font-body"
              data-testid="input-twitch-channel"
            />
            <RetroButton type="submit" size="sm" variant="primary" data-testid="button-connect">
              Connect <Wifi className="w-3 h-3 ml-2" />
            </RetroButton>
          </form>
        ) : (
          <RetroButton onClick={disconnect} size="sm" variant="danger" data-testid="button-disconnect">
            Disconnect <WifiOff className="w-3 h-3 ml-2" />
          </RetroButton>
        )}
      </div>

      <div className="w-full max-w-screen grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-screen">
        
        {/* LEFT: P1 (Twitch Chat) Stats */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-start space-y-2 pt-4">
           <div className={cn(
             "bg-card/60 border p-3 rounded-lg backdrop-blur-sm transition-all",
             isP1Turn ? "border-primary/60" : "border-primary/20 opacity-60"
           )}>
             <h2 className="text-primary font-arcade text-[10px] mb-1 flex items-center gap-1">
               <Gamepad2 className="w-3 h-3" /> P1
             </h2>
             <div className="font-display text-lg text-white uppercase tracking-wider">
               Chat
             </div>
             {p1Selection && (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="mt-2 p-1 bg-accent text-accent-foreground rounded text-[9px] font-arcade text-center"
               >
                 LOCKED IN
               </motion.div>
             )}
             {lastAction && isP1Turn && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 key={lastAction.command + Date.now()}
                 className="mt-1 p-1 bg-black/60 rounded border-l border-secondary text-[9px]"
               >
                 <div className="text-muted-foreground">{lastAction.user}</div>
                 <div className="text-secondary font-arcade">{lastAction.command}</div>
               </motion.div>
             )}
           </div>
        </div>

        {/* CENTER: Grid */}
        <div className="lg:col-span-8 flex items-center justify-center p-2">
          <div 
            className="grid gap-2 w-full"
            style={{ 
              gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` 
            }}
          >
            {fightersList.map((fighter, idx) => (
              <FighterCard
                key={fighter.id}
                fighter={fighter}
                isP1Active={idx === p1Cursor && isP1Turn}
                isP2Active={idx === p2Cursor && !isP1Turn}
                isActive={idx === p1Cursor || idx === p2Cursor}
                isSelected={p1Selection?.index === idx || p2Selection?.index === idx}
              />
            ))}
            
          </div>
        </div>

        {/* RIGHT: P2 and Info */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-start space-y-2 pt-4">
          <div className={cn(
            "bg-card/60 border p-3 rounded-lg backdrop-blur-sm transition-all",
            !isP1Turn ? "border-secondary/60" : "border-secondary/20 opacity-60"
          )}>
            <h2 className="text-secondary font-arcade text-[10px] mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> P2
            </h2>
            <div className="font-display text-lg text-white uppercase tracking-wider">
              Chat
            </div>
            {p2Selection && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-2 p-1 bg-accent text-accent-foreground rounded text-[9px] font-arcade text-center"
              >
                LOCKED IN
              </motion.div>
            )}
            {lastAction && !isP1Turn && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={lastAction.command + Date.now()}
                className="mt-1 p-1 bg-black/60 rounded border-l border-primary text-[9px]"
              >
                <div className="text-muted-foreground">{lastAction.user}</div>
                <div className="text-primary font-arcade">{lastAction.command}</div>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-black/40 p-3 rounded text-[9px] text-muted-foreground font-mono space-y-0.5">
            <div>!UP / !DOWN</div>
            <div>!LEFT / !RIGHT</div>
            <div className="text-accent">!SELECT to pick</div>
            <div className="text-xs mt-2 border-t border-white/10 pt-2">
              {isP1Turn ? "▶ P1 choosing..." : "▶ P2 choosing..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
