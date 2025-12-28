import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Fighter } from "@shared/schema";

interface FighterCardProps {
  fighter: Fighter;
  isActive: boolean;
  isSelected: boolean;
  isP1Active?: boolean;
  isP2Active?: boolean;
  onClick?: () => void;
}

export function FighterCard({ fighter, isActive, isSelected, isP1Active, isP2Active, onClick }: FighterCardProps) {
  return (
    <div className="relative group perspective-500" onClick={onClick}>
      {/* Selection Ring */}
      {(isActive || isP1Active || isP2Active) && (
        <motion.div
          layoutId={isP2Active ? "cursor-p2" : "cursor-p1"}
          className={cn(
            "absolute -inset-1.5 border-3 shadow-[0_0_15px_theme(colors.primary.DEFAULT)] z-20 rounded pointer-events-none",
            isP2Active ? "border-secondary shadow-[0_0_15px_theme(colors.secondary.DEFAULT)]" : "border-primary"
          )}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className={cn(
            "absolute top-0 left-0 text-[9px] font-arcade px-1.5 py-0.5",
            isP2Active ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
          )}>
            {isP2Active ? "P2" : "P1"}
          </div>
        </motion.div>
      )}

      {/* Selected State (Locked In) */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 bg-accent/20 z-30 pointer-events-none rounded border-3 border-accent"
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="absolute bottom-0 right-0 bg-accent text-accent-foreground text-[9px] font-arcade px-1.5 py-0.5">
            LOCKED
          </div>
        </motion.div>
      )}

      {/* Card Content */}
      <div 
        className={cn(
          "relative h-24 w-full overflow-hidden rounded border-2 transition-all duration-200 bg-card",
          isActive ? "border-primary scale-110 z-10" : isP2Active ? "border-secondary scale-110 z-10" : "border-border opacity-70 grayscale hover:grayscale-0"
        )}
      >
        <img 
          src={fighter.imageUrl || "https://images.unsplash.com/photo-1635515243457-32c954203641?q=80&w=800&auto=format&fit=crop"} 
          alt={fighter.name}
          className="h-full w-full object-cover"
        />
        
        {/* Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/85 p-0.5 border-t border-white/10">
          <p className={cn(
            "text-center text-[10px] font-bold uppercase truncate font-display tracking-tight",
            isActive ? "text-primary text-shadow-neon" : isP2Active ? "text-secondary text-shadow-cyan" : "text-muted-foreground"
          )}>
            {fighter.name}
          </p>
        </div>
      </div>
    </div>
  );
}
