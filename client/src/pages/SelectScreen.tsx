import { useState, useEffect } from "react";
import { useFighters } from "@/hooks/use-fighters";
import { useTwitchControls } from "@/hooks/use-twitch-controls";
import { FighterCard } from "@/components/FighterCard";
import { AdminPanel } from "@/components/AdminPanel";
import { RetroButton } from "@/components/RetroButton";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Gamepad2, Trophy } from "lucide-react";

export default function SelectScreen() {
  const { data: fighters, isLoading } = useFighters();
  const [channelInput, setChannelInput] = useState("");
  
  // Grid Configuration
  const COLUMNS = 4; // Adjust based on layout needs
  const fightersList = fighters || [];
  
  const { 
    connect, 
    disconnect, 
    isConnected, 
    channel, 
    cursorIndex, 
    lastAction, 
    selection 
  } = useTwitchControls({
    gridSize: fightersList.length,
    columns: COLUMNS,
    enabled: true
  });

  const activeFighter = fightersList[cursorIndex];
  const selectedFighter = selection ? fightersList[selection.index] : null;

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
            />
            <RetroButton type="submit" size="sm" variant="primary">
              Connect <Wifi className="w-3 h-3 ml-2" />
            </RetroButton>
          </form>
        ) : (
          <RetroButton onClick={disconnect} size="sm" variant="danger">
            Disconnect <WifiOff className="w-3 h-3 ml-2" />
          </RetroButton>
        )}
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
        
        {/* LEFT: P1 (Twitch Chat) Stats */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-end space-y-4">
           <div className="bg-card/50 border border-primary/30 p-4 rounded-lg backdrop-blur-sm">
             <h2 className="text-primary font-arcade text-xs mb-2 flex items-center gap-2">
               <Gamepad2 className="w-4 h-4" /> PLAYER 1
             </h2>
             <div className="font-display text-2xl text-white uppercase tracking-wider">
               Twitch Chat
             </div>
             {lastAction && (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 key={lastAction.command + Date.now()} // Force re-render animation
                 className="mt-4 p-2 bg-black/40 rounded border-l-2 border-secondary"
               >
                 <div className="text-[10px] text-muted-foreground font-mono">LATEST INPUT</div>
                 <div className="text-secondary font-arcade text-xs">
                   {lastAction.user}: <span className="text-white">{lastAction.command}</span>
                 </div>
               </motion.div>
             )}
           </div>

           {/* Controls Guide */}
           <div className="bg-black/40 p-4 rounded text-xs text-muted-foreground font-mono space-y-1">
             <div>!UP / !DOWN</div>
             <div>!LEFT / !RIGHT</div>
             <div className="text-accent">!SELECT to confirm</div>
           </div>
        </div>

        {/* CENTER: Grid */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div 
            className="grid grid-cols-4 gap-4 w-full"
            style={{ 
              gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` 
            }}
          >
            {fightersList.map((fighter, idx) => (
              <FighterCard
                key={fighter.id}
                fighter={fighter}
                isActive={idx === cursorIndex}
                isSelected={selection?.index === idx}
                onClick={() => {
                  // Allow manual click for testing
                  if (!isConnected) {
                    // Logic to simulate cursor move if wanted, or just nothing
                  }
                }}
              />
            ))}
            
            {/* Fill empty slots visually if needed to maintain grid shape */}
            {Array.from({ length: Math.max(0, COLUMNS * Math.ceil(fightersList.length / COLUMNS) - fightersList.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/5 rounded border border-white/5 opacity-20" />
            ))}
          </div>
        </div>

        {/* RIGHT: Active Character Portrait */}
        <div className="lg:col-span-3 relative h-full flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeFighter ? activeFighter.id : 'empty'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full rounded-xl overflow-hidden border-2 border-white/10 relative bg-gradient-to-b from-transparent to-black"
            >
              {activeFighter ? (
                <>
                  <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-10" />
                  <img 
                    src={activeFighter.imageUrl} 
                    alt={activeFighter.name}
                    className="w-full h-full object-cover object-top opacity-80"
                  />
                  
                  {/* Stats Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                     <h2 className="text-4xl font-display text-white uppercase italic text-shadow-neon mb-2">
                       {activeFighter.name}
                     </h2>
                     <p className="text-sm font-body text-gray-300 border-l-2 border-primary pl-3">
                       {activeFighter.description || "No description available."}
                     </p>

                     {selection && selection.index === fightersList.indexOf(activeFighter) && (
                       <motion.div 
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         className="mt-4 bg-accent text-black font-arcade text-xs p-2 text-center rounded animate-pulse"
                       >
                         LOCKED IN BY {selection.user.toUpperCase()}
                       </motion.div>
                     )}
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground font-arcade text-xs text-center p-4">
                  ROSTER EMPTY<br/>ADD FIGHTERS VIA CONFIG
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
